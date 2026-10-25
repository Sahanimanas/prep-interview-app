/**
 * End-to-end API tests against a real Postgres (DATABASE_URL) with the deterministic mock AI.
 * Run migrations first: `npm run db:migrate`.
 */
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AuthResponse, Job, MockDetail, PlanDetail, QuizDetail, TopicDetail } from '@preppilot/shared';
import { createApp } from '../src/app';
import { pool } from '../src/db/pool';
import { JobWorker } from '../src/jobs/worker';

const app = createApp();
const worker = new JobWorker(2);
const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `candidate-${unique}@example.com`;
const password = 'correct-horse-battery';

let token = '';
let refreshToken = '';
let planId = '';

const auth = () => ({ Authorization: `Bearer ${token}` });

async function waitFor<T>(fn: () => Promise<T>, done: (v: T) => boolean, timeoutMs = 20_000): Promise<T> {
  const started = Date.now();
  for (;;) {
    const value = await fn();
    if (done(value)) return value;
    if (Date.now() - started > timeoutMs) throw new Error('Timed out waiting for condition');
    await new Promise((r) => setTimeout(r, 150));
  }
}

const getPlan = async () => (await request(app).get(`/api/v1/plans/${planId}`).set(auth())).body as PlanDetail;
const getTopic = async (id: string) => (await request(app).get(`/api/v1/topics/${id}`).set(auth())).body as TopicDetail;

beforeAll(async () => {
  await worker.start();
});

afterAll(async () => {
  await pool.query('DELETE FROM users WHERE email LIKE $1', [`%-${unique}@example.com`]);
  await worker.stop();
  await pool.end();
});

describe('auth', () => {
  it('registers, rejects duplicates and bad passwords, logs in', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send({ name: 'Ada', email, password });
    expect(reg.status).toBe(201);
    const body = reg.body as AuthResponse;
    expect(body.user.email).toBe(email);
    expect(body.user.aiAvailable).toBe(true);
    expect(body.refreshToken).toBeTruthy();

    const dup = await request(app).post('/api/v1/auth/register').send({ name: 'Ada', email, password });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('CONFLICT');

    const bad = await request(app).post('/api/v1/auth/login').send({ email, password: 'nope-nope' });
    expect(bad.status).toBe(401);

    const invalid = await request(app).post('/api/v1/auth/register').send({ name: '', email: 'x', password: '1' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');

    const login = await request(app).post('/api/v1/auth/login').send({ email: email.toUpperCase(), password });
    expect(login.status).toBe(200);
    token = login.body.accessToken;
    refreshToken = login.body.refreshToken;
  });

  it('rotates refresh tokens and revokes the family on reuse', async () => {
    const first = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(first.status).toBe(200);
    const rotated = first.body.refreshToken as string;
    expect(rotated).not.toBe(refreshToken);

    const reuse = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(reuse.status).toBe(401);
    // Reuse detection revoked the whole family, including the rotated token.
    const afterReuse = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: rotated });
    expect(afterReuse.status).toBe(401);

    const login = await request(app).post('/api/v1/auth/login').send({ email, password });
    token = login.body.accessToken;
    refreshToken = login.body.refreshToken;
  });

  it('uses an httpOnly cookie in cookie mode', async () => {
    const res = await request(app).post('/api/v1/auth/login').set('X-Auth-Mode', 'cookie').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.refreshToken).toBeUndefined();
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/pp_rt=/);
    expect(cookie).toMatch(/HttpOnly/i);
    const refreshed = await request(app)
      .post('/api/v1/auth/refresh')
      .set('X-Auth-Mode', 'cookie')
      .set('Cookie', cookie.split(';')[0]!)
      .send({});
    expect(refreshed.status).toBe(200);
  });

  it('rejects unauthenticated requests', async () => {
    expect((await request(app).get('/api/v1/me')).status).toBe(401);
    expect((await request(app).get('/api/v1/me').set('Authorization', 'Bearer garbage')).status).toBe(401);
  });
});

describe('prep plan lifecycle', () => {
  const basics = {
    technology: 'Node.js',
    targetRole: 'Senior Backend Engineer',
    yearsOfExperience: 5,
    daysUntilInterview: 5,
    hoursPerDay: 2,
    currentLevel: 'intermediate',
    interviewTypes: ['technical_concepts', 'coding', 'system_design'],
    focusAreas: ['event loop', 'streams'],
  };

  it('asks tailored clarifying questions', async () => {
    const res = await request(app).post('/api/v1/intake/questions').set(auth()).send(basics);
    expect(res.status).toBe(200);
    expect(res.body.questions.length).toBeGreaterThanOrEqual(3);
    expect(res.body.questions.length).toBeLessThanOrEqual(5);
  });

  it('generates a plan asynchronously and prefetches day-1 docs', async () => {
    const res = await request(app)
      .post('/api/v1/plans')
      .set(auth())
      .send({ ...basics, clarifyingAnswers: [{ question: 'Which framework?', answer: 'Express' }] });
    expect(res.status).toBe(201);
    const created = res.body as PlanDetail;
    expect(created.plan.status).toBe('generating');
    expect(created.plan.totalDays).toBe(5);
    planId = created.plan.id;

    const ready = await waitFor(getPlan, (p) => p.plan.status === 'ready');
    expect(ready.days).toHaveLength(5);
    expect(ready.stats.totalTopics).toBeGreaterThan(0);
    expect(ready.stats.daysRemaining).toBe(5);

    const firstTopic = ready.days[0]!.topics[0]!;
    const detail = await waitFor(() => getTopic(firstTopic.id), (t) => !!t.doc);
    expect(detail.doc!.contentMd.length).toBeGreaterThan(50);

    const list = await request(app).get('/api/v1/plans').set(auth());
    expect(list.body.some((p: { id: string }) => p.id === planId)).toBe(true);
  });

  it('generates questions, supports bookmarking, and is idempotent', async () => {
    const topic = (await getPlan()).days[1]!.topics[0]!;
    const job = await request(app).post(`/api/v1/topics/${topic.id}/generate`).set(auth()).send({ kind: 'questions' });
    expect(job.status).toBe(202);
    const again = await request(app).post(`/api/v1/topics/${topic.id}/generate`).set(auth()).send({ kind: 'questions' });
    // Either the same active job is returned, or it already finished and content exists.
    expect([202, 409]).toContain(again.status);
    if (again.status === 202) expect(again.body.id).toBe(job.body.id);

    const detail = await waitFor(() => getTopic(topic.id), (t) => t.questions.length > 0);
    const q = detail.questions[0]!;
    const patched = await request(app).patch(`/api/v1/questions/${q.id}`).set(auth()).send({ bookmarked: true, confidence: 4 });
    expect(patched.status).toBe(200);
    expect(patched.body.bookmarked).toBe(true);
    expect(patched.body.confidence).toBe(4);

    const bookmarked = await request(app).get(`/api/v1/plans/${planId}/questions?bookmarked=true`).set(auth());
    expect(bookmarked.body.map((x: { id: string }) => x.id)).toEqual([q.id]);

    const dup = await request(app).post(`/api/v1/topics/${topic.id}/generate`).set(auth()).send({ kind: 'questions' });
    expect(dup.status).toBe(409);
  });

  it('generates a topic quiz and grades attempts server-side', async () => {
    const topic = (await getPlan()).days[0]!.topics[0]!;
    await request(app).post(`/api/v1/topics/${topic.id}/generate`).set(auth()).send({ kind: 'quiz' });
    const detail = await waitFor(() => getTopic(topic.id), (t) => !!t.quiz);
    const quiz = detail.quiz!;
    expect(quiz.questions[0]).not.toHaveProperty('correctIndex');

    const wrongLength = await request(app).post(`/api/v1/quizzes/${quiz.id}/attempts`).set(auth()).send({ answers: [0] });
    expect(wrongLength.status).toBe(400);

    const answers = quiz.questions.map(() => 0);
    const attempt = await request(app).post(`/api/v1/quizzes/${quiz.id}/attempts`).set(auth()).send({ answers });
    expect(attempt.status).toBe(201);
    expect(attempt.body.total).toBe(quiz.questions.length);
    expect(attempt.body.results).toHaveLength(quiz.questions.length);

    const reloaded = (await request(app).get(`/api/v1/quizzes/${quiz.id}`).set(auth())).body as QuizDetail;
    expect(reloaded.attemptCount).toBe(1);
    expect(reloaded.lastAttempt?.id).toBe(attempt.body.id);
  });

  it('creates a revision quiz via a job', async () => {
    const res = await request(app).post(`/api/v1/plans/${planId}/quizzes`).set(auth()).send({ questionCount: 6 });
    expect(res.status).toBe(202);
    const job = await waitFor(
      async () => (await request(app).get(`/api/v1/jobs/${res.body.id}`).set(auth())).body as Job,
      (j) => j.status === 'succeeded' || j.status === 'failed',
    );
    expect(job.status).toBe('succeeded');
    const quiz = (await request(app).get(`/api/v1/quizzes/${job.resultId}`).set(auth())).body as QuizDetail;
    expect(quiz.topicId).toBeNull();
    expect(quiz.questions).toHaveLength(6);
  });

  it('runs a full mock interview and produces a scorecard', async () => {
    const created = await request(app).post(`/api/v1/plans/${planId}/mocks`).set(auth()).send({ type: 'technical', questionCount: 3 });
    expect(created.status).toBe(201);
    let mock = created.body as MockDetail;
    expect(mock.messages).toHaveLength(1);
    expect(mock.messages[0]!.role).toBe('interviewer');

    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post(`/api/v1/mocks/${mock.id}/answer`)
        .set(auth())
        .send({ answer: `Answer ${i + 1}: the event loop processes phases; microtasks run between them.` });
      expect(res.status).toBe(200);
      mock = res.body;
    }
    expect(mock.status).toBe('completed');
    expect(mock.answeredCount).toBe(3);
    expect(mock.messages.filter((m) => m.role === 'candidate').every((m) => m.feedback)).toBe(true);
    expect(mock.scorecard?.overallScore).toBeGreaterThanOrEqual(0);

    const afterDone = await request(app).post(`/api/v1/mocks/${mock.id}/answer`).set(auth()).send({ answer: 'late' });
    expect(afterDone.status).toBe(409);
  });

  it('tracks topic progress in plan stats', async () => {
    const topic = (await getPlan()).days[0]!.topics[0]!;
    const res = await request(app).patch(`/api/v1/topics/${topic.id}`).set(auth()).send({ status: 'completed' });
    expect(res.status).toBe(200);
    const plan = await getPlan();
    expect(plan.stats.completedTopics).toBe(1);
    expect(plan.stats.quizAttempts).toBe(1);
    expect(plan.stats.mocksCompleted).toBe(1);
  });

  it('isolates users from each other', async () => {
    const other = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Eve', email: `eve-${unique}@example.com`, password });
    const res = await request(app).get(`/api/v1/plans/${planId}`).set('Authorization', `Bearer ${other.body.accessToken}`);
    expect(res.status).toBe(404);
    const bad = await request(app).get('/api/v1/plans/not-a-uuid').set(auth());
    expect(bad.status).toBe(400);
  });

  it('deletes a plan', async () => {
    expect((await request(app).delete(`/api/v1/plans/${planId}`).set(auth())).status).toBe(204);
    expect((await request(app).get(`/api/v1/plans/${planId}`).set(auth())).status).toBe(404);
  });
});
