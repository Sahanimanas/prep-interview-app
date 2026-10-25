import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { hashString, seededRandom, svgId } from "@/lib/seed";

const PALETTES = [
  ["#4f46e5", "#a855f7", "#f0abfc"],
  ["#7c3aed", "#db2777", "#fbcfe8"],
  ["#0891b2", "#4f46e5", "#a5f3fc"],
  ["#059669", "#0891b2", "#a7f3d0"],
  ["#d97706", "#db2777", "#fde68a"],
  ["#2563eb", "#06b6d4", "#bfdbfe"],
  ["#4338ca", "#0ea5e9", "#c7d2fe"],
  ["#be185d", "#7c3aed", "#f9a8d4"],
] as const;

type Pattern = "circles" | "grid" | "waves" | "triangles" | "rings" | "bars";
const PATTERNS: readonly Pattern[] = ["circles", "grid", "waves", "triangles", "rings", "bars"];

const W = 400;
const H = 200;

function PatternShapes({ pattern, rand, light }: { pattern: Pattern; rand: () => number; light: string }) {
  switch (pattern) {
    case "circles":
      return (
        <g fill={light}>
          {Array.from({ length: 7 }, (_, i) => (
            <circle key={i} cx={rand() * W} cy={rand() * H} r={14 + rand() * 60} opacity={0.12 + rand() * 0.18} />
          ))}
        </g>
      );
    case "rings":
      return (
        <g fill="none" stroke={light} strokeWidth={2}>
          {Array.from({ length: 6 }, (_, i) => (
            <circle key={i} cx={W * 0.78} cy={H * 0.3} r={24 + i * 26} opacity={0.42 - i * 0.055} />
          ))}
        </g>
      );
    case "grid":
      return (
        <g fill={light}>
          {Array.from({ length: 9 }, (_, x) =>
            Array.from({ length: 5 }, (_, y) => (
              <rect
                key={`${x}-${y}`}
                x={x * 46 + 8}
                y={y * 46 + 8}
                width={10}
                height={10}
                rx={3}
                opacity={rand() * 0.35}
              />
            )),
          )}
        </g>
      );
    case "waves":
      return (
        <g fill="none" stroke={light} strokeWidth={2.5} strokeLinecap="round">
          {Array.from({ length: 6 }, (_, i) => {
            const y = 30 + i * 30;
            const a = 10 + rand() * 18;
            return (
              <path
                key={i}
                d={`M-10 ${y} C 60 ${y - a}, 120 ${y + a}, 200 ${y} S 340 ${y - a}, 410 ${y}`}
                opacity={0.12 + i * 0.05}
              />
            );
          })}
        </g>
      );
    case "triangles":
      return (
        <g fill={light}>
          {Array.from({ length: 8 }, (_, i) => {
            const x = rand() * W;
            const y = rand() * H;
            const s = 18 + rand() * 46;
            return <path key={i} d={`M${x} ${y - s} L${x + s} ${y + s * 0.8} L${x - s} ${y + s * 0.8} Z`} opacity={0.1 + rand() * 0.2} />;
          })}
        </g>
      );
    case "bars":
      return (
        <g fill={light}>
          {Array.from({ length: 12 }, (_, i) => {
            const h = 30 + rand() * 120;
            return <rect key={i} x={i * 34 + 6} y={H - h} width={20} height={h} rx={10} opacity={0.1 + rand() * 0.16} />;
          })}
        </g>
      );
  }
}

interface CoverArtProps {
  /** Stable seed, e.g. a topic or plan id + title. */
  seed: string;
  className?: string;
  /** Overlay content (e.g. a TechLogo) centred or positioned by the caller. */
  children?: ReactNode;
  rounded?: string;
}

/** Deterministic generated cover art: gradient + geometric pattern derived from `seed`. */
export function CoverArt({ seed, className, children, rounded = "rounded-xl" }: CoverArtProps) {
  const reactId = useId();
  const hash = hashString(seed);
  const [from, to, light] = PALETTES[hash % PALETTES.length] ?? PALETTES[0];
  const pattern = PATTERNS[(hash >>> 3) % PATTERNS.length] ?? "circles";
  const rand = seededRandom(hash);
  const gradId = svgId(reactId, "g");
  const glowId = svgId(reactId, "glow");

  return (
    <div className={cn("relative isolate overflow-hidden", rounded, className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 -z-10 size-full"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={from} />
            <stop offset="1" stopColor={to} />
          </linearGradient>
          <radialGradient id={glowId} cx="0.15" cy="0.1" r="0.8">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill={`url(#${gradId})`} />
        <PatternShapes pattern={pattern} rand={rand} light={light} />
        <rect width={W} height={H} fill={`url(#${glowId})`} />
      </svg>
      {children}
    </div>
  );
}
