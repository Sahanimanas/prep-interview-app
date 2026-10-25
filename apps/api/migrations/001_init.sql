-- PrepPilot initial schema
CREATE EXTENSION IF NOT EXISTS citext;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------- users & auth

CREATE TABLE users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email             citext NOT NULL UNIQUE,
  name              text NOT NULL,
  password_hash     text NOT NULL,
  encrypted_api_key text,
  api_key_hint      text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Opaque refresh tokens (only the SHA-256 hash is stored). Rotated on every use;
-- tokens issued from the same login share a family so reuse of a rotated token revokes the family.
CREATE TABLE refresh_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id   uuid NOT NULL,
  token_hash  text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  revoked_at  timestamptz,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX refresh_tokens_user_idx ON refresh_tokens(user_id);
CREATE INDEX refresh_tokens_family_idx ON refresh_tokens(family_id);

-- ---------------------------------------------------------------- plans

CREATE TABLE plans (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title               text NOT NULL,
  technology          text NOT NULL,
  target_role         text NOT NULL,
  years_of_experience numeric(4,1) NOT NULL,
  hours_per_day       numeric(4,1) NOT NULL,
  current_level       text NOT NULL CHECK (current_level IN ('beginner','intermediate','advanced')),
  interview_types     text[] NOT NULL,
  company             text,
  focus_areas         text[] NOT NULL DEFAULT '{}',
  notes               text,
  clarifying_answers  jsonb NOT NULL DEFAULT '[]',
  start_date          date NOT NULL,
  interview_date      date NOT NULL,
  total_days          int NOT NULL CHECK (total_days BETWEEN 1 AND 90),
  status              text NOT NULL DEFAULT 'generating' CHECK (status IN ('generating','ready','failed')),
  summary             text,
  tips                jsonb NOT NULL DEFAULT '[]',
  error               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX plans_user_idx ON plans(user_id, created_at DESC);
CREATE TRIGGER plans_updated_at BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE plan_days (
  plan_id     uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  day_number  int NOT NULL,
  theme       text NOT NULL,
  PRIMARY KEY (plan_id, day_number)
);

CREATE TABLE topics (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id           uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  day_number        int NOT NULL,
  order_index       int NOT NULL,
  title             text NOT NULL,
  description       text NOT NULL,
  subtopics         jsonb NOT NULL DEFAULT '[]',
  difficulty        text NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  estimated_minutes int NOT NULL,
  status            text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  completed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX topics_plan_idx ON topics(plan_id, day_number, order_index);
CREATE TRIGGER topics_updated_at BEFORE UPDATE ON topics FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------- learning content

CREATE TABLE learning_docs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id       uuid NOT NULL UNIQUE REFERENCES topics(id) ON DELETE CASCADE,
  content_md     text NOT NULL,
  key_takeaways  jsonb NOT NULL DEFAULT '[]',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE questions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id     uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  order_index  int NOT NULL,
  question     text NOT NULL,
  answer_md    text NOT NULL,
  difficulty   text NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  kind         text NOT NULL CHECK (kind IN ('conceptual','coding','scenario','behavioral','system_design')),
  follow_ups   jsonb NOT NULL DEFAULT '[]',
  bookmarked   boolean NOT NULL DEFAULT false,
  confidence   smallint CHECK (confidence BETWEEN 1 AND 5),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX questions_topic_idx ON questions(topic_id, order_index);

-- ---------------------------------------------------------------- quizzes

CREATE TABLE quizzes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  topic_id    uuid REFERENCES topics(id) ON DELETE CASCADE,
  title       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
-- One quiz per topic (regenerating replaces it); revision quizzes have no topic.
CREATE UNIQUE INDEX quizzes_topic_unique ON quizzes(topic_id) WHERE topic_id IS NOT NULL;
CREATE INDEX quizzes_plan_idx ON quizzes(plan_id, created_at DESC);

CREATE TABLE quiz_questions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id        uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  order_index    int NOT NULL,
  prompt         text NOT NULL,
  options        jsonb NOT NULL,
  correct_index  int NOT NULL,
  explanation    text NOT NULL
);
CREATE INDEX quiz_questions_quiz_idx ON quiz_questions(quiz_id, order_index);

CREATE TABLE quiz_attempts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id     uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers     jsonb NOT NULL,
  score       int NOT NULL,
  total       int NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quiz_attempts_quiz_idx ON quiz_attempts(quiz_id, created_at DESC);

-- ---------------------------------------------------------------- mock interviews

CREATE TABLE mock_interviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id         uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  type            text NOT NULL CHECK (type IN ('technical','behavioral','system_design','mixed')),
  topic_titles    jsonb NOT NULL DEFAULT '[]',
  setup           jsonb NOT NULL,
  question_count  int NOT NULL,
  answered_count  int NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed')),
  scorecard       jsonb,
  overall_score   int,
  created_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz
);
CREATE INDEX mock_interviews_plan_idx ON mock_interviews(plan_id, created_at DESC);

CREATE TABLE mock_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_id     uuid NOT NULL REFERENCES mock_interviews(id) ON DELETE CASCADE,
  seq         int NOT NULL,
  role        text NOT NULL CHECK (role IN ('interviewer','candidate')),
  content     text NOT NULL,
  feedback    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mock_id, seq)
);

-- ---------------------------------------------------------------- background jobs

CREATE TABLE jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id       uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  topic_id      uuid REFERENCES topics(id) ON DELETE CASCADE,
  kind          text NOT NULL CHECK (kind IN ('plan','doc','questions','quiz')),
  status        text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','succeeded','failed')),
  payload       jsonb NOT NULL DEFAULT '{}',
  result_id     uuid,
  error         text,
  attempts      int NOT NULL DEFAULT 0,
  max_attempts  int NOT NULL DEFAULT 3,
  run_after     timestamptz NOT NULL DEFAULT now(),
  locked_until  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX jobs_queued_idx ON jobs(run_after) WHERE status = 'queued';
CREATE INDEX jobs_running_idx ON jobs(locked_until) WHERE status = 'running';
CREATE INDEX jobs_plan_idx ON jobs(plan_id, kind, created_at DESC);
CREATE INDEX jobs_topic_idx ON jobs(topic_id, kind, created_at DESC) WHERE topic_id IS NOT NULL;
-- At most one active job per (topic, kind): makes "generate" requests idempotent.
CREATE UNIQUE INDEX jobs_active_topic_kind ON jobs(topic_id, kind)
  WHERE topic_id IS NOT NULL AND status IN ('queued','running');
CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
