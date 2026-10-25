import { useId } from "react";
import { cn } from "@/lib/cn";
import { svgId } from "@/lib/seed";

/**
 * Hand-crafted, theme-friendly SVG illustrations (no external images). Each uses useId-based
 * gradient ids so multiple instances on a page never collide.
 */

interface IllustrationProps {
  className?: string;
  /** Accessible description; omit for decorative use. */
  title?: string;
}

function useIds<const K extends readonly string[]>(keys: K): Record<K[number], string> {
  const id = useId();
  return Object.fromEntries(keys.map((k) => [k, svgId(id, k)])) as Record<K[number], string>;
}

function a11y(title?: string) {
  return title ? { role: "img" as const, "aria-label": title } : { "aria-hidden": true as const };
}

const INDIGO = "#4f46e5";
const INDIGO_L = "#818cf8";
const VIOLET = "#a855f7";
const PINK = "#ec4899";
const CYAN = "#22d3ee";
const AMBER = "#fbbf24";
const EMERALD = "#34d399";

function Sparkle({ x, y, s = 1, fill = AMBER, className }: { x: number; y: number; s?: number; fill?: string; className?: string }) {
  return (
    <path
      className={className}
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 -8 C1 -2 2 -1 8 0 C2 1 1 2 0 8 C-1 2 -2 1 -8 0 C-2 -1 -1 -2 0 -8Z"
      fill={fill}
    />
  );
}

/** Hero: a rocket launching over a planet, with orbit and stars. */
export function RocketIllustration({ className, title }: IllustrationProps) {
  const ids = useIds(["bg", "body", "flame", "planet", "window", "trail"] as const);
  return (
    <svg viewBox="0 0 320 300" className={cn("h-auto w-full", className)} {...a11y(title)}>
      <defs>
        <radialGradient id={ids.bg} cx="0.5" cy="0.45" r="0.55">
          <stop offset="0" stopColor={INDIGO_L} stopOpacity="0.45" />
          <stop offset="0.6" stopColor={VIOLET} stopOpacity="0.15" />
          <stop offset="1" stopColor={VIOLET} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={ids.body} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dfe3ff" />
        </linearGradient>
        <linearGradient id={ids.flame} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={AMBER} />
          <stop offset="0.55" stopColor="#f97316" />
          <stop offset="1" stopColor={PINK} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={ids.planet} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={INDIGO} />
          <stop offset="1" stopColor={VIOLET} />
        </linearGradient>
        <linearGradient id={ids.window} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={CYAN} />
          <stop offset="1" stopColor={INDIGO} />
        </linearGradient>
        <linearGradient id={ids.trail} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={INDIGO_L} stopOpacity="0.5" />
          <stop offset="1" stopColor={INDIGO_L} stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="160" cy="140" r="150" fill={`url(#${ids.bg})`} />
      {/* orbit */}
      <ellipse cx="160" cy="232" rx="140" ry="34" fill="none" stroke={INDIGO_L} strokeOpacity="0.35" strokeWidth="2" strokeDasharray="4 8" />
      {/* planet */}
      <circle cx="78" cy="226" r="40" fill={`url(#${ids.planet})`} />
      <path d="M44 214c18 8 50 10 70 2" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M50 238c14 6 36 8 52 2" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="4" strokeLinecap="round" fill="none" />
      <ellipse cx="78" cy="226" rx="62" ry="12" fill="none" stroke={AMBER} strokeOpacity="0.8" strokeWidth="3" transform="rotate(-14 78 226)" />
      {/* moon */}
      <circle cx="262" cy="70" r="16" fill={CYAN} opacity="0.85" />
      <circle cx="257" cy="66" r="4" fill="#ffffff" opacity="0.4" />
      {/* trail */}
      <path d="M150 270 C 160 230, 170 210, 190 190 L 214 214 C 196 232, 178 248, 150 270Z" fill={`url(#${ids.trail})`} />
      {/* rocket (rotated) */}
      <g transform="translate(206 118) rotate(40)">
        <path d="M0 -78 C 26 -54 30 -10 22 30 L -22 30 C -30 -10 -26 -54 0 -78Z" fill={`url(#${ids.body})`} stroke={INDIGO} strokeWidth="3" />
        <path d="M0 -78 C 12 -67 19 -54 22 -40 L -22 -40 C -19 -54 -12 -67 0 -78Z" fill={PINK} />
        <circle cx="0" cy="-14" r="13" fill={`url(#${ids.window})`} stroke={INDIGO} strokeWidth="3" />
        <circle cx="-4" cy="-18" r="4" fill="#ffffff" opacity="0.7" />
        <path d="M-22 6 L-42 34 L-20 30Z" fill={VIOLET} stroke={INDIGO} strokeWidth="3" strokeLinejoin="round" />
        <path d="M22 6 L42 34 L20 30Z" fill={VIOLET} stroke={INDIGO} strokeWidth="3" strokeLinejoin="round" />
        <rect x="-10" y="30" width="20" height="8" rx="3" fill={INDIGO} />
        <path className="origin-top animate-pulse" d="M-11 38 C -9 62 -3 76 0 88 C 3 76 9 62 11 38Z" fill={`url(#${ids.flame})`} />
      </g>
      {/* stars */}
      <Sparkle x={58} y={58} s={1.3} />
      <Sparkle x={112} y={30} s={0.8} fill={CYAN} />
      <Sparkle x={288} y={150} s={1} fill={PINK} />
      <Sparkle x={250} y={250} s={0.7} />
      <circle cx="30" cy="120" r="2.5" fill={INDIGO_L} />
      <circle cx="150" cy="70" r="2" fill={AMBER} />
      <circle cx="296" cy="100" r="2.5" fill={VIOLET} />
      <circle cx="220" cy="28" r="2" fill={INDIGO_L} />
    </svg>
  );
}

/** Empty states: stacked books with a glowing light bulb. */
export function BooksIllustration({ className, title }: IllustrationProps) {
  const ids = useIds(["glow", "bulb", "b1", "b2", "b3"] as const);
  return (
    <svg viewBox="0 0 240 200" className={cn("h-auto w-full", className)} {...a11y(title)}>
      <defs>
        <radialGradient id={ids.glow} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={AMBER} stopOpacity="0.55" />
          <stop offset="1" stopColor={AMBER} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={ids.bulb} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fef3c7" />
          <stop offset="1" stopColor={AMBER} />
        </linearGradient>
        <linearGradient id={ids.b1} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={INDIGO} />
          <stop offset="1" stopColor={INDIGO_L} />
        </linearGradient>
        <linearGradient id={ids.b2} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={VIOLET} />
          <stop offset="1" stopColor={PINK} />
        </linearGradient>
        <linearGradient id={ids.b3} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0891b2" />
          <stop offset="1" stopColor={CYAN} />
        </linearGradient>
      </defs>
      <ellipse cx="120" cy="182" rx="88" ry="10" fill={INDIGO_L} opacity="0.18" />
      <circle cx="152" cy="58" r="52" fill={`url(#${ids.glow})`} />
      {/* books */}
      <rect x="44" y="146" width="132" height="28" rx="6" fill={`url(#${ids.b1})`} />
      <rect x="52" y="152" width="116" height="4" rx="2" fill="#ffffff" opacity="0.35" />
      <rect x="58" y="120" width="116" height="26" rx="6" fill={`url(#${ids.b2})`} transform="rotate(-3 116 133)" />
      <rect x="66" y="126" width="100" height="4" rx="2" fill="#ffffff" opacity="0.35" transform="rotate(-3 116 133)" />
      <rect x="50" y="96" width="104" height="24" rx="6" fill={`url(#${ids.b3})`} transform="rotate(4 102 108)" />
      <rect x="58" y="102" width="88" height="4" rx="2" fill="#ffffff" opacity="0.35" transform="rotate(4 102 108)" />
      {/* open book on top */}
      <path d="M62 92 C 80 80, 100 80, 112 88 L 112 70 C 100 62, 80 62, 62 74Z" fill="#ffffff" stroke={INDIGO} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M162 92 C 144 80, 124 80, 112 88 L 112 70 C 124 62, 144 62, 162 74Z" fill="#eef0ff" stroke={INDIGO} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M72 78 L100 72 M74 84 L98 79 M124 72 L152 78 M126 79 L150 84" stroke={INDIGO_L} strokeWidth="2" strokeLinecap="round" />
      {/* bulb */}
      <g transform="translate(152 46)">
        <path d="M0 -26 C 15 -26 24 -15 24 -3 C 24 7 17 12 13 18 L -13 18 C -17 12 -24 7 -24 -3 C -24 -15 -15 -26 0 -26Z" fill={`url(#${ids.bulb})`} stroke="#b45309" strokeWidth="2.5" />
        <rect x="-11" y="18" width="22" height="9" rx="3" fill="#94a3b8" />
        <path d="M-7 -2 L0 6 L7 -2" stroke="#b45309" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M0 -40 V-34 M-28 -30 L-23 -25 M28 -30 L23 -25 M-36 -4 H-30 M36 -4 H30" stroke={AMBER} strokeWidth="3" strokeLinecap="round" />
      </g>
      <Sparkle x={36} y={60} s={0.9} fill={VIOLET} />
      <Sparkle x={206} y={120} s={0.8} fill={CYAN} />
      <circle cx="196" cy="34" r="3" fill={PINK} />
    </svg>
  );
}

/** Quizzes: a target with an arrow in the bullseye. */
export function TargetIllustration({ className, title }: IllustrationProps) {
  const ids = useIds(["ring", "arrow"] as const);
  return (
    <svg viewBox="0 0 240 200" className={cn("h-auto w-full", className)} {...a11y(title)}>
      <defs>
        <linearGradient id={ids.ring} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={INDIGO} />
          <stop offset="1" stopColor={VIOLET} />
        </linearGradient>
        <linearGradient id={ids.arrow} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={AMBER} />
          <stop offset="1" stopColor={PINK} />
        </linearGradient>
      </defs>
      <ellipse cx="112" cy="184" rx="70" ry="9" fill={INDIGO_L} opacity="0.2" />
      <circle cx="112" cy="100" r="76" fill={`url(#${ids.ring})`} />
      <circle cx="112" cy="100" r="58" fill="#ffffff" />
      <circle cx="112" cy="100" r="42" fill={`url(#${ids.ring})`} />
      <circle cx="112" cy="100" r="26" fill="#ffffff" />
      <circle cx="112" cy="100" r="12" fill={PINK} />
      <g transform="rotate(-35 112 100)">
        <rect x="112" y="97" width="104" height="6" rx="3" fill={`url(#${ids.arrow})`} />
        <path d="M200 92 L222 86 L216 100 L222 114 L200 108Z" fill={PINK} />
        <path d="M112 100 L126 92 L126 108Z" fill="#334155" />
      </g>
      <Sparkle x={196} y={156} s={1.1} />
      <Sparkle x={34} y={42} s={0.9} fill={CYAN} />
      <circle cx="44" cy="150" r="3" fill={VIOLET} />
      <path d="M176 40 l6 -10 M186 50 l10 -4 M168 30 l2 -11" stroke={AMBER} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Mock interviews: an interviewer avatar with chat bubbles. */
export function ChatIllustration({ className, title }: IllustrationProps) {
  const ids = useIds(["b1", "b2", "face"] as const);
  return (
    <svg viewBox="0 0 240 200" className={cn("h-auto w-full", className)} {...a11y(title)}>
      <defs>
        <linearGradient id={ids.b1} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={INDIGO} />
          <stop offset="1" stopColor={VIOLET} />
        </linearGradient>
        <linearGradient id={ids.b2} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0891b2" />
          <stop offset="1" stopColor={CYAN} />
        </linearGradient>
        <linearGradient id={ids.face} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eef0ff" />
          <stop offset="1" stopColor="#c7d2fe" />
        </linearGradient>
      </defs>
      <ellipse cx="120" cy="186" rx="86" ry="8" fill={INDIGO_L} opacity="0.2" />
      {/* bubble 1 (interviewer) */}
      <path d="M24 26 h112 a14 14 0 0 1 14 14 v36 a14 14 0 0 1 -14 14 h-80 l-18 16 v-16 h-14 a14 14 0 0 1 -14 -14 v-36 a14 14 0 0 1 14 -14Z" fill={`url(#${ids.b1})`} />
      <rect x="36" y="44" width="80" height="7" rx="3.5" fill="#ffffff" opacity="0.9" />
      <rect x="36" y="58" width="96" height="7" rx="3.5" fill="#ffffff" opacity="0.6" />
      <rect x="36" y="72" width="56" height="7" rx="3.5" fill="#ffffff" opacity="0.6" />
      {/* bubble 2 (candidate) */}
      <path d="M216 98 h-96 a14 14 0 0 0 -14 14 v28 a14 14 0 0 0 14 14 h70 l16 14 v-14 h10 a14 14 0 0 0 14 -14 v-28 a14 14 0 0 0 -14 -14Z" fill={`url(#${ids.b2})`} />
      <circle cx="140" cy="126" r="5" fill="#ffffff" />
      <circle cx="158" cy="126" r="5" fill="#ffffff" opacity="0.75" />
      <circle cx="176" cy="126" r="5" fill="#ffffff" opacity="0.5" />
      {/* interviewer avatar */}
      <g transform="translate(58 150)">
        <circle r="26" fill={`url(#${ids.face})`} stroke={INDIGO} strokeWidth="3" />
        <rect x="-15" y="-10" width="30" height="18" rx="9" fill={INDIGO} />
        <circle cx="-6" cy="-1" r="3.5" fill={CYAN} />
        <circle cx="6" cy="-1" r="3.5" fill={CYAN} />
        <path d="M-7 15 Q0 20 7 15" stroke={INDIGO} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M0 -26 V-34" stroke={INDIGO} strokeWidth="3" strokeLinecap="round" />
        <circle cy="-37" r="4" fill={PINK} />
      </g>
      <Sparkle x={210} y={40} s={1.1} />
      <Sparkle x={190} y={70} s={0.6} fill={PINK} />
    </svg>
  );
}

/** Scorecards: a trophy on a podium with confetti. */
export function TrophyIllustration({ className, title }: IllustrationProps) {
  const ids = useIds(["cup", "base", "shine"] as const);
  return (
    <svg viewBox="0 0 240 200" className={cn("h-auto w-full", className)} {...a11y(title)}>
      <defs>
        <linearGradient id={ids.cup} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.5" stopColor={AMBER} />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id={ids.base} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={INDIGO} />
          <stop offset="1" stopColor={VIOLET} />
        </linearGradient>
        <radialGradient id={ids.shine} cx="0.5" cy="0.4" r="0.5">
          <stop offset="0" stopColor={AMBER} stopOpacity="0.45" />
          <stop offset="1" stopColor={AMBER} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="120" cy="80" r="80" fill={`url(#${ids.shine})`} />
      <path d="M78 34 h84 v26 c0 30 -18 52 -42 52 s-42 -22 -42 -52Z" fill={`url(#${ids.cup})`} stroke="#b45309" strokeWidth="3" strokeLinejoin="round" />
      <path d="M78 44 h-16 c0 22 10 34 24 36" fill="none" stroke="#b45309" strokeWidth="6" strokeLinecap="round" />
      <path d="M162 44 h16 c0 22 -10 34 -24 36" fill="none" stroke="#b45309" strokeWidth="6" strokeLinecap="round" />
      <path d="M96 44 c0 22 6 36 14 44" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="6" strokeLinecap="round" fill="none" />
      <rect x="110" y="110" width="20" height="22" fill="#d97706" />
      <rect x="92" y="130" width="56" height="12" rx="4" fill={`url(#${ids.cup})`} stroke="#b45309" strokeWidth="2.5" />
      <rect x="64" y="146" width="112" height="38" rx="8" fill={`url(#${ids.base})`} />
      <path d="M120 152 l4.5 9 10 1.4 -7.2 7 1.7 9.9 -9 -4.7 -9 4.7 1.7 -9.9 -7.2 -7 10 -1.4Z" fill={AMBER} />
      {/* confetti */}
      <rect x="40" y="40" width="8" height="14" rx="2" fill={PINK} transform="rotate(-25 44 47)" />
      <rect x="190" y="30" width="8" height="14" rx="2" fill={CYAN} transform="rotate(30 194 37)" />
      <rect x="200" y="110" width="8" height="14" rx="2" fill={EMERALD} transform="rotate(-40 204 117)" />
      <rect x="30" y="112" width="8" height="14" rx="2" fill={VIOLET} transform="rotate(20 34 119)" />
      <Sparkle x={58} y={84} s={1} />
      <Sparkle x={186} y={74} s={1.2} fill={PINK} />
      <circle cx="210" cy="64" r="3" fill={AMBER} />
      <circle cx="24" cy="78" r="3" fill={CYAN} />
    </svg>
  );
}

/** Plans: a compass over a folded map with a dashed route. */
export function CompassIllustration({ className, title }: IllustrationProps) {
  const ids = useIds(["map", "rim", "needle"] as const);
  return (
    <svg viewBox="0 0 240 200" className={cn("h-auto w-full", className)} {...a11y(title)}>
      <defs>
        <linearGradient id={ids.map} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#eef0ff" />
          <stop offset="1" stopColor="#ddd6fe" />
        </linearGradient>
        <linearGradient id={ids.rim} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={INDIGO} />
          <stop offset="1" stopColor={VIOLET} />
        </linearGradient>
        <linearGradient id={ids.needle} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={PINK} />
          <stop offset="1" stopColor="#be185d" />
        </linearGradient>
      </defs>
      <ellipse cx="120" cy="184" rx="96" ry="9" fill={INDIGO_L} opacity="0.2" />
      <path d="M20 46 L80 30 L160 50 L220 34 L220 160 L160 176 L80 156 L20 172Z" fill={`url(#${ids.map})`} stroke={INDIGO_L} strokeWidth="2" strokeLinejoin="round" />
      <path d="M80 30 V156 M160 50 V176" stroke={INDIGO_L} strokeWidth="2" opacity="0.6" />
      <path d="M38 150 C 60 120, 70 140, 96 110 S 140 80, 150 100 S 190 70, 204 56" fill="none" stroke={INDIGO} strokeWidth="3" strokeDasharray="2 8" strokeLinecap="round" />
      <circle cx="38" cy="150" r="6" fill={EMERALD} />
      <path d="M204 44 c-8 0 -12 6 -12 11 c0 8 12 19 12 19 s12 -11 12 -19 c0 -5 -4 -11 -12 -11Z" fill={PINK} />
      <circle cx="204" cy="55" r="4" fill="#ffffff" />
      {/* compass */}
      <g transform="translate(120 104)">
        <circle r="46" fill={`url(#${ids.rim})`} />
        <circle r="37" fill="#ffffff" />
        <circle r="37" fill="none" stroke={INDIGO_L} strokeWidth="1.5" strokeDasharray="2 5" />
        <path d="M0 -30 L8 0 L0 30 L-8 0Z" fill="#cbd5e1" />
        <path d="M0 -30 L8 0 L-8 0Z" fill={`url(#${ids.needle})`} />
        <circle r="5" fill={INDIGO} />
        <text y="-40" textAnchor="middle" fontSize="9" fontWeight="700" fill="#ffffff" fontFamily="system-ui, sans-serif">
          N
        </text>
      </g>
      <Sparkle x={30} y={22} s={0.9} />
      <Sparkle x={226} y={186} s={0.7} fill={CYAN} />
    </svg>
  );
}

/** AI generating: a glowing orb with orbiting sparkles (animates gently). */
export function SparklesIllustration({ className, title }: IllustrationProps) {
  const ids = useIds(["orb", "glow"] as const);
  return (
    <svg viewBox="0 0 240 200" className={cn("h-auto w-full", className)} {...a11y(title)}>
      <defs>
        <radialGradient id={ids.orb} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor={INDIGO_L} />
          <stop offset="1" stopColor={VIOLET} />
        </radialGradient>
        <radialGradient id={ids.glow} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={VIOLET} stopOpacity="0.5" />
          <stop offset="1" stopColor={VIOLET} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="120" cy="100" r="96" fill={`url(#${ids.glow})`} />
      <g className="origin-center animate-[spin_18s_linear_infinite]" style={{ transformBox: "fill-box" }}>
        <ellipse cx="120" cy="100" rx="88" ry="30" fill="none" stroke={INDIGO_L} strokeOpacity="0.5" strokeWidth="2" strokeDasharray="3 9" />
      </g>
      <ellipse cx="120" cy="100" rx="60" ry="84" fill="none" stroke={PINK} strokeOpacity="0.35" strokeWidth="2" strokeDasharray="3 9" transform="rotate(35 120 100)" />
      <circle cx="120" cy="100" r="44" fill={`url(#${ids.orb})`} />
      <path d="M104 92 c4 -10 14 -14 22 -10" stroke="#ffffff" strokeOpacity="0.75" strokeWidth="5" strokeLinecap="round" fill="none" />
      <g className="animate-pulse">
        <Sparkle x={120} y={100} s={2.2} fill="#ffffff" />
      </g>
      <Sparkle x={36} y={56} s={1.3} className="animate-pulse" />
      <Sparkle x={206} y={64} s={1} fill={CYAN} />
      <Sparkle x={196} y={156} s={1.4} fill={PINK} className="animate-pulse" />
      <Sparkle x={52} y={160} s={0.8} fill={CYAN} />
      <circle cx="30" cy="110" r="3" fill={AMBER} />
      <circle cx="214" cy="110" r="3" fill={INDIGO_L} />
    </svg>
  );
}

/** Split-screen auth panel art: floating learning cards around a launching rocket. */
export function LaunchpadIllustration({ className, title }: IllustrationProps) {
  const ids = useIds(["card"] as const);
  return (
    <svg viewBox="0 0 360 300" className={cn("h-auto w-full", className)} {...a11y(title)}>
      <defs>
        <linearGradient id={ids.card} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.75" />
        </linearGradient>
      </defs>
      {/* card: progress */}
      <g transform="translate(20 34) rotate(-6)">
        <rect width="150" height="78" rx="14" fill={`url(#${ids.card})`} />
        <rect x="14" y="14" width="70" height="8" rx="4" fill={INDIGO} opacity="0.8" />
        <rect x="14" y="30" width="110" height="6" rx="3" fill="#cbd5e1" />
        <rect x="14" y="52" width="122" height="10" rx="5" fill="#e2e8f0" />
        <rect x="14" y="52" width="84" height="10" rx="5" fill={INDIGO} />
      </g>
      {/* card: quiz */}
      <g transform="translate(196 22) rotate(5)">
        <rect width="140" height="96" rx="14" fill={`url(#${ids.card})`} />
        <circle cx="26" cy="28" r="10" fill={EMERALD} />
        <path d="M21 28 l4 4 7 -8" stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="44" y="23" width="74" height="8" rx="4" fill="#cbd5e1" />
        <circle cx="26" cy="54" r="10" fill={EMERALD} />
        <path d="M21 54 l4 4 7 -8" stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="44" y="49" width="60" height="8" rx="4" fill="#cbd5e1" />
        <circle cx="26" cy="80" r="10" fill="none" stroke="#cbd5e1" strokeWidth="3" />
        <rect x="44" y="75" width="66" height="8" rx="4" fill="#e2e8f0" />
      </g>
      {/* card: score */}
      <g transform="translate(206 186) rotate(-4)">
        <rect width="132" height="78" rx="14" fill={`url(#${ids.card})`} />
        <circle cx="36" cy="39" r="22" fill="none" stroke="#e2e8f0" strokeWidth="7" />
        <circle cx="36" cy="39" r="22" fill="none" stroke={VIOLET} strokeWidth="7" strokeDasharray="112 140" strokeLinecap="round" transform="rotate(-90 36 39)" />
        <text x="36" y="44" textAnchor="middle" fontSize="14" fontWeight="800" fill="#1e1b4b" fontFamily="system-ui, sans-serif">
          82
        </text>
        <rect x="70" y="28" width="46" height="8" rx="4" fill={VIOLET} opacity="0.8" />
        <rect x="70" y="44" width="38" height="6" rx="3" fill="#cbd5e1" />
      </g>
      <g transform="translate(36 120) scale(0.62)">
        <RocketIllustration />
      </g>
    </svg>
  );
}

/** Small round interviewer avatar for chat bubbles. */
export function InterviewerAvatar({ className }: { className?: string }) {
  const ids = useIds(["bg"] as const);
  return (
    <svg viewBox="0 0 40 40" className={cn("shrink-0", className)} aria-hidden>
      <defs>
        <linearGradient id={ids.bg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={INDIGO} />
          <stop offset="1" stopColor={VIOLET} />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="20" fill={`url(#${ids.bg})`} />
      <rect x="9" y="13" width="22" height="14" rx="7" fill="#eef0ff" />
      <circle cx="15.5" cy="20" r="2.6" fill={INDIGO} />
      <circle cx="24.5" cy="20" r="2.6" fill={INDIGO} />
      <path d="M16 30.5 Q20 33 24 30.5" stroke="#eef0ff" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M20 13 V8" stroke="#eef0ff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="7" r="2.2" fill={PINK} />
    </svg>
  );
}
