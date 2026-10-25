"use client";

import {
  CURRENT_LEVELS,
  INTERVIEW_TYPES,
  INTERVIEW_TYPE_LABELS,
  LIMITS,
  intakeBasicsSchema,
  type ClarifyingAnswer,
  type ClarifyingQuestion,
  type CurrentLevel,
  type IntakeBasicsInput,
  type InterviewType,
} from "@preppilot/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Pencil, Sparkles, WandSparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { TechCover } from "@/components/art/tech-cover";
import { TechLogo } from "@/components/art/tech-logo";
import { AiKeyMissingCallout, ApiErrorCallout } from "@/components/app/api-error-callout";
import { ChatIllustration, CompassIllustration, RocketIllustration } from "@/components/illustrations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { Field, Input, Textarea } from "@/components/ui/input";
import { NumberStepper } from "@/components/ui/number-stepper";
import { Skeleton } from "@/components/ui/skeleton";
import { TagInput } from "@/components/ui/tag-input";
import { api } from "@/lib/api";
import { useUser } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { getFieldErrors, isAiKeyMissing, isApiError } from "@/lib/errors";
import { addDays, daysBetween, formatDate, toISODateLocal } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { useTodayISO } from "@/lib/use-today";
import { issuesToFieldErrors } from "@/lib/validation";

type Step = 1 | 2 | 3;
type AnswerValue = string | string[];

const LEVEL_LABELS: Record<CurrentLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const LEVEL_HINTS: Record<CurrentLevel, string> = {
  beginner: "New to this stack — need the fundamentals.",
  intermediate: "Use it regularly — want to fill gaps and go deeper.",
  advanced: "Know it well — want polish, edge cases and depth.",
};

const FOCUS_SUGGESTIONS = [
  "Performance",
  "Testing",
  "Security",
  "Databases",
  "Concurrency",
  "API design",
  "Architecture",
  "Data structures & algorithms",
  "Debugging",
  "Cloud & DevOps",
];

const DEFAULT_DAYS = 14;

const POPULAR_TECHS = ["React", "Node.js", "Python", "Java", "TypeScript", "Go", "System design", "Kubernetes"];

interface BasicsState {
  technology: string;
  targetRole: string;
  yearsOfExperience: number;
  dateMode: "days" | "date";
  daysUntilInterview: number;
  interviewDate: string;
  hoursPerDay: number;
  currentLevel: CurrentLevel;
  interviewTypes: InterviewType[];
  company: string;
  focusAreas: string[];
  notes: string;
}

const initialBasics: BasicsState = {
  technology: "",
  targetRole: "",
  yearsOfExperience: 2,
  dateMode: "days",
  daysUntilInterview: DEFAULT_DAYS,
  interviewDate: "",
  hoursPerDay: 2,
  currentLevel: "intermediate",
  interviewTypes: ["technical_concepts", "coding"],
  company: "",
  focusAreas: [],
  notes: "",
};

/** Turn the form state into the API input. `daysUntilInterview` is NaN when no date was picked (fails validation). */
function toBasicsInput(state: BasicsState, todayISO: string | null): IntakeBasicsInput {
  let days = state.daysUntilInterview;
  if (state.dateMode === "date") {
    days = state.interviewDate && todayISO ? daysBetween(new Date(`${todayISO}T00:00:00`), state.interviewDate) : NaN;
  }
  return {
    technology: state.technology,
    targetRole: state.targetRole,
    yearsOfExperience: state.yearsOfExperience,
    daysUntilInterview: days,
    hoursPerDay: state.hoursPerDay,
    currentLevel: state.currentLevel,
    interviewTypes: state.interviewTypes,
    company: state.company.trim() || undefined,
    focusAreas: state.focusAreas,
    notes: state.notes.trim() || undefined,
  };
}

function answerToString(value: AnswerValue | undefined): string {
  if (value === undefined) return "";
  return (Array.isArray(value) ? value.join(", ") : value).trim();
}

function buildClarifyingAnswers(
  questions: ClarifyingQuestion[],
  answers: Record<string, AnswerValue>,
): ClarifyingAnswer[] {
  return questions
    .map((q) => ({ question: q.question, answer: answerToString(answers[q.id]) }))
    .filter((a) => a.answer.length > 0)
    .slice(0, LIMITS.maxClarifyingAnswers);
}

export function NewPlanWizard() {
  const user = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const todayISO = useTodayISO();
  const headingRef = useRef<HTMLHeadingElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [basics, setBasics] = useState<BasicsState>(initialBasics);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<ClarifyingQuestion[] | null>(null);
  const [questionsKey, setQuestionsKey] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [skippedQuestions, setSkippedQuestions] = useState(false);

  const intake = useMutation({
    mutationFn: (input: IntakeBasicsInput) => api.getIntakeQuestions(input),
    onSuccess: (res, input) => {
      setQuestions(res.questions);
      setQuestionsKey(JSON.stringify(input));
      setAnswers({});
    },
  });

  const createPlan = useMutation({
    mutationFn: () => {
      const input = toBasicsInput(basics, todayISO);
      return api.createPlan({
        ...input,
        clarifyingAnswers: skippedQuestions || !questions ? [] : buildClarifyingAnswers(questions, answers),
      });
    },
    onSuccess: (detail) => {
      queryClient.setQueryData(queryKeys.plan(detail.plan.id), detail);
      void queryClient.invalidateQueries({ queryKey: queryKeys.plans() });
      router.push(`/plans/${detail.plan.id}`);
    },
    onError: (error) => {
      const fieldErrors = getFieldErrors(error);
      if (Object.keys(fieldErrors).some((k) => !k.startsWith("clarifyingAnswers"))) {
        setErrors(fieldErrors);
        goTo(1);
      }
    },
  });

  const update = <K extends keyof BasicsState>(key: K, value: BasicsState[K]) => {
    setBasics((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const field = key === "dateMode" || key === "interviewDate" ? "daysUntilInterview" : key;
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  function goTo(next: Step) {
    setStep(next);
    // Move focus to the new step heading for keyboard and screen-reader users.
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  function validateBasics(): IntakeBasicsInput | null {
    const input = toBasicsInput(basics, todayISO);
    const parsed = intakeBasicsSchema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors = issuesToFieldErrors(parsed.error.issues);
      if (basics.dateMode === "date" && fieldErrors.daysUntilInterview) {
        fieldErrors.daysUntilInterview = basics.interviewDate
          ? `Pick a date between tomorrow and ${LIMITS.maxDays} days from now.`
          : "Pick your interview date.";
      }
      setErrors(fieldErrors);
      return null;
    }
    setErrors({});
    return input;
  }

  function onSubmitBasics(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = validateBasics();
    if (!input) {
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      });
      return;
    }
    const key = JSON.stringify(input);
    if (key !== questionsKey && !intake.isPending) {
      setQuestions(null);
      setSkippedQuestions(false);
      intake.mutate(input);
    }
    goTo(2);
  }

  function skipQuestions() {
    setSkippedQuestions(true);
    goTo(3);
  }

  const reviewInput = toBasicsInput(basics, todayISO);
  const clarifying = skippedQuestions || !questions ? [] : buildClarifyingAnswers(questions, answers);

  return (
    <div className="mx-auto grid w-full max-w-[1400px] gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
    <div className="flex min-w-0 flex-col gap-8">
      <div>
        <p className="text-sm font-medium text-primary">New prep plan · Step {step} of 3</p>
        <h1 ref={headingRef} tabIndex={-1} className="mt-1 text-3xl font-bold tracking-tight outline-none sm:text-4xl">
          {step === 1 && "Tell us about your interview"}
          {step === 2 && "A few quick questions"}
          {step === 3 && "Review & generate"}
        </h1>
        <p className="mt-1.5 text-fg-muted">
          {step === 1 && "The more we know, the better your plan fits. It takes about two minutes."}
          {step === 2 && "Our AI tailored these to you. Answer what you can — every answer is optional."}
          {step === 3 && "Check everything looks right, then let PrepPilot build your day-by-day plan."}
        </p>
      </div>

      <WizardSteps step={step} />

      {!user.aiAvailable && <AiKeyMissingCallout />}

      {step === 1 && (
        <form onSubmit={onSubmitBasics} noValidate className="flex flex-col gap-6">
          <Card>
            <CardContent className="flex flex-col gap-6">
              <SectionTitle>The interview</SectionTitle>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="What are you preparing for?" error={errors.technology} hint="A technology, stack or domain.">
                  {(p) => (
                    <Input
                      {...p}
                      invalid={p.invalid}
                      value={basics.technology}
                      onChange={(e) => update("technology", e.target.value)}
                      placeholder="e.g. Node.js, React, System design"
                      maxLength={100}
                      autoFocus
                    />
                  )}
                </Field>
                <div className="sm:col-span-2 -mt-2">
                  <p className="mb-2 text-xs text-fg-subtle">Popular picks</p>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_TECHS.map((tech) => (
                      <button
                        key={tech}
                        type="button"
                        onClick={() => update("technology", tech)}
                        aria-pressed={basics.technology === tech}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm font-medium transition-all hover:-translate-y-0.5",
                          basics.technology === tech
                            ? "border-primary bg-primary-soft text-primary-soft-fg"
                            : "border-border-strong bg-surface text-fg-muted hover:text-fg",
                        )}
                      >
                        <TechLogo technology={tech} size="xs" />
                        {tech}
                      </button>
                    ))}
                  </div>
                </div>
                <Field label="Target role" error={errors.targetRole}>
                  {(p) => (
                    <Input
                      {...p}
                      invalid={p.invalid}
                      value={basics.targetRole}
                      onChange={(e) => update("targetRole", e.target.value)}
                      placeholder="e.g. Senior Backend Engineer"
                      maxLength={100}
                    />
                  )}
                </Field>
                <Field label="Company" optional error={errors.company} hint="Helps tailor questions to their style.">
                  {(p) => (
                    <Input
                      {...p}
                      invalid={p.invalid}
                      value={basics.company}
                      onChange={(e) => update("company", e.target.value)}
                      placeholder="e.g. Stripe"
                      maxLength={100}
                    />
                  )}
                </Field>
                <InterviewDateField
                  basics={basics}
                  todayISO={todayISO}
                  error={errors.daysUntilInterview}
                  onChange={update}
                />
              </div>
              <Field label="Interview types" asGroup error={errors.interviewTypes} hint="Select all that apply.">
                {(p) => (
                  <ChipGroup
                    id={p.id}
                    aria-describedby={p["aria-describedby"]}
                    label="Interview types"
                    options={INTERVIEW_TYPES.map((t) => ({ value: t, label: INTERVIEW_TYPE_LABELS[t] }))}
                    value={basics.interviewTypes}
                    onChange={(v) => update("interviewTypes", v)}
                  />
                )}
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-6">
              <SectionTitle>About you</SectionTitle>
              <Field label="Current level with this stack" asGroup error={errors.currentLevel}>
                {() => (
                  <div role="radiogroup" aria-label="Current level" className="grid gap-2 sm:grid-cols-3">
                    {CURRENT_LEVELS.map((level) => {
                      const selected = basics.currentLevel === level;
                      return (
                        <button
                          key={level}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => update("currentLevel", level)}
                          className={cn(
                            "rounded-xl border p-3.5 text-left transition-colors",
                            selected
                              ? "border-primary bg-primary-soft ring-1 ring-primary"
                              : "border-border-strong bg-surface hover:border-fg-subtle",
                          )}
                        >
                          <span className="flex items-center justify-between text-sm font-semibold">
                            {LEVEL_LABELS[level]}
                            {selected && <Check className="size-4 text-primary" aria-hidden />}
                          </span>
                          <span className="mt-1 block text-xs text-fg-muted">{LEVEL_HINTS[level]}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Years of experience" error={errors.yearsOfExperience}>
                  {(p) => (
                    <NumberStepper
                      id={p.id}
                      aria-describedby={p["aria-describedby"]}
                      invalid={p.invalid}
                      label="years of experience"
                      value={basics.yearsOfExperience}
                      onChange={(v) => update("yearsOfExperience", v)}
                      min={0}
                      max={LIMITS.maxYearsOfExperience}
                      step={0.5}
                      suffix={basics.yearsOfExperience === 1 ? "year" : "years"}
                    />
                  )}
                </Field>
                <Field
                  label="Study time per day"
                  error={errors.hoursPerDay}
                  hint={`${basics.hoursPerDay} ${basics.hoursPerDay === 1 ? "hour" : "hours"} a day`}
                >
                  {(p) => (
                    <div className="flex items-center gap-3">
                      <input
                        id={p.id}
                        aria-describedby={p["aria-describedby"]}
                        type="range"
                        min={0.5}
                        max={LIMITS.maxHoursPerDay}
                        step={0.5}
                        value={basics.hoursPerDay}
                        onChange={(e) => update("hoursPerDay", Number(e.target.value))}
                        className="h-10 w-full min-w-0 accent-primary"
                        aria-valuetext={`${basics.hoursPerDay} hours per day`}
                      />
                      <span className="w-14 shrink-0 rounded-md bg-surface-muted px-2 py-1 text-center text-sm font-semibold tabular-nums">
                        {basics.hoursPerDay}h
                      </span>
                    </div>
                  )}
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-6">
              <SectionTitle>Focus</SectionTitle>
              <Field
                label="Focus areas"
                optional
                error={errors.focusAreas}
                hint={`Topics you want extra time on. Up to ${LIMITS.maxFocusAreas}.`}
              >
                {(p) => (
                  <TagInput
                    {...p}
                    value={basics.focusAreas}
                    onChange={(v) => update("focusAreas", v)}
                    suggestions={FOCUS_SUGGESTIONS}
                    max={LIMITS.maxFocusAreas}
                    placeholder="Add a focus area and press Enter"
                  />
                )}
              </Field>
              <Field label="Anything else?" optional error={errors.notes} hint="Job description highlights, weak spots, past interview feedback…">
                {(p) => (
                  <Textarea
                    {...p}
                    invalid={p.invalid}
                    value={basics.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    maxLength={1000}
                    rows={4}
                    placeholder="e.g. I struggle with explaining the event loop under pressure."
                  />
                )}
              </Field>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" size="lg" rightIcon={<ArrowRight className="size-4" aria-hidden />}>
              Continue
            </Button>
          </div>
        </form>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-6">
          {intake.isPending ? (
            <QuestionsSkeleton />
          ) : intake.isError && !questions ? (
            isAiKeyMissing(intake.error) ? (
              <AiKeyMissingCallout />
            ) : (
              <ApiErrorCallout
                error={intake.error}
                title="We couldn't generate your questions"
                onRetry={() => {
                  const input = validateBasics();
                  if (input) intake.mutate(input);
                }}
              />
            )
          ) : questions && questions.length > 0 ? (
            <Card>
              <CardContent className="flex flex-col gap-7">
                {questions.map((q, index) => (
                  <ClarifyingQuestionField
                    key={q.id}
                    index={index}
                    question={q}
                    value={answers[q.id]}
                    onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
                  />
                ))}
              </CardContent>
            </Card>
          ) : questions ? (
            <Card>
              <CardContent className="text-sm text-fg-muted">
                No follow-up questions needed — we have everything we need.
              </CardContent>
            </Card>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" onClick={() => goTo(1)} leftIcon={<ArrowLeft className="size-4" aria-hidden />}>
              Back
            </Button>
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Button variant="outline" onClick={skipQuestions}>
                Skip questions
              </Button>
              <Button
                onClick={() => {
                  setSkippedQuestions(false);
                  goTo(3);
                }}
                disabled={intake.isPending || !questions}
                rightIcon={<ArrowRight className="size-4" aria-hidden />}
              >
                Review plan
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="flex flex-col gap-5">
              <div className="flex items-center justify-between gap-3">
                <SectionTitle>Your interview</SectionTitle>
                <Button variant="ghost" size="sm" onClick={() => goTo(1)} leftIcon={<Pencil className="size-3.5" aria-hidden />}>
                  Edit
                </Button>
              </div>
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <ReviewItem label="Preparing for">{reviewInput.technology}</ReviewItem>
                <ReviewItem label="Target role">{reviewInput.targetRole}</ReviewItem>
                <ReviewItem label="Interview">
                  {Number.isFinite(reviewInput.daysUntilInterview) && todayISO
                    ? `In ${reviewInput.daysUntilInterview} ${reviewInput.daysUntilInterview === 1 ? "day" : "days"} · ${formatDate(
                        toISODateLocal(addDays(new Date(`${todayISO}T00:00:00`), reviewInput.daysUntilInterview)),
                      )}`
                    : `In ${reviewInput.daysUntilInterview} days`}
                </ReviewItem>
                <ReviewItem label="Company">{reviewInput.company ?? "—"}</ReviewItem>
                <ReviewItem label="Experience">
                  {reviewInput.yearsOfExperience} {reviewInput.yearsOfExperience === 1 ? "year" : "years"} ·{" "}
                  {LEVEL_LABELS[reviewInput.currentLevel]}
                </ReviewItem>
                <ReviewItem label="Study time">{reviewInput.hoursPerDay}h per day</ReviewItem>
                <ReviewItem label="Interview types" wide>
                  <div className="flex flex-wrap gap-1.5">
                    {reviewInput.interviewTypes.map((t) => (
                      <Badge key={t} tone="primary">
                        {INTERVIEW_TYPE_LABELS[t]}
                      </Badge>
                    ))}
                  </div>
                </ReviewItem>
                {basics.focusAreas.length > 0 && (
                  <ReviewItem label="Focus areas" wide>
                    <div className="flex flex-wrap gap-1.5">
                      {basics.focusAreas.map((f) => (
                        <Badge key={f}>{f}</Badge>
                      ))}
                    </div>
                  </ReviewItem>
                )}
                {reviewInput.notes && (
                  <ReviewItem label="Notes" wide>
                    <span className="whitespace-pre-line">{reviewInput.notes}</span>
                  </ReviewItem>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <SectionTitle>Your answers</SectionTitle>
                <Button variant="ghost" size="sm" onClick={() => goTo(2)} leftIcon={<Pencil className="size-3.5" aria-hidden />}>
                  Edit
                </Button>
              </div>
              {clarifying.length === 0 ? (
                <p className="text-sm text-fg-muted">
                  {skippedQuestions ? "You skipped the clarifying questions." : "No answers given."} That&apos;s fine —
                  the plan will be based on the details above.
                </p>
              ) : (
                <dl className="flex flex-col gap-4">
                  {clarifying.map((a) => (
                    <div key={a.question}>
                      <dt className="text-sm text-fg-muted">{a.question}</dt>
                      <dd className="mt-0.5 text-sm font-medium">{a.answer}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </CardContent>
          </Card>

          {createPlan.isError && <ApiErrorCallout error={createPlan.error} title="We couldn't create your plan" />}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" onClick={() => goTo(2)} leftIcon={<ArrowLeft className="size-4" aria-hidden />}>
              Back
            </Button>
            <Button
              size="lg"
              loading={createPlan.isPending}
              disabled={createPlan.isSuccess}
              onClick={() => createPlan.mutate()}
              leftIcon={<WandSparkles className="size-4" aria-hidden />}
            >
              {createPlan.isPending ? "Starting…" : "Generate my plan"}
            </Button>
          </div>
          {isApiError(createPlan.error) && createPlan.error.code === "VALIDATION_ERROR" && (
            <p className="text-sm text-danger">Some details need fixing — check the highlighted fields.</p>
          )}
        </div>
      )}
    </div>
      <WizardPreview step={step} basics={basics} />
    </div>
  );
}

function WizardSteps({ step }: { step: Step }) {
  const steps = [
    { n: 1, label: "Basics" },
    { n: 2, label: "Questions" },
    { n: 3, label: "Review" },
  ] as const;
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {steps.map((s, i) => {
        const done = s.n < step;
        const current = s.n === step;
        return (
          <li key={s.n} className="flex flex-1 items-center gap-2" aria-current={current ? "step" : undefined}>
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                done && "bg-primary text-primary-fg",
                current && "bg-primary-soft text-primary-soft-fg ring-2 ring-primary",
                !done && !current && "bg-surface-muted text-fg-subtle",
              )}
            >
              {done ? <Check className="size-4" aria-hidden /> : s.n}
            </span>
            <span className={cn("text-sm font-medium", current ? "text-fg" : "text-fg-subtle", "hidden sm:inline")}>
              {s.label}
            </span>
            <span className="sr-only sm:hidden">{s.label}</span>
            {i < steps.length - 1 && (
              <span aria-hidden className={cn("h-px flex-1", done ? "bg-primary" : "bg-border-strong")} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-subtle">{children}</h2>;
}

function ReviewItem({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={cn("min-w-0", wide && "sm:col-span-2")}>
      <dt className="text-xs font-medium uppercase tracking-wider text-fg-subtle">{label}</dt>
      <dd className="mt-1 wrap-break-word text-sm font-medium">{children}</dd>
    </div>
  );
}

function InterviewDateField({
  basics,
  todayISO,
  error,
  onChange,
}: {
  basics: BasicsState;
  todayISO: string | null;
  error?: string;
  onChange: <K extends keyof BasicsState>(key: K, value: BasicsState[K]) => void;
}) {
  const today = todayISO ? new Date(`${todayISO}T00:00:00`) : null;
  const minDate = today ? toISODateLocal(addDays(today, LIMITS.minDays)) : undefined;
  const maxDate = today ? toISODateLocal(addDays(today, LIMITS.maxDays)) : undefined;
  const derivedDays =
    basics.dateMode === "date" && basics.interviewDate && today ? daysBetween(today, basics.interviewDate) : null;

  return (
    <Field
      label="When is the interview?"
      error={error}
      hint={
        basics.dateMode === "days"
          ? today
            ? `On ${formatDate(toISODateLocal(addDays(today, basics.daysUntilInterview)))}`
            : undefined
          : derivedDays !== null && derivedDays > 0
            ? `${derivedDays} ${derivedDays === 1 ? "day" : "days"} from today`
            : undefined
      }
    >
      {(p) => (
        <div className="flex flex-col gap-2">
          {basics.dateMode === "days" ? (
            <NumberStepper
              id={p.id}
              aria-describedby={p["aria-describedby"]}
              invalid={p.invalid}
              label="days until the interview"
              value={basics.daysUntilInterview}
              onChange={(v) => onChange("daysUntilInterview", v)}
              min={LIMITS.minDays}
              max={LIMITS.maxDays}
              suffix={basics.daysUntilInterview === 1 ? "day" : "days"}
            />
          ) : (
            <Input
              {...p}
              type="date"
              invalid={p.invalid}
              min={minDate}
              max={maxDate}
              value={basics.interviewDate}
              onChange={(e) => onChange("interviewDate", e.target.value)}
              className="max-w-56"
            />
          )}
          <div className="flex gap-1.5" role="group" aria-label="Enter interview timing as">
            <Chip
              kind="radio"
              selected={basics.dateMode === "days"}
              className="min-h-7 px-2.5 py-0.5 text-xs"
              onClick={() => onChange("dateMode", "days")}
            >
              Days from now
            </Chip>
            <Chip
              kind="radio"
              selected={basics.dateMode === "date"}
              className="min-h-7 px-2.5 py-0.5 text-xs"
              onClick={() => {
                if (!basics.interviewDate && today) {
                  onChange("interviewDate", toISODateLocal(addDays(today, basics.daysUntilInterview)));
                }
                onChange("dateMode", "date");
              }}
            >
              Pick a date
            </Chip>
          </div>
        </div>
      )}
    </Field>
  );
}

function ClarifyingQuestionField({
  question,
  index,
  value,
  onChange,
}: {
  question: ClarifyingQuestion;
  index: number;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
}) {
  const label = (
    <span className="flex gap-2.5">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary-soft-fg">
        {index + 1}
      </span>
      <span className="pt-0.5 leading-snug">{question.question}</span>
    </span>
  );

  if (question.type === "text" || question.options.length === 0) {
    return (
      <Field label={label} optional hint={question.helperText ?? undefined}>
        {(p) => (
          <Textarea
            {...p}
            rows={3}
            maxLength={1000}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Your answer"
          />
        )}
      </Field>
    );
  }

  const multiple = question.type === "multi";
  const selected = Array.isArray(value) ? value : typeof value === "string" && value ? [value] : [];
  return (
    <Field label={label} optional asGroup hint={question.helperText ?? (multiple ? "Select all that apply." : undefined)}>
      {(p) => (
        <ChipGroup
          id={p.id}
          aria-describedby={p["aria-describedby"]}
          label={question.question}
          multiple={multiple}
          options={question.options.map((o) => ({ value: o, label: o }))}
          value={selected}
          onChange={(v) => {
            if (multiple) onChange(v);
            else onChange(selected[0] === v[0] ? "" : (v[0] ?? ""));
          }}
          className="pl-8"
        />
      )}
    </Field>
  );
}

function QuestionsSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-6" aria-busy="true">
        <div className="flex items-center gap-3 rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary-soft-fg" role="status">
          <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-surface">
            <Sparkles className="size-4 animate-pulse text-primary" aria-hidden />
          </span>
          <span>
            <strong className="font-semibold">Tailoring your questions…</strong> This usually takes 5–20 seconds.
          </span>
        </div>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <Skeleton className="h-4 w-3/4" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-9 w-24 rounded-full" />
              <Skeleton className="h-9 w-32 rounded-full" />
              <Skeleton className="h-9 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** Sticky live preview of the plan being configured (desktop rail; stacks below on smaller screens). */
function WizardPreview({ step, basics }: { step: Step; basics: BasicsState }) {
  const tech = basics.technology.trim();
  const illustration =
    step === 1 ? <CompassIllustration /> : step === 2 ? <ChatIllustration /> : <RocketIllustration />;
  const days = basics.dateMode === "days" ? basics.daysUntilInterview : null;
  return (
    <aside aria-label="Plan preview" className="hidden xl:block">
      <div className="sticky top-8 flex flex-col gap-5">
        <div className="overflow-hidden rounded-3xl border border-border bg-surface shadow-card">
          <TechCover technology={tech || "PrepPilot"} rounded="rounded-none" className="h-40">
            <div className="flex h-full items-end justify-end p-4">
              {days !== null && (
                <span className="rounded-full bg-black/40 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                  {days} {days === 1 ? "day" : "days"}
                </span>
              )}
            </div>
          </TechCover>
          <div className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Live preview</p>
            <p className="mt-1 text-lg font-semibold leading-snug">
              {tech ? `${tech} interview plan` : "Your interview plan"}
            </p>
            <p className="mt-0.5 text-sm text-fg-muted">{basics.targetRole.trim() || "Target role"}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-surface-muted p-3">
                <dt className="text-xs text-fg-subtle">Study / day</dt>
                <dd className="font-semibold">{basics.hoursPerDay}h</dd>
              </div>
              <div className="rounded-xl bg-surface-muted p-3">
                <dt className="text-xs text-fg-subtle">Level</dt>
                <dd className="font-semibold">{LEVEL_LABELS[basics.currentLevel]}</dd>
              </div>
              <div className="col-span-2 rounded-xl bg-surface-muted p-3">
                <dt className="text-xs text-fg-subtle">Formats</dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  {basics.interviewTypes.length === 0 ? (
                    <span className="text-fg-subtle">None yet</span>
                  ) : (
                    basics.interviewTypes.map((t) => (
                      <Badge key={t} tone="primary">
                        {INTERVIEW_TYPE_LABELS[t]}
                      </Badge>
                    ))
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>
        <div className="mx-auto w-full max-w-[240px] opacity-90">{illustration}</div>
      </div>
    </aside>
  );
}
