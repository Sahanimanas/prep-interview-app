import type {
  ClarifyingAnswer,
  CurrentLevel,
  Difficulty,
  HiringVerdict,
  InterviewType,
  JobKind,
  JobStatus,
  MockStatus,
  MockType,
  PlanStatus,
  QuestionKind,
  TopicContentKind,
  TopicStatus,
} from './schemas';

/** All timestamps are ISO-8601 strings; all dates (no time) are YYYY-MM-DD. */
export type ISODateTime = string;
export type ISODate = string;

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ---------------------------------------------------------------------------
// Users & auth
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: ISODateTime;
}

export interface Me extends User {
  /** True when the user stored their own Anthropic API key. */
  hasApiKey: boolean;
  /** Last 4 characters of the stored key, for display only. */
  apiKeyHint: string | null;
  /** True when AI features can run (user key or server key present). */
  aiAvailable: boolean;
}

export interface AuthResponse {
  user: Me;
  accessToken: string;
  /** Seconds until the access token expires. */
  expiresIn: number;
  /** Returned in token mode (mobile). In cookie mode (web) it is set as an httpOnly cookie instead. */
  refreshToken?: string;
}

// ---------------------------------------------------------------------------
// Intake
// ---------------------------------------------------------------------------

export interface ClarifyingQuestion {
  id: string;
  question: string;
  /** single = pick one option, multi = pick any, text = free text */
  type: 'single' | 'multi' | 'text';
  options: string[];
  helperText: string | null;
}

export interface IntakeQuestionsResponse {
  questions: ClarifyingQuestion[];
}

// ---------------------------------------------------------------------------
// Jobs (async AI generation)
// ---------------------------------------------------------------------------

export interface Job {
  id: string;
  kind: JobKind;
  status: JobStatus;
  planId: string;
  topicId: string | null;
  /** id of the produced entity (e.g. the quiz id for a revision quiz) once succeeded */
  resultId: string | null;
  error: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export interface PlanProgress {
  completedTopics: number;
  totalTopics: number;
}

export interface PlanSummary {
  id: string;
  title: string;
  technology: string;
  targetRole: string;
  status: PlanStatus;
  startDate: ISODate;
  interviewDate: ISODate;
  totalDays: number;
  /** Days left until the interview (0 = interview is today, negative = passed). */
  daysRemaining: number;
  progress: PlanProgress;
  createdAt: ISODateTime;
}

export interface Plan extends PlanSummary {
  yearsOfExperience: number;
  hoursPerDay: number;
  currentLevel: CurrentLevel;
  interviewTypes: InterviewType[];
  company: string | null;
  focusAreas: string[];
  notes: string | null;
  clarifyingAnswers: ClarifyingAnswer[];
  /** AI-written overview of the strategy (markdown). */
  summary: string | null;
  /** Short actionable tips from the AI. */
  tips: string[];
  error: string | null;
}

export interface TopicSummary {
  id: string;
  planId: string;
  dayNumber: number;
  orderIndex: number;
  title: string;
  description: string;
  subtopics: string[];
  difficulty: Difficulty;
  estimatedMinutes: number;
  status: TopicStatus;
  hasDoc: boolean;
  questionCount: number;
  hasQuiz: boolean;
}

export interface PlanDay {
  dayNumber: number;
  date: ISODate;
  theme: string;
  topics: TopicSummary[];
}

export interface PlanStats {
  completedTopics: number;
  totalTopics: number;
  quizAttempts: number;
  /** 0-100 */
  averageQuizScore: number | null;
  mocksCompleted: number;
  /** 0-100 */
  averageMockScore: number | null;
  daysRemaining: number;
  /** Which plan day is "today" (clamped to 1..totalDays). */
  todayDayNumber: number;
}

export interface PlanDetail {
  plan: Plan;
  days: PlanDay[];
  stats: PlanStats;
  /** The plan-generation job while the plan is generating / failed. */
  planJob: Job | null;
}

// ---------------------------------------------------------------------------
// Learning content
// ---------------------------------------------------------------------------

export interface LearningDoc {
  id: string;
  topicId: string;
  /** Markdown, including fenced code blocks. */
  contentMd: string;
  keyTakeaways: string[];
  createdAt: ISODateTime;
}

export interface InterviewQuestion {
  id: string;
  topicId: string;
  topicTitle: string;
  question: string;
  /** Model answer, markdown. */
  answerMd: string;
  difficulty: Difficulty;
  kind: QuestionKind;
  followUps: string[];
  bookmarked: boolean;
  /** Self-rated 1-5, null until rated. */
  confidence: number | null;
}

// ---------------------------------------------------------------------------
// Quizzes
// ---------------------------------------------------------------------------

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  orderIndex: number;
}

export interface QuizQuestionResult {
  questionId: string;
  /** -1 when skipped */
  selectedIndex: number;
  correctIndex: number;
  correct: boolean;
  explanation: string;
}

export interface QuizAttemptResult {
  id: string;
  quizId: string;
  score: number;
  total: number;
  /** 0-100 */
  percentage: number;
  results: QuizQuestionResult[];
  createdAt: ISODateTime;
}

export interface QuizSummary {
  id: string;
  planId: string;
  topicId: string | null;
  title: string;
  questionCount: number;
  attemptCount: number;
  /** 0-100 */
  bestPercentage: number | null;
  createdAt: ISODateTime;
}

export interface QuizDetail extends QuizSummary {
  questions: QuizQuestion[];
  lastAttempt: QuizAttemptResult | null;
}

// ---------------------------------------------------------------------------
// Topic detail
// ---------------------------------------------------------------------------

export interface TopicDetail {
  topic: TopicSummary;
  doc: LearningDoc | null;
  questions: InterviewQuestion[];
  quiz: QuizDetail | null;
  /** Latest generation job per content kind (absent when never requested). */
  jobs: Partial<Record<TopicContentKind, Job>>;
}

// ---------------------------------------------------------------------------
// Mock interviews
// ---------------------------------------------------------------------------

export interface MockFeedback {
  /** 0-10 */
  score: number;
  comment: string;
  idealAnswer: string;
}

export interface MockMessage {
  id: string;
  role: 'interviewer' | 'candidate';
  content: string;
  /** Present on candidate messages once evaluated. */
  feedback: MockFeedback | null;
  createdAt: ISODateTime;
}

export interface MockScorecard {
  /** 0-100 */
  overallScore: number;
  verdict: HiringVerdict;
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendedTopics: string[];
}

export interface MockSummary {
  id: string;
  planId: string;
  type: MockType;
  status: MockStatus;
  questionCount: number;
  answeredCount: number;
  overallScore: number | null;
  createdAt: ISODateTime;
  completedAt: ISODateTime | null;
}

export interface MockDetail extends MockSummary {
  topicTitles: string[];
  messages: MockMessage[];
  scorecard: MockScorecard | null;
}
