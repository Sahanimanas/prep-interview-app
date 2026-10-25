"use client";

import type { QuizAttemptResult, QuizDetail, QuizQuestion, QuizQuestionResult } from "@preppilot/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, CircleCheck, CircleX, Clock, RotateCcw, Send } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { ApiErrorCallout } from "@/components/app/api-error-callout";
import { TargetIllustration, TrophyIllustration } from "@/components/illustrations";
import { Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { celebrate } from "@/lib/celebrate";
import { cn } from "@/lib/cn";
import { queryKeys } from "@/lib/query-keys";

const LETTERS = "ABCDEFGHIJ";
const PASS_CONFETTI = 80;

type Mode = { kind: "taking" } | { kind: "results"; attempt: QuizAttemptResult; fresh: boolean };

interface QuizRunnerProps {
  quiz: QuizDetail;
  /** Topic whose cached detail embeds this quiz (refreshed after an attempt). */
  topicId?: string | null;
}

export function QuizRunner({ quiz, topicId }: QuizRunnerProps) {
  const queryClient = useQueryClient();
  const questions = useMemo(() => [...quiz.questions].sort((a, b) => a.orderIndex - b.orderIndex), [quiz.questions]);
  const [answers, setAnswers] = useState<number[]>(() => questions.map(() => -1));
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [mode, setMode] = useState<Mode>({ kind: "taking" });
  const [confirmSkip, setConfirmSkip] = useState(false);

  const submit = useMutation({
    mutationFn: () => api.submitQuizAttempt(quiz.id, { answers }),
    onSuccess: (attempt) => {
      setMode({ kind: "results", attempt, fresh: true });
      setConfirmSkip(false);
      if (attempt.percentage >= PASS_CONFETTI) void celebrate("big");
      void queryClient.invalidateQueries({ queryKey: queryKeys.quiz(quiz.id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.quizzes(quiz.planId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.plan(quiz.planId) });
      if (topicId) void queryClient.invalidateQueries({ queryKey: queryKeys.topic(topicId) });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  });

  const answeredCount = answers.filter((a) => a >= 0).length;
  const unanswered = questions.length - answeredCount;
  const isLast = current === questions.length - 1;
  const question = questions[current];

  function goTo(index: number) {
    if (index < 0 || index >= questions.length || index === current) return;
    setDirection(index > current ? 1 : -1);
    setCurrent(index);
  }

  function select(option: number) {
    setAnswers((prev) => prev.map((value, i) => (i === current ? (value === option ? -1 : option) : value)));
    setConfirmSkip(false);
  }

  function onSubmit() {
    if (unanswered > 0 && !confirmSkip) {
      setConfirmSkip(true);
      return;
    }
    submit.mutate();
  }

  function retake() {
    setAnswers(questions.map(() => -1));
    setCurrent(0);
    setDirection(1);
    setMode({ kind: "taking" });
    setConfirmSkip(false);
    submit.reset();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Keyboard: A–D / 1–4 pick an option, ←/→ move between questions.
  useEffect(() => {
    if (mode.kind !== "taking") return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const q = questions[current];
      if (!q) return;
      const key = e.key.toUpperCase();
      const letterIndex = LETTERS.indexOf(key);
      const numberIndex = /^[1-9]$/.test(key) ? Number(key) - 1 : -1;
      const pickIndex = letterIndex >= 0 ? letterIndex : numberIndex;
      if (pickIndex >= 0 && pickIndex < q.options.length) {
        e.preventDefault();
        setAnswers((prev) => prev.map((value, i) => (i === current ? (value === pickIndex ? -1 : pickIndex) : value)));
      } else if (e.key === "ArrowRight" && current < questions.length - 1) {
        setDirection(1);
        setCurrent((c) => c + 1);
      } else if (e.key === "ArrowLeft" && current > 0) {
        setDirection(-1);
        setCurrent((c) => c - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode.kind, current, questions]);

  if (mode.kind === "results") {
    return <QuizResults questions={questions} attempt={mode.attempt} onRetake={retake} />;
  }
  if (!question) return null;
  const selected = answers[current] ?? -1;

  return (
    <div className="flex flex-col gap-5">
      {quiz.lastAttempt && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-muted/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm text-fg-muted">
            <Clock className="size-4 shrink-0" aria-hidden />
            Last attempt: {quiz.lastAttempt.score}/{quiz.lastAttempt.total} ({Math.round(quiz.lastAttempt.percentage)}%)
            {quiz.bestPercentage !== null && ` · Best ${Math.round(quiz.bestPercentage)}%`}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => quiz.lastAttempt && setMode({ kind: "results", attempt: quiz.lastAttempt, fresh: false })}
          >
            Review last results
          </Button>
        </div>
      )}

      {/* Progress dots */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">
            Question {current + 1} <span className="font-normal text-fg-subtle">of {questions.length}</span>
          </span>
          <span className="text-fg-subtle">{answeredCount} answered</span>
        </div>
        <ol className="flex gap-1.5" aria-label="Questions">
          {questions.map((q, i) => (
            <li key={q.id} className="flex-1">
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Question ${i + 1}${answers[i] !== undefined && answers[i] >= 0 ? " (answered)" : ""}`}
                aria-current={i === current ? "step" : undefined}
                className={cn(
                  "block h-2 w-full rounded-full transition-all",
                  i === current
                    ? "bg-primary"
                    : answers[i] !== undefined && answers[i] >= 0
                      ? "bg-primary/45 hover:bg-primary/60"
                      : "bg-surface-muted hover:bg-border-strong",
                )}
              />
            </li>
          ))}
        </ol>
      </div>

      {/* Question card */}
      <div className="relative">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={question.id}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <QuestionCard question={question} index={current} selected={selected} disabled={submit.isPending} onSelect={select} />
          </motion.div>
        </AnimatePresence>
      </div>

      {submit.isError && <ApiErrorCallout error={submit.error} title="Couldn't submit your answers" />}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={() => goTo(current - 1)} disabled={current === 0} leftIcon={<ArrowLeft className="size-4" aria-hidden />}>
          Previous
        </Button>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {confirmSkip && unanswered > 0 && (
            <p className="text-sm text-warning-soft-fg" role="status">
              {unanswered} unanswered {unanswered === 1 ? "question counts" : "questions count"} as skipped.
            </p>
          )}
          {isLast ? (
            <Button size="lg" onClick={onSubmit} loading={submit.isPending} leftIcon={<Send className="size-4" aria-hidden />}>
              {confirmSkip && unanswered > 0 ? "Submit anyway" : "Submit answers"}
            </Button>
          ) : (
            <>
              {answeredCount === questions.length && (
                <Button variant="outline" onClick={onSubmit} loading={submit.isPending} leftIcon={<Send className="size-4" aria-hidden />}>
                  Submit now
                </Button>
              )}
              <Button size="lg" onClick={() => goTo(current + 1)} rightIcon={<ArrowRight className="size-4" aria-hidden />}>
                {selected >= 0 ? "Next question" : "Skip for now"}
              </Button>
            </>
          )}
        </div>
      </div>
      <p className="hidden text-center text-xs text-fg-subtle sm:block">Tip: press A–D to answer, ← → to move between questions.</p>
    </div>
  );
}

function QuestionCard({
  question,
  index,
  selected,
  disabled,
  onSelect,
}: {
  question: QuizQuestion;
  index: number;
  selected: number;
  disabled: boolean;
  onSelect: (option: number) => void;
}) {
  const labelId = `quiz-q-${question.id}`;
  return (
    <Card className="overflow-hidden">
      <div aria-hidden className="h-1.5 bg-linear-to-r from-primary via-accent to-accent-3" />
      <CardContent className="flex flex-col gap-6 sm:p-8">
        <p id={labelId} className="text-lg font-semibold leading-relaxed sm:text-xl">
          <span className="mr-2 text-primary">Q{index + 1}.</span>
          {question.prompt}
        </p>
        <div role="radiogroup" aria-labelledby={labelId} className="grid gap-3">
          {question.options.map((option, i) => {
            const isSelected = selected === i;
            return (
              <motion.button
                key={i}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={disabled}
                onClick={() => onSelect(i)}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.98 }}
                animate={isSelected ? { scale: [1, 1.02, 1] } : { scale: 1 }}
                transition={{ duration: 0.25 }}
                className={cn(
                  "relative flex w-full items-start gap-3.5 overflow-hidden rounded-2xl border-2 px-4 py-3.5 text-left text-sm transition-colors disabled:opacity-60 sm:text-base",
                  isSelected
                    ? "border-primary bg-primary-soft text-fg shadow-glow"
                    : "border-border hover:border-primary/40 hover:bg-surface-muted",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-colors",
                    isSelected ? "bg-primary text-primary-fg" : "bg-surface-muted text-fg-muted",
                  )}
                >
                  {isSelected ? <Check className="size-4" strokeWidth={3} aria-hidden /> : LETTERS[i]}
                </span>
                <span className="min-w-0 pt-1 wrap-break-word">{option}</span>
              </motion.button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function QuizResults({
  questions,
  attempt,
  onRetake,
}: {
  questions: QuizQuestion[];
  attempt: QuizAttemptResult;
  onRetake: () => void;
}) {
  const byId = new Map<string, QuizQuestionResult>(attempt.results.map((r) => [r.questionId, r]));
  const pct = Math.round(attempt.percentage);
  const tone = pct >= 80 ? "success" : pct >= 50 ? "warning" : "danger";
  const headline = pct >= 80 ? "Outstanding!" : pct >= 50 ? "Solid progress" : "Keep practising";

  return (
    <div className="flex flex-col gap-6" aria-live="polite">
      <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.45 }}>
        <Card className="overflow-hidden">
          <div className="pp-mesh grid items-center gap-6 p-6 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:p-8">
            <ProgressRing value={pct} size={128} stroke={12} label={`Score ${pct}%`} tone={tone}>
              <span className="text-3xl font-bold tabular-nums">{pct}%</span>
              <span className="text-xs text-fg-subtle">
                {attempt.score}/{attempt.total}
              </span>
            </ProgressRing>
            <div className="min-w-0">
              <h2 className="text-2xl font-bold tracking-tight">{headline}</h2>
              <p className="mt-1.5 text-fg-muted">
                You got {attempt.score} out of {attempt.total} right. Review the explanations below, then retake to lock it in.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="success">
                  <CircleCheck className="size-3.5" aria-hidden /> {attempt.results.filter((r) => r.correct).length} correct
                </Badge>
                <Badge tone="danger">
                  <CircleX className="size-3.5" aria-hidden /> {attempt.results.filter((r) => !r.correct && r.selectedIndex >= 0).length} incorrect
                </Badge>
                {attempt.results.some((r) => r.selectedIndex < 0) && (
                  <Badge tone="warning">{attempt.results.filter((r) => r.selectedIndex < 0).length} skipped</Badge>
                )}
              </div>
              <Button className="mt-5" onClick={onRetake} leftIcon={<RotateCcw className="size-4" aria-hidden />}>
                Retake quiz
              </Button>
            </div>
            <div className="hidden w-40 sm:block">{pct >= 80 ? <TrophyIllustration /> : <TargetIllustration />}</div>
          </div>
        </Card>
      </motion.div>

      <Stagger as="ol" className="flex flex-col gap-4">
        {questions.map((q, index) => {
          const r = byId.get(q.id);
          const skipped = !r || r.selectedIndex < 0;
          return (
            <StaggerItem as="li" key={q.id}>
              <Card
                className={cn(
                  "overflow-hidden border-l-4",
                  r?.correct ? "border-l-success" : skipped ? "border-l-warning" : "border-l-danger",
                )}
              >
                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold leading-relaxed">
                      <span className="mr-2 text-fg-subtle">{index + 1}.</span>
                      {q.prompt}
                    </p>
                    {r?.correct ? (
                      <Badge tone="success" className="shrink-0">
                        <CircleCheck className="size-3.5" aria-hidden /> Correct
                      </Badge>
                    ) : skipped ? (
                      <Badge tone="warning" className="shrink-0">
                        Skipped
                      </Badge>
                    ) : (
                      <Badge tone="danger" className="shrink-0">
                        <CircleX className="size-3.5" aria-hidden /> Incorrect
                      </Badge>
                    )}
                  </div>
                  <ul className="grid gap-2">
                    {q.options.map((option, i) => {
                      const isCorrect = r?.correctIndex === i;
                      const isSelected = r?.selectedIndex === i;
                      return (
                        <li
                          key={i}
                          className={cn(
                            "flex items-start gap-3 rounded-xl border px-3.5 py-2.5 text-sm",
                            isCorrect && "border-success/50 bg-success-soft",
                            isSelected && !isCorrect && "border-danger/50 bg-danger-soft",
                            !isCorrect && !isSelected && "border-border text-fg-muted",
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-6 shrink-0 items-center justify-center rounded-lg text-xs font-semibold",
                              isCorrect
                                ? "bg-success text-white dark:text-bg"
                                : isSelected
                                  ? "bg-danger text-white dark:text-bg"
                                  : "bg-surface-muted",
                            )}
                          >
                            {isCorrect ? <Check className="size-3.5" aria-hidden /> : isSelected ? <CircleX className="size-3.5" aria-hidden /> : LETTERS[i]}
                          </span>
                          <span className="min-w-0 flex-1 pt-0.5 wrap-break-word">
                            {option}
                            {isCorrect && <span className="sr-only"> (correct answer)</span>}
                            {isSelected && <span className="sr-only"> (your answer)</span>}
                          </span>
                          {isSelected && (
                            <span className="shrink-0 pt-0.5 text-xs font-medium text-fg-subtle" aria-hidden>
                              Your answer
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {r?.explanation && (
                    <div className="rounded-xl bg-surface-muted px-4 py-3 text-sm leading-relaxed">
                      <span className="font-semibold">Why: </span>
                      {r.explanation}
                    </div>
                  )}
                </CardContent>
              </Card>
            </StaggerItem>
          );
        })}
      </Stagger>

      <div className="flex justify-end">
        <Button onClick={onRetake} variant="outline" leftIcon={<RotateCcw className="size-4" aria-hidden />}>
          Retake quiz
        </Button>
      </div>
    </div>
  );
}
