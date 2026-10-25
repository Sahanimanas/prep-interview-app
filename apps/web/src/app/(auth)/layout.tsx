import { CircleCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/app/logo";
import { ThemeCycleButton } from "@/components/app/theme-toggle";
import { LaunchpadIllustration } from "@/components/illustrations";
import { Reveal } from "@/components/motion";

const POINTS = [
  "A day-by-day plan built around your gaps",
  "AI learning docs, question banks & quizzes",
  "Mock interviews with a scored hiring verdict",
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="pp-mesh relative flex min-w-0 flex-col">
        <header className="flex h-16 items-center justify-between px-4 sm:px-8">
          <Logo />
          <ThemeCycleButton />
        </header>
        <main id="main" className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center sm:px-8 sm:pt-0">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>

      <aside
        aria-label="About PrepPilot"
        className="pp-hero-gradient relative hidden animate-gradient overflow-hidden text-white lg:flex lg:flex-col lg:justify-center"
      >
        <div aria-hidden className="pp-dots absolute inset-0 opacity-25" />
        <div aria-hidden className="absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto w-full max-w-xl px-12 py-16">
          <Reveal>
            <LaunchpadIllustration className="drop-shadow-2xl" />
          </Reveal>
          <Reveal delay={0.12}>
            <h2 className="mt-8 text-3xl font-bold tracking-tight text-balance xl:text-4xl">
              Turn interview nerves into a flight plan.
            </h2>
            <ul className="mt-6 flex flex-col gap-3 text-white/90">
              {POINTS.map((p) => (
                <li key={p} className="flex items-center gap-3">
                  <CircleCheck className="size-5 shrink-0 text-emerald-300" aria-hidden />
                  {p}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </aside>
    </div>
  );
}
