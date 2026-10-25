import type { PlanStatus, TopicStatus, Difficulty } from "@preppilot/shared";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

export function PlanStatusBadge({ status }: { status: PlanStatus }) {
  if (status === "generating")
    return (
      <Badge tone="primary">
        <Spinner size="sm" className="size-3 border-[1.5px]" /> Generating
      </Badge>
    );
  if (status === "failed") return <Badge tone="danger">Failed</Badge>;
  return <Badge tone="success">Ready</Badge>;
}

export function daysRemainingTone(days: number): BadgeTone {
  if (days < 0) return "neutral";
  if (days <= 2) return "danger";
  if (days <= 7) return "warning";
  return "primary";
}

const difficultyTone: Record<Difficulty, BadgeTone> = { easy: "success", medium: "warning", hard: "danger" };
const difficultyLabel: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return <Badge tone={difficultyTone[difficulty]}>{difficultyLabel[difficulty]}</Badge>;
}

export const TOPIC_STATUS_LABELS: Record<TopicStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};

const topicStatusTone: Record<TopicStatus, BadgeTone> = {
  not_started: "neutral",
  in_progress: "primary",
  completed: "success",
};

export function TopicStatusBadge({ status }: { status: TopicStatus }) {
  return <Badge tone={topicStatusTone[status]}>{TOPIC_STATUS_LABELS[status]}</Badge>;
}
