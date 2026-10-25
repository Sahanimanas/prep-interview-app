"use client";

import type { Achievement, PlanProgressSummary } from "@preppilot/shared";
import { Brain, Crown, Flag, Footprints, ListChecks, Lock, Mic, Mountain } from "lucide-react";
import { motion } from "motion/react";
import type { ComponentType, SVGProps } from "react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";

const ACHIEVEMENT_ICONS: Record<Achievement["id"], ComponentType<SVGProps<SVGSVGElement>>> = {
  first_step: Footprints,
  halfway: Mountain,
  finisher: Flag,
  quiz_taker: ListChecks,
  quiz_whiz: Brain,
  first_mock: Mic,
  interview_ready: Crown,
};

const ACHIEVEMENT_COLORS: Record<Achievement["id"], string> = {
  first_step: "from-emerald-400 to-cyan-500",
  halfway: "from-sky-400 to-indigo-500",
  finisher: "from-indigo-500 to-violet-600",
  quiz_taker: "from-amber-400 to-orange-500",
  quiz_whiz: "from-fuchsia-500 to-pink-500",
  first_mock: "from-cyan-400 to-blue-600",
  interview_ready: "from-yellow-400 to-amber-600",
};

/** Level badge + animated XP bar, driven by the shared computePlanProgress(). */
export function LevelCard({ progress, compact = false }: { progress: PlanProgressSummary; compact?: boolean }) {
  const pct = (progress.levelXp / progress.levelXpTarget) * 100;
  return (
    <div className="flex items-center gap-4">
      <motion.div
        initial={{ scale: 0.6, rotate: -20, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 16 }}
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-primary via-accent to-accent-3 font-bold text-white shadow-glow",
          compact ? "size-11 text-base" : "size-14 text-xl",
        )}
        aria-label={`Level ${progress.level}`}
      >
        <span className="absolute inset-0.5 rounded-[14px] bg-white/10" aria-hidden />
        <span className="relative">{progress.level}</span>
      </motion.div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold">Level {progress.level}</p>
          <p className="text-xs tabular-nums text-fg-subtle">
            {progress.levelXp}/{progress.levelXpTarget} XP
          </p>
        </div>
        <Progress value={pct} tone="gradient" label="XP to next level" className="mt-2" />
        {!compact && <p className="mt-1.5 text-xs text-fg-subtle">{progress.xp.toLocaleString()} XP earned on this plan</p>}
      </div>
    </div>
  );
}

/** Achievement badges with locked/unlocked states and hover/focus tooltips. */
export function AchievementGrid({ achievements }: { achievements: Achievement[] }) {
  const unlocked = achievements.filter((a) => a.unlocked).length;
  return (
    <div>
      <p className="mb-3 text-xs text-fg-subtle">
        {unlocked} of {achievements.length} unlocked
      </p>
      <ul className="grid grid-cols-4 gap-2.5 sm:grid-cols-7 xl:grid-cols-4">
        {achievements.map((a, i) => {
          const Icon = ACHIEVEMENT_ICONS[a.id];
          return (
            <motion.li
              key={a.id}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 * i, type: "spring", stiffness: 300, damping: 18 }}
              className="group relative flex justify-center"
            >
              <span
                tabIndex={0}
                aria-label={`${a.title}: ${a.description}${a.unlocked ? " (unlocked)" : " (locked)"}`}
                className={cn(
                  "relative flex size-12 items-center justify-center rounded-2xl outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring group-hover:scale-110",
                  a.unlocked
                    ? cn("bg-linear-to-br text-white shadow-md", ACHIEVEMENT_COLORS[a.id])
                    : "border border-dashed border-border-strong bg-surface-muted text-fg-subtle",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {!a.unlocked && (
                  <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border border-border bg-surface">
                    <Lock className="size-2.5" aria-hidden />
                  </span>
                )}
              </span>
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-40 -translate-x-1/2 animate-pop-in rounded-lg bg-slate-900 px-3 py-2 text-center text-xs text-white shadow-xl group-focus-within:block group-hover:block dark:bg-slate-100 dark:text-slate-900"
              >
                <span className="block font-semibold">{a.title}</span>
                <span className="mt-0.5 block opacity-80">{a.description}</span>
                <span className="mt-1 block text-[10px] uppercase tracking-wider opacity-70">
                  {a.unlocked ? "Unlocked" : "Locked"}
                </span>
              </span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
