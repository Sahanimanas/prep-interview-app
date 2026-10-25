"use client";

const BRAND_COLORS = ["#4f46e5", "#818cf8", "#a855f7", "#ec4899", "#06b6d4", "#10b981", "#fbbf24"];

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Fire a burst of confetti (lazy-loads canvas-confetti; no-op for reduced-motion users). */
export async function celebrate(intensity: "small" | "big" = "big"): Promise<void> {
  if (typeof window === "undefined" || prefersReducedMotion()) return;
  const { default: confetti } = await import("canvas-confetti");
  const base = { colors: BRAND_COLORS, disableForReducedMotion: true, zIndex: 9999 };
  if (intensity === "small") {
    void confetti({ ...base, particleCount: 70, spread: 70, origin: { y: 0.7 } });
    return;
  }
  void confetti({ ...base, particleCount: 120, spread: 90, startVelocity: 45, origin: { y: 0.65 } });
  window.setTimeout(() => {
    void confetti({ ...base, particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.75 } });
    void confetti({ ...base, particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.75 } });
  }, 220);
}
