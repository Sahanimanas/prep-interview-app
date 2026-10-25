import {
  BookOpen,
  Brain,
  CodeXml,
  ListChecks,
  MessagesSquare,
  Sparkles,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";
import { Markdown, parseDocSections, type DocSection } from "@/components/markdown";
import { Reveal } from "@/components/motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

interface SectionStyle {
  icon: LucideIcon;
  /** Icon tile + accent bar colours. */
  tile: string;
  bar: string;
}

// Learning docs follow a predictable outline (overview, concepts, code, pitfalls, interview angle,
// cheat sheet); give each kind its own visual identity so the page scans like a lesson, not a wall of text.
const SECTION_STYLES: { match: RegExp; style: SectionStyle }[] = [
  { match: /overview|introduction|what is|why/i, style: { icon: BookOpen, tile: "bg-primary-soft text-primary", bar: "bg-primary" } },
  { match: /code|example|implement|snippet/i, style: { icon: CodeXml, tile: "bg-success-soft text-success", bar: "bg-success" } },
  { match: /pitfall|mistake|misconception|gotcha|avoid|anti-?pattern/i, style: { icon: TriangleAlert, tile: "bg-warning-soft text-warning", bar: "bg-warning" } },
  { match: /interview|probe|ask|answer/i, style: { icon: MessagesSquare, tile: "bg-danger-soft text-danger", bar: "bg-danger" } },
  { match: /cheat|revision|summary|recap|checklist|quick/i, style: { icon: ListChecks, tile: "bg-primary-soft text-primary", bar: "bg-accent" } },
  { match: /concept|fundamental|core|how .* works|deep dive/i, style: { icon: Brain, tile: "bg-primary-soft text-primary", bar: "bg-primary" } },
];
const DEFAULT_STYLE: SectionStyle = { icon: Sparkles, tile: "bg-primary-soft text-primary", bar: "bg-primary" };

function styleFor(title: string | null): SectionStyle {
  if (!title) return DEFAULT_STYLE;
  return SECTION_STYLES.find((s) => s.match.test(title))?.style ?? DEFAULT_STYLE;
}

const hasCode = (md: string) => /^\s*(```|~~~)/m.test(md);

/** A learning doc rendered as a sequence of section cards with subsection tiles. */
export function DocSections({ markdown }: { markdown: string }) {
  const sections = useMemo(() => {
    let titled = 0;
    return parseDocSections(markdown).map((section) => ({
      section,
      number: section.title ? ++titled : null,
    }));
  }, [markdown]);
  return (
    <div className="flex min-w-0 flex-col gap-5">
      {sections.map(({ section, number }, index) => (
        <Reveal key={section.id ?? `intro-${index}`} inView delay={Math.min(index, 4) * 0.04}>
          <SectionCard section={section} number={number} />
        </Reveal>
      ))}
    </div>
  );
}

function SectionCard({ section, number }: { section: DocSection; number: number | null }) {
  const style = styleFor(section.title);
  const Icon = style.icon;
  const subsections = section.subsections;
  // Short subsections read best side by side; long or code-heavy ones get the full width.
  const useGrid = subsections.length > 1;

  return (
    <Card className="relative min-w-0 overflow-hidden">
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", style.bar)} />
      <div className="p-5 pl-6 sm:p-7 sm:pl-8">
        {section.title && (
          <header className="mb-4 flex items-center gap-3.5">
            <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", style.tile)}>
              <Icon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              {number !== null && (
                <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                  Section {String(number).padStart(2, "0")}
                </p>
              )}
              <h2 id={section.id ?? undefined} className="scroll-mt-24 text-xl font-semibold leading-tight text-fg sm:text-2xl">
                {section.title}
              </h2>
            </div>
          </header>
        )}

        {section.intro && <Markdown>{section.intro}</Markdown>}

        {subsections.length > 0 && (
          <div className={cn("grid gap-4", section.intro && "mt-5", useGrid && "lg:grid-cols-2")}>
            {subsections.map((sub, i) => (
              <section
                key={sub.id}
                aria-labelledby={sub.id}
                className={cn(
                  "min-w-0 rounded-xl border border-border bg-surface-muted/60 p-4 sm:p-5",
                  "transition-colors hover:border-border-strong",
                  useGrid && (hasCode(sub.body) || sub.body.length > 1400) && "lg:col-span-2",
                )}
              >
                <h3 id={sub.id} className="mb-2 flex scroll-mt-24 items-start gap-2.5 text-base font-semibold leading-snug text-fg">
                  <span className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-md text-xs font-bold", style.tile)}>
                    {i + 1}
                  </span>
                  <span className="min-w-0">{stripLeadingNumber(sub.title)}</span>
                </h3>
                {sub.body && <Markdown size="sm">{sub.body}</Markdown>}
              </section>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

/** "3. Bailing out of re-renders" -> "Bailing out of re-renders" (we render our own number chip). */
function stripLeadingNumber(title: string): string {
  return title.replace(/^\s*\d+[.)]\s+/, "");
}
