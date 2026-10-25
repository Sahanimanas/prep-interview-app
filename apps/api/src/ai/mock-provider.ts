/**
 * Deterministic fake AI used when AI_MOCK=true (local development, CI, E2E tests) or when the
 * context key is 'mock'. Never touches the network. Output is derived from the inputs, built in the
 * same raw shape the real model returns and passed through the same normalisers, so it always
 * satisfies the contract.
 */
import type { ClarifyingQuestion, Difficulty, InterviewType, MockScorecard, QuestionKind } from '@preppilot/shared';
import { INTERVIEW_TYPE_LABELS, MOCK_TYPE_LABELS } from '@preppilot/shared';
import { env } from '../config/env';
import { AppError } from '../lib/errors';
import {
  normalizeDoc,
  normalizeEvaluation,
  normalizeIntakeQuestions,
  normalizePlan,
  normalizeQuestions,
  normalizeQuiz,
  normalizeScorecard,
  verdictForScore,
} from './normalize';
import { answeredCount, basicsToProfile } from './prompts';
import type { IntakeQuestionsOutput, PlanOutput, QuestionsOutput, QuizOutput } from './schemas';
import type { AiContext, AiService, CandidateProfile, MockSetup, TopicRef, TranscriptEntry } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

async function simulateLatency(ctx: AiContext, seed: string): Promise<void> {
  ctx.signal?.throwIfAborted();
  if (env.NODE_ENV === 'test') return;
  const ms = 300 + (hash(seed) % 500);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    ctx.signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(ctx.signal?.reason ?? new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

const pick = <T>(items: readonly T[], i: number): T => items[((i % items.length) + items.length) % items.length]!;

interface TopicTemplate {
  title: string;
  subtopics: string[];
}

const t = (title: string, ...subtopics: string[]): TopicTemplate => ({ title, subtopics });

const BANKS: { match: RegExp; language: string; topics: TopicTemplate[] }[] = [
  {
    match: /react|next\.?js|frontend/i,
    language: 'tsx',
    topics: [
      t('Rendering & reconciliation', 'Virtual DOM diffing', 'Keys in lists', 'Render vs commit phase'),
      t('Hooks rules & useEffect lifecycle', 'Dependency arrays', 'Cleanup functions', 'Stale closures'),
      t('Memoisation with useMemo, useCallback & memo', 'Referential equality', 'When memoisation hurts'),
      t('State management: context vs external stores', 'Prop drilling', 'Context re-renders', 'Zustand/Redux'),
      t('Component composition patterns', 'Children & render props', 'Compound components', 'Custom hooks'),
      t('Data fetching, caching & Suspense', 'Race conditions', 'Query caching', 'Suspense boundaries'),
      t('Forms & controlled inputs', 'Controlled vs uncontrolled', 'Validation', 'Form libraries'),
      t('Performance profiling in React', 'React Profiler', 'Code splitting', 'List virtualisation'),
      t('Server components & SSR', 'Hydration', 'Streaming SSR', 'Server vs client boundaries'),
      t('Testing with React Testing Library', 'Queries by role', 'Mocking network calls', 'User events'),
      t('Error boundaries & resilience', 'Fallback UI', 'Error reporting'),
      t('Accessibility in React apps', 'Semantic HTML', 'Focus management', 'ARIA attributes'),
    ],
  },
  {
    match: /node|express|nest|javascript|typescript|\bjs\b|\bts\b/i,
    language: 'javascript',
    topics: [
      t('Event loop phases & microtasks', 'Timers vs setImmediate', 'process.nextTick', 'Promise jobs'),
      t('Promises, async/await & error handling', 'Promise.all vs allSettled', 'Unhandled rejections'),
      t('Streams & backpressure', 'Readable/Writable', 'pipeline()', 'highWaterMark'),
      t('Modules: ESM vs CommonJS', 'Module resolution', 'Interop pitfalls', 'Top-level await'),
      t('HTTP servers & middleware design', 'Request lifecycle', 'Error middleware', 'Graceful shutdown'),
      t('Worker threads & clustering', 'CPU-bound work', 'Cluster module', 'SharedArrayBuffer'),
      t('Memory leaks & heap profiling', 'Closures holding references', 'Heap snapshots', 'GC basics'),
      t('Authentication with JWT & sessions', 'Token expiry & refresh', 'Cookie security', 'Password hashing'),
      t('Database access & connection pooling', 'Pool sizing', 'Transactions', 'N+1 queries'),
      t('Caching strategies with Redis', 'Cache-aside', 'TTL & invalidation', 'Stampede protection'),
      t('Testing Node services', 'Unit vs integration tests', 'Mocking I/O', 'Test isolation'),
      t('Securing Node APIs (OWASP Top 10)', 'Injection', 'Rate limiting', 'Input validation'),
    ],
  },
  {
    match: /python|django|flask|fastapi/i,
    language: 'python',
    topics: [
      t('Python data model & dunder methods', '__repr__ vs __str__', '__eq__ & __hash__', 'Iteration protocol'),
      t('Generators & iterators', 'yield & yield from', 'Lazy evaluation', 'itertools'),
      t('Decorators & context managers', 'functools.wraps', 'contextlib', 'Resource cleanup'),
      t('The GIL, threads & multiprocessing', 'I/O vs CPU-bound', 'concurrent.futures', 'Process pools'),
      t('asyncio fundamentals', 'Event loop', 'Tasks & gather', 'Cancellation'),
      t('Type hints & dataclasses', 'Protocols', 'Generics', 'dataclass options'),
      t('Memory management & garbage collection', 'Reference counting', 'Cycles', '__slots__'),
      t('Web APIs with FastAPI & Django', 'Dependency injection', 'ORM pitfalls', 'Validation'),
      t('Testing with pytest', 'Fixtures', 'Parametrisation', 'Mocking'),
      t('Profiling & performance tuning', 'cProfile', 'Algorithmic complexity', 'Vectorisation'),
      t('Core data structures & complexity', 'dict internals', 'list vs deque', 'heapq'),
      t('Packaging & dependency management', 'Virtual environments', 'pyproject.toml', 'Lock files'),
    ],
  },
  {
    match: /java\b|spring|kotlin|jvm/i,
    language: 'java',
    topics: [
      t('JVM memory model & garbage collection', 'Heap generations', 'G1 vs ZGC', 'GC tuning'),
      t('Collections internals: HashMap & ConcurrentHashMap', 'Hashing & buckets', 'Resizing', 'Thread safety'),
      t('Concurrency: executors & CompletableFuture', 'Thread pools', 'Happens-before', 'Locks vs atomics'),
      t('Streams & functional interfaces', 'Lazy pipelines', 'Collectors', 'Parallel streams'),
      t('Generics & type erasure', 'Wildcards', 'PECS', 'Bridge methods'),
      t('Spring Boot dependency injection', 'Bean scopes', 'Auto-configuration', 'Profiles'),
      t('JPA/Hibernate pitfalls', 'Lazy loading', 'N+1 queries', 'Transactions'),
      t('Modern Java: records, sealed classes & pattern matching', 'Records', 'Sealed hierarchies', 'Switch patterns'),
      t('Exception handling design', 'Checked vs unchecked', 'Error translation', 'try-with-resources'),
      t('Testing with JUnit & Mockito', 'Test slices', 'Mocks vs fakes', 'Testcontainers'),
      t('REST API design with Spring', 'Validation', 'Error responses', 'Versioning'),
      t('Performance profiling on the JVM', 'JFR', 'Allocation profiling', 'JIT warm-up'),
    ],
  },
  {
    match: /\bgo\b|golang/i,
    language: 'go',
    topics: [
      t('Goroutines & the Go scheduler', 'M:N scheduling', 'GOMAXPROCS', 'Goroutine leaks'),
      t('Channels & select patterns', 'Buffered vs unbuffered', 'Fan-in/fan-out', 'Closing channels'),
      t('context.Context & cancellation', 'Deadlines', 'Propagation', 'Values in context'),
      t('Interfaces & composition', 'Implicit implementation', 'Embedding', 'Small interfaces'),
      t('Error handling & wrapping', 'errors.Is/As', 'Sentinel errors', 'Panics'),
      t('Slices, maps & memory layout', 'Slice headers', 'Capacity growth', 'Map iteration'),
      t('sync primitives: Mutex, WaitGroup & Once', 'RWMutex', 'Race detector', 'atomic'),
      t('Building HTTP services in Go', 'net/http', 'Middleware', 'Graceful shutdown'),
      t('Testing & benchmarking in Go', 'Table-driven tests', 'Benchmarks', 'Fuzzing'),
      t('Generics in Go', 'Type parameters', 'Constraints', 'When not to use them'),
      t('Profiling with pprof', 'CPU profiles', 'Heap profiles', 'Escape analysis'),
      t('Go modules & project layout', 'go.mod', 'Versioning', 'Internal packages'),
    ],
  },
];

const GENERIC_TOPICS = (tech: string): TopicTemplate[] => [
  t(`${tech}: core language fundamentals`, 'Syntax & semantics', 'Type system', 'Idioms'),
  t(`${tech}: data structures & complexity`, 'Built-in collections', 'Big-O trade-offs'),
  t(`${tech}: concurrency & async patterns`, 'Threads vs async', 'Synchronisation', 'Common races'),
  t(`${tech}: error handling strategies`, 'Exceptions vs results', 'Retries', 'Logging'),
  t(`${tech}: testing & debugging`, 'Unit tests', 'Debugger workflow', 'Mocks'),
  t(`${tech}: API & interface design`, 'Contracts', 'Versioning', 'Backward compatibility'),
  t(`${tech}: data storage & modelling`, 'Schemas', 'Indexes', 'Transactions'),
  t(`${tech}: performance & profiling`, 'Profilers', 'Hot paths', 'Caching'),
  t(`${tech}: security fundamentals`, 'Input validation', 'AuthN/AuthZ', 'Secrets'),
  t(`${tech}: tooling & build pipeline`, 'Package management', 'CI', 'Linting'),
  t(`${tech}: architecture & code organisation`, 'Layering', 'Dependency boundaries', 'Refactoring'),
  t(`${tech}: production troubleshooting`, 'Observability', 'Incident debugging', 'Postmortems'),
];

const EXTRA_TOPICS: Partial<Record<InterviewType, TopicTemplate[]>> = {
  system_design: [
    t('System design framework & requirements gathering', 'Functional vs non-functional', 'Estimations', 'API sketch'),
    t('Scaling reads: caching, replication & CDNs', 'Cache invalidation', 'Read replicas', 'Consistency'),
    t('Async processing with message queues', 'At-least-once delivery', 'Idempotency', 'Dead-letter queues'),
  ],
  behavioral: [t('STAR stories: ownership, conflict & failure', 'Story bank', 'Quantifying impact', 'Reflection')],
  coding: [t('Coding patterns: two pointers, hashing & sliding window', 'Pattern recognition', 'Edge cases', 'Complexity')],
};

function bankFor(profile: Pick<CandidateProfile, 'technology' | 'interviewTypes'>): {
  language: string;
  topics: TopicTemplate[];
} {
  const bank = BANKS.find((b) => b.match.test(profile.technology));
  const base = bank?.topics ?? GENERIC_TOPICS(profile.technology.trim() || 'Your stack');
  const extras = profile.interviewTypes.flatMap((type) => EXTRA_TOPICS[type] ?? []);
  // Interleave extras so they show up early in short plans too.
  const topics: TopicTemplate[] = [];
  base.forEach((topic, i) => {
    topics.push(topic);
    const extra = extras[i];
    if (extra && i % 2 === 1) topics.push(extra);
  });
  for (const extra of extras) if (!topics.includes(extra)) topics.push(extra);
  return { language: bank?.language ?? 'text', topics };
}

const CODE_SAMPLES: Record<string, string> = {
  tsx: `import { useEffect, useState } from 'react';

export function useDebounced<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id); // cleanup prevents stale updates
  }, [value, delayMs]);
  return debounced;
}`,
  javascript: `setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
Promise.resolve().then(() => console.log('microtask'));
process.nextTick(() => console.log('nextTick'));
console.log('sync');
// sync -> nextTick -> microtask -> timeout/immediate (order of the last two depends on context)`,
  python: `from contextlib import contextmanager
import time

@contextmanager
def timed(label: str):
    start = time.perf_counter()
    try:
        yield
    finally:
        print(f"{label}: {time.perf_counter() - start:.3f}s")

with timed("sum"):
    total = sum(x * x for x in range(1_000_000))`,
  java: `import java.util.concurrent.*;

public class Demo {
    public static void main(String[] args) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(4);
        CompletableFuture<Integer> f = CompletableFuture
            .supplyAsync(() -> 21, pool)
            .thenApply(x -> x * 2);
        System.out.println(f.get()); // 42
        pool.shutdown();
    }
}`,
  go: `func worker(ctx context.Context, jobs <-chan int, results chan<- int) {
	for {
		select {
		case <-ctx.Done():
			return
		case j, ok := <-jobs:
			if !ok {
				return
			}
			results <- j * 2
		}
	}
}`,
  text: `function retry(operation, attempts):
    for i in 1..attempts:
        try:
            return operation()
        catch TransientError:
            sleep(2^i * 100ms)   # exponential backoff
    raise LastError`,
};

const KIND_BY_TYPE: Record<InterviewType, QuestionKind> = {
  technical_concepts: 'conceptual',
  coding: 'coding',
  system_design: 'system_design',
  behavioral: 'behavioral',
  debugging: 'scenario',
  take_home: 'coding',
};

/** Keeps the 8 mock questions distinct even when kinds and subtopics repeat. */
const QUESTION_ANGLES = [
  '',
  ' Keep it practical.',
  ' Include at least one edge case.',
  ' Assume a high-traffic production system.',
  ' How would you explain it to a junior engineer?',
  ' What would you monitor in production?',
  ' Compare it with an alternative approach.',
  ' What would you do differently at 10x scale?',
];

const difficultyAt =(i: number, total: number): Difficulty =>
  i < total / 3 ? 'easy' : i < (2 * total) / 3 ? 'medium' : 'hard';

function mockQuestionText(profile: CandidateProfile, setup: MockSetup, n: number): string {
  const bank = bankFor(profile).topics;
  const topic = setup.topics.length ? pick(setup.topics, n - 1).title : pick(bank, n - 1).title;
  const tech = profile.technology;
  const technical = [
    `Can you explain how **${topic}** works under the hood, and when it matters in a production ${tech} system?`,
    `Walk me through how you would debug a performance problem related to **${topic}**.`,
    `What trade-offs do you weigh when applying **${topic}** in a real ${tech} codebase? Give a concrete example.`,
    `A teammate's code misuses **${topic}** and causes an intermittent bug. How would you find and fix it?`,
  ];
  const behavioral = [
    'Tell me about a time you disagreed with a technical decision. What did you do, and what was the outcome?',
    'Describe a project where you took ownership beyond your role. What impact did it have?',
    'Tell me about a failure or mistake in production. How did you handle it and what changed afterwards?',
    'Describe a situation where requirements were ambiguous. How did you move forward?',
  ];
  const design = [
    `Design a URL-shortening service that handles 10k writes and 1M reads per second. Where would **${topic}** come into play?`,
    'Design a notification system that sends email, SMS and push messages reliably. Start with the requirements.',
    `Design a rate limiter for a public ${tech} API. How would it work across multiple instances?`,
    'Design a news feed for a social app. How do you balance freshness, latency and cost?',
  ];
  const label = `**Question ${n} of ${setup.questionCount}**`;
  const source =
    setup.type === 'technical'
      ? technical
      : setup.type === 'behavioral'
        ? behavioral
        : setup.type === 'system_design'
          ? design
          : pick([technical, design, behavioral], n - 1);
  return `${label}\n\n${pick(source, Math.floor((n - 1) / (setup.type === 'mixed' ? 3 : 1)))}`;
}

function lastCandidateAnswer(transcript: TranscriptEntry[]): string {
  for (let i = transcript.length - 1; i >= 0; i--) {
    const entry = transcript[i]!;
    if (entry.role === 'candidate') return entry.content;
  }
  return '';
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const mockAi: AiService = {
  async generateIntakeQuestions(ctx, basics): Promise<ClarifyingQuestion[]> {
    await simulateLatency(ctx, `intake:${basics.technology}`);
    const profile = basicsToProfile(basics);
    const bank = bankFor(profile).topics;
    const tech = profile.technology;
    const questions: IntakeQuestionsOutput['questions'] = [
      {
        question: `Which part of the ${tech} ecosystem do you expect the interview to focus on most?`,
        type: 'single',
        options: ['Core language & runtime', 'Frameworks & libraries', 'Testing & tooling', 'Performance & scalability', 'Not sure'],
        helperText: 'Pick the closest match; we will still cover the basics.',
      },
      {
        question: 'Which of these areas do you feel least confident about?',
        type: 'multi' as const,
        options: bank.slice(0, 6).map((topic) => topic.title),
        helperText: 'Select all that apply.',
      },
      {
        question: 'Which stage of the hiring process is this interview?',
        type: 'single' as const,
        options: ['Recruiter / phone screen', 'First technical round', 'Onsite / final loop', 'Not sure yet'],
        helperText: '',
      },
      profile.interviewTypes.includes('system_design')
        ? {
            question: 'How deep do you expect the system design discussion to go?',
            type: 'single' as const,
            options: ['High-level architecture only', 'Component-level trade-offs', 'Deep dive incl. data modelling & scaling'],
            helperText: '',
          }
        : {
            question: 'How much hands-on coding do you expect in the interview?',
            type: 'single' as const,
            options: ['None - discussion only', 'Small snippets', 'A full live-coding exercise', 'A take-home assignment'],
            helperText: '',
          },
    ];
    if (profile.company) {
      questions.push({
        question: `Do you know anything specific about ${profile.company}'s interview process?`,
        type: 'text',
        options: [],
        helperText: 'Optional - e.g. number of rounds or topics mentioned by the recruiter.',
      });
    }
    return normalizeIntakeQuestions({ questions });
  },

  async generatePlan(ctx, profile) {
    await simulateLatency(ctx, `plan:${profile.technology}:${profile.totalDays}`);
    const bank = bankFor(profile).topics;
    const totalDays = Math.max(1, Math.floor(profile.totalDays));
    const minutesPerDay = Math.max(15, Math.round(profile.hoursPerDay * 60));
    const days: PlanOutput['days'] = [];
    let cursor = 0;
    const passLabel = ['', ' - deep dive', ' - practice drills', ' - advanced scenarios'];

    for (let d = 1; d <= totalDays; d++) {
      const phase = (d - 1) / totalDays;
      if (d === totalDays && totalDays > 1) {
        days.push({
          dayNumber: d,
          theme: 'Light revision & mock interview',
          topics: [
            {
              title: 'Revision of weak areas',
              description: 'Re-read your notes and cheat sheets for the topics you rated lowest.',
              subtopics: ['Flashcards', 'Cheat sheets', 'Bookmarked questions'],
              difficulty: 'medium',
              estimatedMinutes: Math.round(minutesPerDay / 2),
            },
            {
              title: `Full mock interview: ${profile.targetRole}`,
              description: 'Run a timed mock interview and review the scorecard.',
              subtopics: ['Timed answers', 'Thinking out loud', 'Scorecard review'],
              difficulty: 'hard',
              estimatedMinutes: Math.round(minutesPerDay / 2),
            },
          ],
        });
        continue;
      }
      const count = minutesPerDay < 60 ? 1 : 1 + (d % 3);
      const topics: PlanOutput['days'][number]['topics'] = [];
      for (let k = 0; k < count; k++) {
        const template = pick(bank, cursor);
        const pass = Math.floor(cursor / bank.length);
        cursor++;
        topics.push({
          title: `${template.title}${pick(passLabel, pass)}`,
          description: `Understand ${template.title.toLowerCase()} well enough to explain it clearly and apply it in a ${profile.targetRole} interview.`,
          subtopics: template.subtopics,
          difficulty: phase < 1 / 3 ? 'easy' : phase < 2 / 3 ? 'medium' : 'hard',
          estimatedMinutes: Math.round(minutesPerDay / count),
        });
      }
      const themePrefix = phase < 1 / 3 ? 'Foundations' : phase < 2 / 3 ? 'Going deeper' : 'Interview readiness';
      days.push({ dayNumber: d, theme: `${themePrefix}: ${topics[0]!.title}`, topics });
    }

    const typeLabels = profile.interviewTypes.map((type) => INTERVIEW_TYPE_LABELS[type].toLowerCase()).join(', ');
    return normalizePlan(
      {
        title: `${profile.targetRole} (${profile.technology}) - ${totalDays}-day plan`,
        summary: `This ${totalDays}-day plan takes you from fundamentals to interview-ready ${profile.technology} skills at about ${profile.hoursPerDay} hour(s) a day.\n\n- **Weeks start with foundations**, then move to advanced topics and finish with mock interviews.\n- Practice is weighted toward your expected rounds: ${typeLabels || 'general technical questions'}.${
          profile.company ? `\n- Examples are framed around the kind of problems ${profile.company} works on.` : ''
        }`,
        tips: [
          'Explain each topic out loud as if to an interviewer before marking it complete.',
          'Write small code examples from memory rather than re-reading them.',
          'Keep a running list of questions you could not answer and revisit it every few days.',
          'Time-box practice answers to 3-5 minutes to build concise delivery.',
          'Do at least one mock interview in the final days and act on the scorecard.',
        ],
        days,
      },
      totalDays,
      `${profile.technology} ${totalDays}-day plan`,
    );
  },

  async generateLearningDoc(ctx, profile, topic) {
    await simulateLatency(ctx, `doc:${topic.title}`);
    const { language } = bankFor(profile);
    const code = CODE_SAMPLES[language] ?? CODE_SAMPLES.text!;
    const subs = topic.subtopics.length ? topic.subtopics : ['Fundamentals', 'Trade-offs', 'Real-world usage'];
    const contentMd = `## Overview

**${topic.title}** comes up regularly in ${profile.targetRole} interviews because it shows whether you understand how ${profile.technology} behaves in real systems, not just its syntax. ${topic.description}

## Core concepts

${subs.map((s) => `### ${s}\n\nKnow what ${s.toLowerCase()} is, why it exists, and the trade-offs it introduces. Be ready to give a concrete example from your own work.`).join('\n\n')}

## Code example

\`\`\`${language}
${code}
\`\`\`

Walk through this example line by line and predict its behaviour before running it.

## Common pitfalls

- Memorising definitions without being able to apply them to a concrete scenario.
- Ignoring edge cases such as empty inputs, failures and concurrency.
- Over-engineering a solution when a simpler approach answers the question.

## How interviewers probe this topic

Expect an opening conceptual question, followed by "why?" and "what would happen if...?" follow-ups. Strong candidates connect the concept to production trade-offs and mention how they would test or monitor it.

## Quick-revision cheat sheet

${subs.map((s) => `- **${s}**: definition, one example, one trade-off`).join('\n')}
- Always state assumptions and complexity out loud.`;
    return normalizeDoc({
      contentMd,
      keyTakeaways: [
        `Be able to explain ${topic.title.toLowerCase()} in two sentences.`,
        ...subs.slice(0, 4).map((s) => `Know a concrete example and a trade-off for ${s.toLowerCase()}.`),
        'Tie every answer back to production impact.',
      ],
    });
  },

  async generateQuestions(ctx, profile, topic) {
    await simulateLatency(ctx, `questions:${topic.title}`);
    const kinds = profile.interviewTypes.length ? profile.interviewTypes.map((type) => KIND_BY_TYPE[type]) : ['conceptual' as const];
    const subs = topic.subtopics.length ? topic.subtopics : [topic.title];
    const total = 8;
    const questions: QuestionsOutput['questions'] = Array.from({ length: total }, (_, i) => {
      const kind = pick(kinds, i);
      const sub = pick(subs, i);
      const base =
        kind === 'coding'
          ? `Write a small ${profile.technology} function that demonstrates ${sub.toLowerCase()} (${topic.title}). What is its complexity?`
          : kind === 'behavioral'
            ? `Tell me about a time you had to deal with ${sub.toLowerCase()} in a real project.`
            : kind === 'system_design'
              ? `How would ${sub.toLowerCase()} influence the design of a high-traffic service built with ${profile.technology}?`
              : kind === 'scenario'
                ? `A production issue is caused by ${sub.toLowerCase()}. How do you diagnose and fix it?`
                : `Explain ${sub.toLowerCase()} in the context of ${topic.title}. Why does it matter?`;
      const question = `${base}${QUESTION_ANGLES[i % QUESTION_ANGLES.length]}`;
      return {
        question,
        answerMd: `A strong answer:\n\n1. **Define** ${sub.toLowerCase()} precisely.\n2. **Explain why** it matters for ${topic.title.toLowerCase()}.\n3. **Give an example** from a real ${profile.technology} codebase.\n4. **Discuss trade-offs** and how you would test or monitor it.`,
        difficulty: difficultyAt(i, total),
        kind,
        followUps: [`What are the trade-offs of that approach?`, `How would you test it?`],
      };
    });
    return normalizeQuestions({ questions });
  },

  async generateQuiz(ctx, profile, topics, questionCount) {
    await simulateLatency(ctx, `quiz:${topics.map((x) => x.title).join('|')}`);
    const source: TopicRef[] = topics.length
      ? topics
      : [{ title: profile.technology, description: '', subtopics: [], difficulty: 'medium' }];
    const count = Math.max(1, Math.floor(questionCount));
    const questions: QuizOutput['questions'] = Array.from({ length: count }, (_, i) => {
      const topic = pick(source, i);
      const sub = topic.subtopics.length ? pick(topic.subtopics, Math.floor(i / source.length)) : topic.title;
      const correct = `Understanding ${sub.toLowerCase()} helps you reason about correctness and performance in ${topic.title}.`;
      const distractors = [
        `${sub} only matters in legacy codebases and is rarely asked about.`,
        `${sub} is handled automatically, so it never needs to be understood.`,
        `${sub} has no measurable effect on correctness or performance.`,
      ];
      const correctIndex = (i * 3 + 1) % 4;
      const options = [...distractors];
      options.splice(correctIndex, 0, correct);
      return {
        prompt: `(${i + 1}) Which statement about ${sub.toLowerCase()} in ${topic.title} is correct?`,
        options,
        correctIndex,
        explanation: `${sub} directly affects how ${topic.title.toLowerCase()} behaves; the other options dismiss it, which is a common misconception.`,
      };
    });
    const title = source.length === 1 ? `${source[0]!.title} quiz` : `Revision quiz: ${source.slice(0, 3).map((x) => x.title).join(', ')}${source.length > 3 ? ' & more' : ''}`;
    return normalizeQuiz({ title, questions }, count, title);
  },

  async startMockInterview(ctx, profile, setup) {
    await simulateLatency(ctx, `mock-start:${setup.type}`);
    const intro = `Hi, thanks for joining! I'll be your interviewer today for a ${MOCK_TYPE_LABELS[setup.type].toLowerCase()} session focused on ${profile.technology} for the ${profile.targetRole} role. We'll go through ${setup.questionCount} questions - take your time and think out loud.`;
    return { message: `${intro}\n\n${mockQuestionText(profile, setup, 1)}` };
  },

  async evaluateMockAnswer(ctx, profile, setup, transcript, isLast) {
    await simulateLatency(ctx, `mock-eval:${transcript.length}`);
    const answer = lastCandidateAnswer(transcript).trim();
    const words = answer ? answer.split(/\s+/).length : 0;
    const score = words < 5 ? 1 : Math.min(9, Math.round(2 + words / 12));
    const comment =
      score >= 7
        ? 'Solid, well-structured answer with good depth. To make it outstanding, add a concrete production example and mention the main trade-off explicitly.'
        : score >= 4
          ? 'You covered the basics, but the answer lacked depth. Explain the underlying mechanism and back it up with a concrete example from your experience.'
          : 'The answer was too brief to demonstrate understanding. Structure it as definition, mechanism, example and trade-offs, and think out loud.';
    const k = answeredCount(transcript);
    const nextMessage = isLast
      ? "That's all the questions I have - thanks, that was a good conversation. I'll put together your scorecard now."
      : `Thanks for that. Let's move on.\n\n${mockQuestionText(profile, setup, k + 1)}`;
    return normalizeEvaluation(
      {
        score,
        comment,
        idealAnswer: `A strong answer would:\n\n- State the core idea precisely.\n- Explain how it works in ${profile.technology}, with a short example.\n- Discuss trade-offs, failure modes and how to test or monitor it.`,
        nextMessage,
      },
      isLast,
    );
  },

  async generateMockScorecard(ctx, profile, setup, transcript): Promise<MockScorecard> {
    await simulateLatency(ctx, `mock-scorecard:${transcript.length}`);
    const scores = transcript.flatMap((e) => (e.role === 'candidate' && e.feedback ? [e.feedback.score] : []));
    const overallScore = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) : 0;
    const verdict = verdictForScore(overallScore);
    const topicTitles = setup.topics.length ? setup.topics.map((x) => x.title) : bankFor(profile).topics.map((x) => x.title);
    return normalizeScorecard({
      overallScore,
      verdict,
      summary: `You answered ${scores.length} of ${setup.questionCount} questions with an average score of ${
        scores.length ? (overallScore / 10).toFixed(1) : '0'
      }/10. ${overallScore >= 70 ? 'Overall a convincing performance for this level.' : 'With focused practice on the areas below you can raise your score noticeably.'}`,
      strengths: ['Clear communication and willingness to think out loud', `Familiarity with core ${profile.technology} concepts`],
      improvements: [
        'Back up answers with concrete examples from production work',
        'State trade-offs and edge cases explicitly',
        'Structure longer answers (definition, mechanism, example, trade-offs)',
      ],
      recommendedTopics: topicTitles.slice(0, 3),
    });
  },

  async validateApiKey(apiKey) {
    if (!apiKey.startsWith('sk-ant-')) {
      throw new AppError(400, 'AI_KEY_INVALID', 'Anthropic rejected this API key');
    }
  },
};
