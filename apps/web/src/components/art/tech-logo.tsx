import {
  siAndroid,
  siAngular,
  siApachekafka,
  siApachespark,
  siC,
  siCplusplus,
  siCss,
  siDart,
  siDjango,
  siDocker,
  siDotnet,
  siElasticsearch,
  siElixir,
  siExpress,
  siFastapi,
  siFirebase,
  siFlask,
  siFlutter,
  siGit,
  siGo,
  siGooglecloud,
  siGraphql,
  siHaskell,
  siHtml5,
  siJavascript,
  siJest,
  siKotlin,
  siKubernetes,
  siLaravel,
  siLinux,
  siMongodb,
  siMysql,
  siNestjs,
  siNextdotjs,
  siNodedotjs,
  siNuxt,
  siOpenjdk,
  siPandas,
  siPhp,
  siPostgresql,
  siPython,
  siPytorch,
  siReact,
  siRedis,
  siRedux,
  siRuby,
  siRubyonrails,
  siRust,
  siScala,
  siSolidity,
  siSpringboot,
  siSvelte,
  siSwift,
  siTailwindcss,
  siTensorflow,
  siTerraform,
  siTypescript,
  siUnity,
  siVuedotjs,
  type SimpleIcon,
} from "simple-icons";
import { cn } from "@/lib/cn";
import { hashString } from "@/lib/seed";

/**
 * Curated lookup from free-text technology names to brand icons. Order matters: more specific
 * patterns (e.g. "react native", "next.js", "javascript") come before broader ones.
 */
const TECH_PATTERNS: ReadonlyArray<[RegExp, SimpleIcon]> = [
  [/react\s*native/, siReact],
  [/next(\.|\s)?js|\bnextjs\b/, siNextdotjs],
  [/nuxt/, siNuxt],
  [/nest(\.|\s)?js|\bnestjs\b/, siNestjs],
  [/express/, siExpress],
  [/node/, siNodedotjs],
  [/react/, siReact],
  [/redux/, siRedux],
  [/vue/, siVuedotjs],
  [/angular/, siAngular],
  [/svelte/, siSvelte],
  [/typescript|\bts\b/, siTypescript],
  [/javascript|\bjs\b|ecmascript/, siJavascript],
  [/tailwind/, siTailwindcss],
  [/\bhtml/, siHtml5],
  [/\bcss\b|frontend/, siCss],
  [/django/, siDjango],
  [/flask/, siFlask],
  [/fastapi/, siFastapi],
  [/pytorch/, siPytorch],
  [/tensorflow|machine learning|\bml\b|deep learning/, siTensorflow],
  [/pandas|data scien|data analy/, siPandas],
  [/python/, siPython],
  [/spring/, siSpringboot],
  [/kotlin/, siKotlin],
  [/\bjava\b|\bjvm\b/, siOpenjdk],
  [/scala/, siScala],
  [/golang|\bgo\b/, siGo],
  [/rust/, siRust],
  [/c\+\+|\bcpp\b/, siCplusplus],
  [/c#|\.net|dotnet|asp\.net/, siDotnet],
  [/\bc\b/, siC],
  [/rails/, siRubyonrails],
  [/ruby/, siRuby],
  [/laravel/, siLaravel],
  [/\bphp\b/, siPhp],
  [/swift|\bios\b/, siSwift],
  [/android/, siAndroid],
  [/flutter/, siFlutter],
  [/\bdart\b/, siDart],
  [/kubernetes|\bk8s\b/, siKubernetes],
  [/docker|container/, siDocker],
  [/terraform|infrastructure as code/, siTerraform],
  [/google cloud|\bgcp\b/, siGooglecloud],
  [/postgres/, siPostgresql],
  [/mysql|\bsql\b/, siMysql],
  [/mongo/, siMongodb],
  [/redis/, siRedis],
  [/kafka/, siApachekafka],
  [/spark|big data/, siApachespark],
  [/elastic/, siElasticsearch],
  [/graphql/, siGraphql],
  [/firebase/, siFirebase],
  [/elixir|phoenix/, siElixir],
  [/haskell/, siHaskell],
  [/solidity|ethereum|web3/, siSolidity],
  [/unity|game dev/, siUnity],
  [/jest|testing/, siJest],
  [/linux|devops|sre\b/, siLinux],
  [/\bgit\b/, siGit],
];

export function findTechIcon(technology: string): SimpleIcon | null {
  const t = technology.toLowerCase();
  for (const [pattern, icon] of TECH_PATTERNS) if (pattern.test(t)) return icon;
  return null;
}

/** Perceived luminance (0-1) of a 6-digit hex colour. */
export function luminance(hex: string): number {
  const n = parseInt(hex, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export const MONOGRAM_GRADIENTS = [
  ["#6366f1", "#a855f7"],
  ["#06b6d4", "#6366f1"],
  ["#10b981", "#06b6d4"],
  ["#f59e0b", "#ec4899"],
  ["#ec4899", "#8b5cf6"],
  ["#3b82f6", "#22d3ee"],
] as const;

export function monogram(technology: string): string {
  const words = technology
    .replace(/[^a-zA-Z0-9+#. ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return (words[0] ?? "?").slice(0, 2).toUpperCase();
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase();
}

const SIZES = {
  xs: { box: "size-6 rounded-md", icon: "size-3.5", text: "text-[9px]" },
  sm: { box: "size-8 rounded-lg", icon: "size-4.5", text: "text-[11px]" },
  md: { box: "size-10 rounded-xl", icon: "size-5.5", text: "text-sm" },
  lg: { box: "size-14 rounded-2xl", icon: "size-8", text: "text-lg" },
  xl: { box: "size-20 rounded-3xl", icon: "size-11", text: "text-2xl" },
} as const;

interface TechLogoProps {
  technology: string;
  size?: keyof typeof SIZES;
  className?: string;
  /** "tile" draws a tinted rounded square; "glass" a frosted white tile for use on artwork. */
  variant?: "tile" | "glass";
}

/** Brand logo for a free-text technology (curated simple-icons lookup) with a monogram fallback. */
export function TechLogo({ technology, size = "md", className, variant = "tile" }: TechLogoProps) {
  const icon = findTechIcon(technology);
  const s = SIZES[size];

  if (!icon) {
    const [from, to] = MONOGRAM_GRADIENTS[hashString(technology) % MONOGRAM_GRADIENTS.length] ?? MONOGRAM_GRADIENTS[0];
    return (
      <span
        role="img"
        aria-label={technology}
        className={cn("inline-flex shrink-0 items-center justify-center font-bold text-white shadow-sm", s.box, s.text, className)}
        style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
      >
        {monogram(technology)}
      </span>
    );
  }

  const dark = luminance(icon.hex) < 0.22;
  const fill = dark ? "currentColor" : `#${icon.hex}`;
  return (
    <span
      role="img"
      aria-label={icon.title}
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        s.box,
        variant === "glass"
          ? "bg-white/90 text-slate-900 shadow-lg ring-1 ring-white/60 backdrop-blur"
          : "text-fg ring-1 ring-inset ring-black/5 dark:ring-white/10",
        className,
      )}
      style={variant === "tile" ? { backgroundColor: dark ? "var(--pp-surface-muted)" : `#${icon.hex}1f` } : undefined}
    >
      <svg viewBox="0 0 24 24" className={s.icon} aria-hidden>
        <path d={icon.path} fill={variant === "glass" && dark ? "#0f172a" : fill} />
      </svg>
    </span>
  );
}
