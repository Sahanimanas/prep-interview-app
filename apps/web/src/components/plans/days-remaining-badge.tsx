import { Badge } from "@/components/ui/badge";
import { daysRemainingTone } from "./plan-status";

export function DaysRemainingBadge({ days, label }: { days: number; label: string }) {
  return <Badge tone={daysRemainingTone(days)}>{label}</Badge>;
}
