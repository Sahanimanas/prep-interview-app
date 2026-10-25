import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { hashString } from "@/lib/seed";
import { MONOGRAM_GRADIENTS, findTechIcon, luminance, monogram } from "./tech-logo";

interface TechCoverProps {
  /** Free-text technology, e.g. "Node.js" — resolved to a brand logo (monogram fallback). */
  technology: string;
  className?: string;
  rounded?: string;
  /** Where the hero logo sits: centred (cards) or right side (banners with text along the bottom-left). */
  logo?: "center" | "right";
  /** Overlay content (badges, titles). Rendered above the artwork. */
  children?: ReactNode;
}

/**
 * Card/banner image built from the technology's own logo: a dark backdrop tinted with the brand
 * colour, the logo large with a soft glow, and an oversized faded copy as a watermark.
 */
export function TechCover({ technology, className, rounded = "rounded-xl", logo = "center", children }: TechCoverProps) {
  const icon = findTechIcon(technology);
  const fallback = MONOGRAM_GRADIENTS[hashString(technology) % MONOGRAM_GRADIENTS.length] ?? MONOGRAM_GRADIENTS[0];
  const brand = icon ? `#${icon.hex}` : fallback[0];
  const accent = icon ? brand : fallback[1];
  // Near-black brand marks (Next.js, GitHub, Rust…) would vanish on the dark backdrop.
  const glyphColor = icon && luminance(icon.hex) < 0.22 ? "#ffffff" : brand;

  const style: CSSProperties = {
    backgroundImage: [
      `radial-gradient(120% 90% at 15% 0%, ${brand}66 0%, transparent 55%)`,
      `radial-gradient(90% 90% at 100% 100%, ${accent}4d 0%, transparent 60%)`,
      "linear-gradient(135deg, #0b1023 0%, #15123a 100%)",
    ].join(", "),
  };

  return (
    <div className={cn("relative isolate overflow-hidden bg-slate-950", rounded, className)} style={style}>
      <div aria-hidden className="pp-dots absolute inset-0 -z-10 opacity-20" />
      <Glyph
        icon={icon}
        technology={technology}
        color={glyphColor}
        className="pointer-events-none absolute bottom-[-18%] right-[-6%] -z-10 h-[135%] w-auto -rotate-12 opacity-[0.12]"
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 flex",
          logo === "center"
            ? "items-center justify-center"
            : // Stacked layouts: top-right corner. Wide banners: centred vertically, clear of the
              // right-hand actions (countdown + delete, ~260px).
              "items-start justify-end pr-[6%] pt-[5%] lg:items-center lg:pr-75 lg:pt-0",
        )}
      >
        <Glyph
          icon={icon}
          technology={technology}
          color={glyphColor}
          className={cn(
            "w-auto transition-transform duration-500 ease-out group-hover:scale-110",
            logo === "center" ? "h-[44%]" : "h-[46%]",
          )}
          style={{ filter: `drop-shadow(0 0 18px ${brand}99)` }}
        />
      </div>
      {children}
    </div>
  );
}

function Glyph({
  icon,
  technology,
  color,
  className,
  style,
}: {
  icon: ReturnType<typeof findTechIcon>;
  technology: string;
  color: string;
  className?: string;
  style?: CSSProperties;
}) {
  if (icon) {
    return (
      <svg viewBox="0 0 24 24" className={className} style={style} aria-hidden>
        <path d={icon.path} fill={color} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" className={className} style={style} aria-hidden>
      <text
        x="24"
        y="25"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="24"
        fontWeight="800"
        fontFamily="inherit"
        fill={color}
      >
        {monogram(technology)}
      </text>
    </svg>
  );
}
