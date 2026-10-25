/**
 * Contract between the AI layer (src/ai/*) and the rest of the API.
 * Route handlers and job handlers only call the functions declared in `AiService`.
 */
import type {
  ClarifyingAnswer,
  ClarifyingQuestion,
  CurrentLevel,
  Difficulty,
  IntakeBasics,
  InterviewType,
  MockFeedback,
  MockScorecard,
  MockType,
  QuestionKind,
} from '@preppilot/shared';

/** Credentials for one AI call. `apiKey` is the user's own key or the server key ('mock' in AI_MOCK mode). */
export interface AiContext {
  apiKey: string;
  signal?: AbortSignal;
}

/** Everything known about the candidate; included in every prompt for personalisation. */
export interface CandidateProfile {
  technology: string;
  targetRole: string;
  yearsOfExperience: number;
  currentLevel: CurrentLevel;
  interviewTypes: InterviewType[];
  company: string | null;
  focusAreas: string[];
  notes: string | null;
  clarifyingAnswers: ClarifyingAnswer[];
  totalDays: number;
  hoursPerDay: number;
}

export interface TopicRef {
  title: string;
  description: string;
  subtopics: string[];
  difficulty: Difficulty;
}

export interface GeneratedPlan {
  /** e.g. "Senior Node.js Backend Engineer · 14-day plan" */
  title: string;
  /** Markdown overview of the strategy. */
  summary: string;
  tips: string[];
  /** One entry per day, dayNumber 1..totalDays, each with >= 1 topic. Normalised by the AI layer. */
  days: {
    dayNumber: number;
    theme: string;
    topics: (TopicRef & { estimatedMinutes: number })[];
  }[];
}

export interface GeneratedDoc {
  contentMd: string;
  keyTakeaways: string[];
}

export interface GeneratedQuestion {
  question: string;
  answerMd: string;
  difficulty: Difficulty;
  kind: QuestionKind;
  followUps: string[];
}

export interface GeneratedQuiz {
  title: string;
  /** Normalised: every question has 2-6 options and 0 <= correctIndex < options.length. */
  questions: { prompt: string; options: string[]; correctIndex: number; explanation: string }[];
}

export interface TranscriptEntry {
  role: 'interviewer' | 'candidate';
  content: string;
  /** Present for evaluated candidate answers. */
  feedback?: MockFeedback | null;
}

export interface MockSetup {
  type: MockType;
  questionCount: number;
  /** Topics to focus on (may be empty = whole plan). */
  topics: TopicRef[];
}

export interface AiService {
  /** 3-5 tailored clarifying questions asked before the plan is generated. */
  generateIntakeQuestions(ctx: AiContext, basics: IntakeBasics): Promise<ClarifyingQuestion[]>;
  generatePlan(ctx: AiContext, profile: CandidateProfile): Promise<GeneratedPlan>;
  generateLearningDoc(ctx: AiContext, profile: CandidateProfile, topic: TopicRef): Promise<GeneratedDoc>;
  generateQuestions(ctx: AiContext, profile: CandidateProfile, topic: TopicRef): Promise<GeneratedQuestion[]>;
  /** Topic quiz (one topic) or revision quiz (many topics). */
  generateQuiz(ctx: AiContext, profile: CandidateProfile, topics: TopicRef[], questionCount: number): Promise<GeneratedQuiz>;
  /** Interviewer's opening message, ending with question 1. */
  startMockInterview(ctx: AiContext, profile: CandidateProfile, setup: MockSetup): Promise<{ message: string }>;
  /**
   * Evaluates the candidate's latest answer (last transcript entry) and writes the interviewer's next
   * message: the next question, or a brief closing remark when `isLast` is true.
   */
  evaluateMockAnswer(
    ctx: AiContext,
    profile: CandidateProfile,
    setup: MockSetup,
    transcript: TranscriptEntry[],
    isLast: boolean,
  ): Promise<{ feedback: MockFeedback; nextMessage: string }>;
  generateMockScorecard(
    ctx: AiContext,
    profile: CandidateProfile,
    setup: MockSetup,
    transcript: TranscriptEntry[],
  ): Promise<MockScorecard>;
  /** Throws AppError(400, 'AI_KEY_INVALID') when Anthropic rejects the key. */
  validateApiKey(apiKey: string): Promise<void>;
}
