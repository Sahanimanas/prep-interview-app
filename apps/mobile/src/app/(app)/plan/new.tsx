import {
  CURRENT_LEVELS,
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_TYPES,
  intakeBasicsSchema,
  LIMITS,
  type ClarifyingAnswer,
  type ClarifyingQuestion,
  type CurrentLevel,
  type IntakeBasics,
  type InterviewType,
} from '@preppilot/shared';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';

import { ErrorCallout } from '@/components/ai-callouts';
import { AiWorking } from '@/components/ai-working';
import { CompassIllustration, RocketIllustration, SparklesIllustration } from '@/components/illustrations';
import {
  Button,
  Card,
  Chip,
  ChipGroup,
  Skeleton,
  SkeletonCard,
  Stepper,
  Text,
  TextField,
  Screen,
} from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { getFieldErrors, hasErrorCode, issuesToFieldErrors } from '@/lib/errors';
import { capitalize } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { useCreatePlan } from '@/lib/queries';

type Step = 0 | 1 | 2;
const STEP_TITLES = ['The basics', 'A few questions', 'Review & generate'] as const;
const STEP_SUBTITLES = [
  'What are you preparing for, and how much time do you have?',
  'Your AI coach tailors the plan to your answers.',
  'Check the details, then launch your plan.',
] as const;

const TECH_SUGGESTIONS = ['Node.js', 'React', 'Python', 'Java', 'Go', 'TypeScript', 'System design', 'DSA'];
const ROLE_SUGGESTIONS = ['Backend engineer', 'Frontend engineer', 'Full-stack engineer', 'Senior engineer'];
const LEVEL_HINTS: Record<CurrentLevel, string> = {
  beginner: 'New to most of this',
  intermediate: 'Comfortable, some gaps',
  advanced: 'Strong, polishing up',
};

interface BasicsForm {
  technology: string;
  targetRole: string;
  yearsOfExperience: number;
  daysUntilInterview: number;
  hoursPerDay: number;
  currentLevel: CurrentLevel;
  interviewTypes: InterviewType[];
  company: string;
  focusAreas: string[];
  notes: string;
}

const INITIAL_FORM: BasicsForm = {
  technology: '',
  targetRole: '',
  yearsOfExperience: 2,
  daysUntilInterview: 7,
  hoursPerDay: 2,
  currentLevel: 'intermediate',
  interviewTypes: ['technical_concepts', 'coding'],
  company: '',
  focusAreas: [],
  notes: '',
};

type AnswerValue = string | string[];

function toInput(form: BasicsForm) {
  return {
    technology: form.technology,
    targetRole: form.targetRole,
    yearsOfExperience: form.yearsOfExperience,
    daysUntilInterview: form.daysUntilInterview,
    hoursPerDay: form.hoursPerDay,
    currentLevel: form.currentLevel,
    interviewTypes: form.interviewTypes,
    company: form.company.trim() || undefined,
    focusAreas: form.focusAreas,
    notes: form.notes.trim() || undefined,
  };
}

function buildClarifyingAnswers(
  questions: ClarifyingQuestion[],
  answers: Record<string, AnswerValue>,
): ClarifyingAnswer[] {
  return questions
    .map((q) => {
      const value = answers[q.id];
      const answer = Array.isArray(value) ? value.join(', ') : (value ?? '').trim();
      return { question: q.question, answer };
    })
    .filter((a) => a.answer.length > 0)
    .slice(0, LIMITS.maxClarifyingAnswers);
}

// ---------------------------------------------------------------------------

function StepHeader({ step }: { step: Step }) {
  const theme = useTheme();
  return (
    <View style={styles.stepHeader}>
      <View style={styles.stepBars}>
        {STEP_TITLES.map((title, i) => (
          <View
            key={title}
            style={[styles.stepBar, { backgroundColor: i <= step ? theme.primary : theme.surfaceMuted }]}
          />
        ))}
      </View>
      <View style={styles.stepTitleRow}>
        <View style={styles.stepTitleText}>
          <Text variant="overline" tone="primary">
            Step {step + 1} of 3
          </Text>
          <Text variant="title" accessibilityRole="header">
            {STEP_TITLES[step]}
          </Text>
          <Text variant="small" tone="textSecondary">
            {STEP_SUBTITLES[step]}
          </Text>
        </View>
        {step === 0 ? <CompassIllustration size={96} /> : step === 1 ? <SparklesIllustration size={80} /> : <RocketIllustration size={84} />}
      </View>
    </View>
  );
}

function FocusAreasInput({
  value,
  onChange,
  error,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
}) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const parts = draft
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && p.length <= 60);
    if (parts.length === 0) return;
    const next = [...value];
    for (const p of parts) {
      if (!next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p);
    }
    onChange(next.slice(0, LIMITS.maxFocusAreas));
    setDraft('');
  };
  const full = value.length >= LIMITS.maxFocusAreas;
  return (
    <View style={styles.field}>
      <TextField
        label="Focus areas (optional)"
        value={draft}
        onChangeText={setDraft}
        placeholder={full ? 'Maximum reached' : 'e.g. event loop, streams'}
        editable={!full}
        returnKeyType="done"
        submitBehavior="submit"
        onSubmitEditing={add}
        error={error}
        hint={`Press return to add Â· ${value.length}/${LIMITS.maxFocusAreas}`}
      />
      {value.length > 0 ? (
        <ChipGroup>
          {value.map((area) => (
            <Chip key={area} label={area} selected onRemove={() => onChange(value.filter((v) => v !== area))} />
          ))}
        </ChipGroup>
      ) : null}
    </View>
  );
}

function BasicsStep({
  form,
  setForm,
  errors,
}: {
  form: BasicsForm;
  setForm: (updater: (prev: BasicsForm) => BasicsForm) => void;
  errors: Record<string, string>;
}) {
  const set = <K extends keyof BasicsForm>(key: K, value: BasicsForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleType = (type: InterviewType) =>
    setForm((prev) => ({
      ...prev,
      interviewTypes: prev.interviewTypes.includes(type)
        ? prev.interviewTypes.filter((t) => t !== type)
        : [...prev.interviewTypes, type],
    }));

  return (
    <View style={styles.stepBody}>
      <View style={styles.field}>
        <TextField
          label="What are you preparing for?"
          value={form.technology}
          onChangeText={(v) => set('technology', v)}
          placeholder="e.g. Node.js"
          error={errors.technology}
          autoCapitalize="words"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestions}>
          {TECH_SUGGESTIONS.map((t) => (
            <Chip key={t} label={t} selected={form.technology === t} onPress={() => set('technology', t)} />
          ))}
        </ScrollView>
      </View>

      <View style={styles.field}>
        <TextField
          label="Target role"
          value={form.targetRole}
          onChangeText={(v) => set('targetRole', v)}
          placeholder="e.g. Senior backend engineer"
          error={errors.targetRole}
          autoCapitalize="sentences"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestions}>
          {ROLE_SUGGESTIONS.map((r) => (
            <Chip key={r} label={r} selected={form.targetRole === r} onPress={() => set('targetRole', r)} />
          ))}
        </ScrollView>
      </View>

      <Stepper
        label="Days until the interview"
        value={form.daysUntilInterview}
        onChange={(v) => set('daysUntilInterview', v)}
        min={LIMITS.minDays}
        max={LIMITS.maxDays}
        format={(v) => (v === 1 ? '1 day' : `${v} days`)}
        error={errors.daysUntilInterview}
      />
      <Stepper
        label="Study time per day"
        value={form.hoursPerDay}
        onChange={(v) => set('hoursPerDay', v)}
        min={0.5}
        max={LIMITS.maxHoursPerDay}
        step={0.5}
        format={(v) => (v === 1 ? '1 hour' : `${v} hours`)}
        error={errors.hoursPerDay}
      />
      <Stepper
        label="Years of experience"
        value={form.yearsOfExperience}
        onChange={(v) => set('yearsOfExperience', v)}
        min={0}
        max={LIMITS.maxYearsOfExperience}
        format={(v) => (v === 0 ? 'Less than a year' : v === 1 ? '1 year' : `${v} years`)}
        error={errors.yearsOfExperience}
      />

      <View style={styles.field}>
        <Text variant="smallStrong" tone="textSecondary">
          Your current level
        </Text>
        <View style={styles.levelRow}>
          {CURRENT_LEVELS.map((level) => (
            <LevelOption
              key={level}
              label={capitalize(level)}
              hint={LEVEL_HINTS[level]}
              selected={form.currentLevel === level}
              onPress={() => set('currentLevel', level)}
            />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text variant="smallStrong" tone="textSecondary">
          Interview rounds to expect
        </Text>
        <ChipGroup>
          {INTERVIEW_TYPES.map((type) => (
            <Chip
              key={type}
              label={INTERVIEW_TYPE_LABELS[type]}
              selected={form.interviewTypes.includes(type)}
              onPress={() => toggleType(type)}
            />
          ))}
        </ChipGroup>
        {errors.interviewTypes ? (
          <Text variant="caption" tone="danger">
            {errors.interviewTypes}
          </Text>
        ) : null}
      </View>

      <TextField
        label="Company (optional)"
        value={form.company}
        onChangeText={(v) => set('company', v)}
        placeholder="e.g. Stripe"
        error={errors.company}
        autoCapitalize="words"
      />

      <FocusAreasInput
        value={form.focusAreas}
        onChange={(v) => set('focusAreas', v)}
        error={errors.focusAreas ?? errors['focusAreas.0']}
      />

      <TextField
        label="Anything else? (optional)"
        value={form.notes}
        onChangeText={(v) => set('notes', v)}
        placeholder="Job description highlights, weak spots, what the recruiter told youâ€¦"
        error={errors.notes}
        multiline
        maxLength={1000}
      />
    </View>
  );
}

function LevelOption({
  label,
  hint,
  selected,
  onPress,
}: {
  label: string;
  hint: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Card
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      accessibilityLabel={`${label}: ${hint}`}
      style={[
        styles.levelCard,
        selected && { borderColor: theme.primary, backgroundColor: theme.primaryMuted, borderWidth: 1.5 },
      ]}>
      <Text variant="smallStrong" color={selected ? theme.primary : theme.text}>
        {label}
      </Text>
      <Text variant="caption" tone="textSecondary">
        {hint}
      </Text>
    </Card>
  );
}

function QuestionsSkeleton() {
  return (
    <View style={styles.stepBody}>
      <AiWorking
        compact
        title="Tailoring your questions"
        messages={['Reading your goalsâ€¦', 'Thinking about the roleâ€¦', 'Picking what matters mostâ€¦']}
      />
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.field}>
          <Skeleton width="80%" height={18} />
          <View style={styles.skeletonChips}>
            <Skeleton width={90} height={34} radius={Radius.pill} />
            <Skeleton width={120} height={34} radius={Radius.pill} />
            <Skeleton width={70} height={34} radius={Radius.pill} />
          </View>
        </View>
      ))}
      <SkeletonCard lines={1} />
    </View>
  );
}

function ClarifyingQuestionField({
  question,
  value,
  onChange,
}: {
  question: ClarifyingQuestion;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
}) {
  const header = (
    <View style={styles.questionHeader}>
      <Text variant="subheading">{question.question}</Text>
      {question.helperText ? (
        <Text variant="small" tone="textSecondary">
          {question.helperText}
        </Text>
      ) : null}
    </View>
  );

  if (question.type === 'text' || question.options.length === 0) {
    return (
      <View style={styles.field}>
        {header}
        <TextField
          value={typeof value === 'string' ? value : ''}
          onChangeText={onChange}
          placeholder="Your answer (optional)"
          multiline
          maxLength={1000}
        />
      </View>
    );
  }

  if (question.type === 'multi') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <View style={styles.field}>
        {header}
        <Text variant="caption" tone="textMuted">
          Pick any that apply
        </Text>
        <ChipGroup>
          {question.options.map((opt) => (
            <Chip
              key={opt}
              label={opt}
              selected={selected.includes(opt)}
              onPress={() =>
                onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt])
              }
            />
          ))}
        </ChipGroup>
      </View>
    );
  }

  const current = typeof value === 'string' ? value : '';
  return (
    <View style={styles.field}>
      {header}
      <ChipGroup>
        {question.options.map((opt) => (
          <Chip key={opt} label={opt} selected={current === opt} onPress={() => onChange(current === opt ? '' : opt)} />
        ))}
      </ChipGroup>
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text variant="small" tone="textSecondary" style={styles.reviewLabel}>
        {label}
      </Text>
      <Text variant="smallStrong" style={styles.reviewValue}>
        {value}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------

export default function NewPlanScreen() {
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<BasicsForm>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [basics, setBasics] = useState<IntakeBasics | null>(null);
  const [questionsKey, setQuestionsKey] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [skipped, setSkipped] = useState(false);

  const intake = useMutation({
    mutationFn: (input: IntakeBasics) => api.getIntakeQuestions(input),
  });
  const createPlan = useCreatePlan();

  const questions = intake.data?.questions ?? [];

  const fetchQuestions = (input: IntakeBasics) => {
    const key = JSON.stringify(input);
    if (key === questionsKey && (intake.isPending || intake.isSuccess)) return;
    setQuestionsKey(key);
    setAnswers({});
    setSkipped(false);
    intake.mutate(input);
  };

  const goToQuestions = () => {
    const parsed = intakeBasicsSchema.safeParse(toInput(form));
    if (!parsed.success) {
      setErrors(issuesToFieldErrors(parsed.error.issues));
      haptics.error();
      return;
    }
    setErrors({});
    setBasics(parsed.data);
    setStep(1);
    fetchQuestions(parsed.data);
  };

  const skipQuestions = () => {
    setSkipped(true);
    setStep(2);
  };

  const generate = () => {
    if (!basics) return;
    const clarifyingAnswers = skipped ? [] : buildClarifyingAnswers(questions, answers);
    createPlan.mutate(
      { ...basics, clarifyingAnswers },
      {
        onSuccess: (detail) => {
          haptics.success();
          router.replace({ pathname: '/plan/[planId]', params: { planId: detail.plan.id } });
        },
        onError: (e) => {
          haptics.error();
          if (hasErrorCode(e, 'VALIDATION_ERROR')) {
            const fieldErrors = getFieldErrors(e);
            const basicsKeys = Object.keys(fieldErrors).filter((k) => !k.startsWith('clarifyingAnswers'));
            if (basicsKeys.length > 0) {
              setErrors(fieldErrors);
              setStep(0);
            }
          }
        },
      },
    );
  };

  const answeredCount = skipped ? 0 : buildClarifyingAnswers(questions, answers).length;

  let content: ReactNode;
  let footer: ReactNode;

  if (step === 0) {
    content = <BasicsStep form={form} setForm={setForm} errors={errors} />;
    footer = <Button title="Continue" icon="arrowRight" iconPosition="right" size="lg" fullWidth onPress={goToQuestions} />;
  } else if (step === 1) {
    content = intake.isPending ? (
      <QuestionsSkeleton />
    ) : intake.isError ? (
      <View style={styles.stepBody}>
        <ErrorCallout
          error={intake.error}
          title="Couldn't load questions"
          onRetry={() => basics && intake.mutate(basics)}
        />
        <Text variant="small" tone="textSecondary">
          You can also skip this step â€” your plan will be generated from the basics alone.
        </Text>
      </View>
    ) : (
      <Animated.View entering={FadeIn.duration(250)} style={styles.stepBody}>
        <Text tone="textSecondary">
          Answer what you can â€” every answer makes your plan sharper. All questions are optional.
        </Text>
        {questions.map((q) => (
          <ClarifyingQuestionField
            key={q.id}
            question={q}
            value={answers[q.id]}
            onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
          />
        ))}
      </Animated.View>
    );
    footer = (
      <View style={styles.footerRow}>
        <Button title="Back" variant="outline" onPress={() => setStep(0)} style={styles.footerBack} />
        {intake.isSuccess ? (
          <Button title="Review" icon="arrowRight" iconPosition="right" onPress={() => setStep(2)} style={styles.footerMain} />
        ) : (
          <Button title="Skip questions" variant="secondary" onPress={skipQuestions} style={styles.footerMain} />
        )}
      </View>
    );
  } else {
    const b = basics;
    content = b ? (
      <Animated.View entering={FadeInRight.duration(250)} style={styles.stepBody}>
        <Card style={styles.reviewCard}>
          <ReviewRow label="Preparing for" value={b.technology} />
          <ReviewRow label="Role" value={b.targetRole} />
          <ReviewRow label="Interview in" value={`${b.daysUntilInterview} day${b.daysUntilInterview === 1 ? '' : 's'}`} />
          <ReviewRow label="Daily time" value={`${b.hoursPerDay} h/day`} />
          <ReviewRow label="Experience" value={`${b.yearsOfExperience} yrs Â· ${capitalize(b.currentLevel)}`} />
          <ReviewRow label="Rounds" value={b.interviewTypes.map((t) => INTERVIEW_TYPE_LABELS[t]).join(', ')} />
          {b.company ? <ReviewRow label="Company" value={b.company} /> : null}
          {b.focusAreas.length > 0 ? <ReviewRow label="Focus" value={b.focusAreas.join(', ')} /> : null}
          <ReviewRow
            label="Clarifying answers"
            value={skipped ? 'Skipped' : `${answeredCount} of ${questions.length}`}
          />
        </Card>
        <Text variant="small" tone="textSecondary">
          Generation takes about a minute. You can leave the screen â€” we'll keep working in the background.
        </Text>
        <ErrorCallout error={createPlan.error} title="Couldn't start generation" />
      </Animated.View>
    ) : null;
    footer = (
      <View style={styles.footerRow}>
        <Button title="Back" variant="outline" onPress={() => setStep(1)} style={styles.footerBack} disabled={createPlan.isPending} />
        <Button
          title="Generate my plan"
          icon="sparkles"
          onPress={generate}
          loading={createPlan.isPending}
          style={styles.footerMain}
        />
      </View>
    );
  }

  return (
    <Screen keyboard backdrop footer={footer}>
      <StepHeader step={step} />
      {content}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stepHeader: {
    gap: Spacing.one,
    marginBottom: Spacing.four,
  },
  stepBars: {
    flexDirection: 'row',
    gap: Spacing.one + 2,
    marginBottom: Spacing.two,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  stepTitleText: {
    flex: 1,
    gap: Spacing.one,
  },
  stepBar: {
    flex: 1,
    height: 6,
    borderRadius: Radius.pill,
  },
  stepBody: {
    gap: Spacing.four,
  },
  field: {
    gap: Spacing.two,
  },
  suggestions: {
    gap: Spacing.two,
  },
  levelRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  levelCard: {
    flex: 1,
    padding: Spacing.three - 4,
    gap: Spacing.half,
  },
  questionHeader: {
    gap: Spacing.half,
  },
  skeletonChips: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  reviewCard: {
    gap: Spacing.three - 4,
  },
  reviewRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  reviewLabel: {
    width: 120,
  },
  reviewValue: {
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  footerBack: {
    flex: 1,
  },
  footerMain: {
    flex: 2,
  },
});
