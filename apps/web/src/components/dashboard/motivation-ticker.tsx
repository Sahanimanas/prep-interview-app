"use client";

import { Sparkles } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const ROTATE_MS = 6000;

export const MOTIVATION_LINES = [
  "Small steps every day beat cramming the night before.",
  "Every topic you finish is one less surprise in the interview room.",
  "Explain it out loud — if you can teach it, you know it.",
  "Confidence comes from preparation, and you're preparing.",
  "Mistakes in practice are free. Make them here, not there.",
  "Interviewers hire problem solvers, not perfect memories.",
  "One focused hour today is worth more than three distracted ones.",
  "Progress, not perfection. Show up and do today's mission.",
  "The best answers start with a clear question back. Practise both.",
  "You've got this — the work you put in now compounds.",
];

/** One motivational line at a time, cycling every few seconds; pauses while hovered. */
export function MotivationTicker({ lead }: { lead?: string }) {
  const lines = lead ? [lead, ...MOTIVATION_LINES] : MOTIVATION_LINES;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % lines.length), ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused, lines.length]);

  const line = lines[index % lines.length];

  return (
    <div
      className="mt-2 flex min-h-6 items-center gap-2 text-white/90"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <Sparkles className="size-4 shrink-0 text-amber-200" aria-hidden />
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={line}
            className="truncate text-sm sm:text-[15px]"
            title={line}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            {line}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
