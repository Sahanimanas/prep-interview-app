import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const CURRENT_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export const currentLevelSchema = z.enum(CURRENT_LEVELS);
export type CurrentLevel = z.infer<typeof currentLevelSchema>;

export const INTERVIEW_TYPES = [
  'technical_concepts',
  'coding',
  'system_design',
  'behavioral',
  'debugging',
  'take_home',
] as const;
export const interviewTypeSchema = z.enum(INTERVIEW_TYPES);
export type InterviewType = z.infer<typeof interviewTypeSchema>;

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  technical_concepts: 'Technical concepts',
  coding: 'Live coding',
  system_design: 'System design',
  behavioral: 'Behavioral',
  debugging: 'Debugging',
  take_home: 'Take-home assignment',
};

export const TOPIC_STATUSES = ['not_started', 'in_progress', 'completed'] as const;
export const topicStatusSchema = z.enum(TOPIC_STATUSES);
export type TopicStatus = z.infer<typeof topicStatusSchema>;

export const PLAN_STATUSES = ['generating', 'ready', 'failed'] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const JOB_KINDS = ['plan', 'doc', 'questions', 'quiz'] as const;
export type JobKind = (typeof JOB_KINDS)[number];

export const TOPIC_CONTENT_KINDS = ['doc', 'questions', 'quiz'] as const;
export const topicContentKindSchema = z.enum(TOPIC_CONTENT_KINDS);
export type TopicContentKind = z.infer<typeof topicContentKindSchema>;

export const JOB_STATUSES = ['queued', 'running', 'succeeded', 'failed'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export const difficultySchema = z.enum(DIFFICULTIES);
export type Difficulty = z.infer<typeof difficultySchema>;

export const QUESTION_KINDS = ['conceptual', 'coding', 'scenario', 'behavioral', 'system_design'] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];

export const MOCK_TYPES = ['technical', 'behavioral', 'system_design', 'mixed'] as const;
export const mockTypeSchema = z.enum(MOCK_TYPES);
export type MockType = z.infer<typeof mockTypeSchema>;

export const MOCK_TYPE_LABELS: Record<MockType, string> = {
  technical: 'Technical deep-dive',
  behavioral: 'Behavioral',
  system_design: 'System design',
  mixed: 'Mixed (full loop)',
};

export const MOCK_STATUSES = ['in_progress', 'completed'] as const;
export type MockStatus = (typeof MOCK_STATUSES)[number];

export const HIRING_VERDICTS = ['strong_hire', 'hire', 'lean_hire', 'lean_no_hire', 'no_hire'] as const;
export type HiringVerdict = (typeof HIRING_VERDICTS)[number];

// ---------------------------------------------------------------------------
// Limits shared by client-side forms and server-side validation
// ---------------------------------------------------------------------------

export const LIMITS = {
  minDays: 1,
  maxDays: 90,
  maxHoursPerDay: 12,
  maxYearsOfExperience: 40,
  maxFocusAreas: 10,
  maxClarifyingAnswers: 8,
  mockQuestionCount: { min: 3, max: 10 },
  revisionQuizQuestionCount: { min: 5, max: 25 },
  passwordMinLength: 8,
} as const;

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(254),
  password: z
    .string()
    .min(LIMITS.passwordMinLength, `Password must be at least ${LIMITS.passwordMinLength} characters`)
    .max(128),
});
export type RegisterInput = z.input<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required').max(128),
});
export type LoginInput = z.input<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80),
});
export type UpdateProfileInput = z.input<typeof updateProfileSchema>;

export const setApiKeySchema = z.object({
  apiKey: z
    .string()
    .trim()
    .min(20, 'That does not look like a valid API key')
    .max(300)
    .regex(/^sk-ant-/, 'Anthropic API keys start with "sk-ant-"'),
});
export type SetApiKeyInput = z.input<typeof setApiKeySchema>;

// ---------------------------------------------------------------------------
// Intake (the questions asked before a plan is generated)
// ---------------------------------------------------------------------------

export const intakeBasicsSchema = z.object({
  technology: z.string().trim().min(2, 'What are you preparing for?').max(100),
  targetRole: z.string().trim().min(2, 'Enter the role you are interviewing for').max(100),
  yearsOfExperience: z.number().min(0).max(LIMITS.maxYearsOfExperience),
  daysUntilInterview: z.number().int().min(LIMITS.minDays).max(LIMITS.maxDays),
  hoursPerDay: z.number().min(0.5).max(LIMITS.maxHoursPerDay),
  currentLevel: currentLevelSchema,
  interviewTypes: z.array(interviewTypeSchema).min(1, 'Pick at least one interview type'),
  company: z.string().trim().max(100).optional(),
  focusAreas: z.array(z.string().trim().min(1).max(60)).max(LIMITS.maxFocusAreas).default([]),
  notes: z.string().trim().max(1000).optional(),
});
export type IntakeBasicsInput = z.input<typeof intakeBasicsSchema>;
export type IntakeBasics = z.output<typeof intakeBasicsSchema>;

export const clarifyingAnswerSchema = z.object({
  question: z.string().trim().min(1).max(500),
  answer: z.string().trim().max(1000),
});
export type ClarifyingAnswer = z.infer<typeof clarifyingAnswerSchema>;

export const createPlanSchema = intakeBasicsSchema.extend({
  clarifyingAnswers: z.array(clarifyingAnswerSchema).max(LIMITS.maxClarifyingAnswers).default([]),
});
export type CreatePlanInput = z.input<typeof createPlanSchema>;
export type CreatePlan = z.output<typeof createPlanSchema>;

// ---------------------------------------------------------------------------
// Topics, questions, quizzes, mocks
// ---------------------------------------------------------------------------

export const updateTopicSchema = z.object({
  status: topicStatusSchema,
});
export type UpdateTopicInput = z.input<typeof updateTopicSchema>;

export const generateTopicContentSchema = z.object({
  kind: topicContentKindSchema,
  regenerate: z.boolean().default(false),
});
export type GenerateTopicContentInput = z.input<typeof generateTopicContentSchema>;

export const updateQuestionSchema = z
  .object({
    bookmarked: z.boolean().optional(),
    confidence: z.number().int().min(1).max(5).nullable().optional(),
  })
  .refine((v) => v.bookmarked !== undefined || v.confidence !== undefined, 'Nothing to update');
export type UpdateQuestionInput = z.input<typeof updateQuestionSchema>;

export const createRevisionQuizSchema = z.object({
  topicIds: z.array(z.string().uuid()).max(30).optional(),
  questionCount: z
    .number()
    .int()
    .min(LIMITS.revisionQuizQuestionCount.min)
    .max(LIMITS.revisionQuizQuestionCount.max)
    .default(10),
});
export type CreateRevisionQuizInput = z.input<typeof createRevisionQuizSchema>;

export const submitQuizAttemptSchema = z.object({
  answers: z.array(z.number().int().min(-1)).min(1).max(50),
});
export type SubmitQuizAttemptInput = z.input<typeof submitQuizAttemptSchema>;

export const createMockSchema = z.object({
  type: mockTypeSchema,
  topicIds: z.array(z.string().uuid()).max(20).optional(),
  questionCount: z
    .number()
    .int()
    .min(LIMITS.mockQuestionCount.min)
    .max(LIMITS.mockQuestionCount.max)
    .default(5),
});
export type CreateMockInput = z.input<typeof createMockSchema>;

export const answerMockSchema = z.object({
  answer: z.string().trim().min(1, 'Type your answer first').max(8000),
});
export type AnswerMockInput = z.input<typeof answerMockSchema>;

export const listQuestionsQuerySchema = z.object({
  bookmarked: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  topicId: z.string().uuid().optional(),
});
