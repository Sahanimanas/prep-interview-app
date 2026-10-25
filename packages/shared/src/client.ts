import type {
  AnswerMockInput,
  CreateMockInput,
  CreatePlanInput,
  CreateRevisionQuizInput,
  GenerateTopicContentInput,
  IntakeBasicsInput,
  LoginInput,
  RegisterInput,
  SetApiKeyInput,
  SubmitQuizAttemptInput,
  UpdateProfileInput,
  UpdateQuestionInput,
  UpdateTopicInput,
} from './schemas';
import type {
  ApiErrorBody,
  AuthResponse,
  IntakeQuestionsResponse,
  InterviewQuestion,
  Job,
  Me,
  MockDetail,
  MockSummary,
  PlanDetail,
  PlanSummary,
  QuizAttemptResult,
  QuizDetail,
  QuizSummary,
  TopicDetail,
  TopicSummary,
} from './types';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Field errors from a VALIDATION_ERROR response, keyed by dotted path. */
  get fieldErrors(): Record<string, string> {
    if (this.code !== 'VALIDATION_ERROR' || !Array.isArray(this.details)) return {};
    const out: Record<string, string> = {};
    for (const issue of this.details as { path?: unknown; message?: unknown }[]) {
      const path = Array.isArray(issue.path) ? issue.path.join('.') : '';
      if (typeof issue.message === 'string' && !(path in out)) out[path] = issue.message;
    }
    return out;
  }
}

/**
 * Where the client keeps credentials.
 * - `token` mode (mobile): both tokens are stored by the app (e.g. SecureStore).
 * - `cookie` mode (web): the refresh token lives in an httpOnly cookie managed by the
 *   server, so `getRefreshToken` can return null and only the access token is kept in memory.
 */
export interface AuthStorage {
  getAccessToken(): string | null | Promise<string | null>;
  getRefreshToken(): string | null | Promise<string | null>;
  save(tokens: { accessToken: string; refreshToken?: string }): void | Promise<void>;
  clear(): void | Promise<void>;
}

export interface ApiClientOptions {
  /** e.g. "https://api.example.com/api/v1" or "/api/v1" for same-origin web */
  baseUrl: string;
  storage: AuthStorage;
  mode: 'token' | 'cookie';
  /** Called when the session cannot be refreshed (user must sign in again). */
  onSessionExpired?: () => void;
  fetchImpl?: typeof fetch;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Skip auth header + refresh-on-401 (used for login/register/refresh). */
  anonymous?: boolean;
  signal?: AbortSignal;
}

export class ApiClient {
  private refreshInFlight: Promise<boolean> | null = null;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: ApiClientOptions) {
    this.fetchImpl = options.fetchImpl ?? ((...args) => fetch(...args));
  }

  // ---------------------------------------------------------------- core

  private buildUrl(path: string, query?: RequestOptions['query']): string {
    const base = this.options.baseUrl.replace(/\/+$/, '');
    let url = `${base}${path}`;
    if (query) {
      const params = Object.entries(query)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
      if (params.length) url += `?${params.join('&')}`;
    }
    return url;
  }

  private async send(method: Method, path: string, opts: RequestOptions): Promise<Response> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    if (this.options.mode === 'cookie') headers['X-Auth-Mode'] = 'cookie';
    if (!opts.anonymous) {
      const token = await this.options.storage.getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    try {
      return await this.fetchImpl(this.buildUrl(path, opts.query), {
        method,
        headers,
        body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
        credentials: this.options.mode === 'cookie' ? 'include' : 'omit',
        signal: opts.signal,
      });
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') throw err;
      throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection.');
    }
  }

  private async parse<T>(res: Response): Promise<T> {
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    let json: unknown = undefined;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = undefined;
      }
    }
    if (!res.ok) {
      const body = json as ApiErrorBody | undefined;
      throw new ApiError(
        res.status,
        body?.error?.code ?? 'HTTP_ERROR',
        body?.error?.message ?? `Request failed (${res.status})`,
        body?.error?.details,
      );
    }
    return json as T;
  }

  async request<T>(method: Method, path: string, opts: RequestOptions = {}): Promise<T> {
    let res = await this.send(method, path, opts);
    if (res.status === 401 && !opts.anonymous) {
      const refreshed = await this.refreshSession();
      if (refreshed) {
        res = await this.send(method, path, opts);
      } else {
        await this.options.storage.clear();
        this.options.onSessionExpired?.();
      }
    }
    return this.parse<T>(res);
  }

  /** Single-flight refresh: concurrent 401s share one refresh call. */
  refreshSession(): Promise<boolean> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.doRefresh().finally(() => {
        this.refreshInFlight = null;
      });
    }
    return this.refreshInFlight;
  }

  private async doRefresh(): Promise<boolean> {
    const refreshToken = await this.options.storage.getRefreshToken();
    if (this.options.mode === 'token' && !refreshToken) return false;
    try {
      const res = await this.send('POST', '/auth/refresh', {
        anonymous: true,
        body: refreshToken ? { refreshToken } : {},
      });
      if (!res.ok) return false;
      const data = (await res.json()) as AuthResponse;
      await this.options.storage.save({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      return true;
    } catch {
      return false;
    }
  }

  private async storeAuth(data: AuthResponse): Promise<AuthResponse> {
    await this.options.storage.save({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    return data;
  }

  // ---------------------------------------------------------------- auth

  async register(input: RegisterInput): Promise<AuthResponse> {
    return this.storeAuth(await this.request<AuthResponse>('POST', '/auth/register', { body: input, anonymous: true }));
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    return this.storeAuth(await this.request<AuthResponse>('POST', '/auth/login', { body: input, anonymous: true }));
  }

  async logout(): Promise<void> {
    const refreshToken = await this.options.storage.getRefreshToken();
    try {
      await this.request<void>('POST', '/auth/logout', { body: refreshToken ? { refreshToken } : {}, anonymous: true });
    } finally {
      await this.options.storage.clear();
    }
  }

  me = () => this.request<Me>('GET', '/me');
  updateProfile = (input: UpdateProfileInput) => this.request<Me>('PATCH', '/me', { body: input });
  setApiKey = (input: SetApiKeyInput) => this.request<Me>('PUT', '/me/api-key', { body: input });
  deleteApiKey = () => this.request<Me>('DELETE', '/me/api-key');

  // ---------------------------------------------------------------- intake & plans

  getIntakeQuestions = (input: IntakeBasicsInput) =>
    this.request<IntakeQuestionsResponse>('POST', '/intake/questions', { body: input });

  listPlans = () => this.request<PlanSummary[]>('GET', '/plans');
  createPlan = (input: CreatePlanInput) => this.request<PlanDetail>('POST', '/plans', { body: input });
  getPlan = (planId: string) => this.request<PlanDetail>('GET', `/plans/${planId}`);
  retryPlan = (planId: string) => this.request<PlanDetail>('POST', `/plans/${planId}/retry`);
  deletePlan = (planId: string) => this.request<void>('DELETE', `/plans/${planId}`);

  // ---------------------------------------------------------------- topics

  getTopic = (topicId: string) => this.request<TopicDetail>('GET', `/topics/${topicId}`);
  updateTopic = (topicId: string, input: UpdateTopicInput) =>
    this.request<TopicSummary>('PATCH', `/topics/${topicId}`, { body: input });
  generateTopicContent = (topicId: string, input: GenerateTopicContentInput) =>
    this.request<Job>('POST', `/topics/${topicId}/generate`, { body: input });

  // ---------------------------------------------------------------- questions

  listQuestions = (planId: string, filter: { bookmarked?: boolean; topicId?: string } = {}) =>
    this.request<InterviewQuestion[]>('GET', `/plans/${planId}/questions`, { query: filter });
  updateQuestion = (questionId: string, input: UpdateQuestionInput) =>
    this.request<InterviewQuestion>('PATCH', `/questions/${questionId}`, { body: input });

  // ---------------------------------------------------------------- quizzes

  listQuizzes = (planId: string) => this.request<QuizSummary[]>('GET', `/plans/${planId}/quizzes`);
  createRevisionQuiz = (planId: string, input: CreateRevisionQuizInput) =>
    this.request<Job>('POST', `/plans/${planId}/quizzes`, { body: input });
  getQuiz = (quizId: string) => this.request<QuizDetail>('GET', `/quizzes/${quizId}`);
  submitQuizAttempt = (quizId: string, input: SubmitQuizAttemptInput) =>
    this.request<QuizAttemptResult>('POST', `/quizzes/${quizId}/attempts`, { body: input });

  // ---------------------------------------------------------------- mocks

  listMocks = (planId: string) => this.request<MockSummary[]>('GET', `/plans/${planId}/mocks`);
  createMock = (planId: string, input: CreateMockInput) =>
    this.request<MockDetail>('POST', `/plans/${planId}/mocks`, { body: input });
  getMock = (mockId: string) => this.request<MockDetail>('GET', `/mocks/${mockId}`);
  answerMock = (mockId: string, input: AnswerMockInput) =>
    this.request<MockDetail>('POST', `/mocks/${mockId}/answer`, { body: input });
  endMock = (mockId: string) => this.request<MockDetail>('POST', `/mocks/${mockId}/end`);

  // ---------------------------------------------------------------- jobs

  getJob = (jobId: string) => this.request<Job>('GET', `/jobs/${jobId}`);
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  return new ApiClient(options);
}
