import {
  BookOpen,
  Bookmark,
  CalendarDays,
  CircleCheck,
  ClipboardList,
  Crown,
  Flame,
  ListChecks,
  MessagesSquare,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { TechCover } from "@/components/art/tech-cover";
import { TechLogo } from "@/components/art/tech-logo";
import { LogoMark } from "@/components/app/logo";
import { SiteHeader } from "@/components/app/site-header";
import {
  BooksIllustration,
  ChatIllustration,
  CompassIllustration,
  RocketIllustration,
  TargetIllustration,
  TrophyIllustration,
} from "@/components/illustrations";
import { HeroCta } from "@/components/marketing/hero-cta";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";

export const metadata: Metadata = {
  title: { absolute: "PrepPilot — AI interview prep that adapts to you" },
};

const TECHS = [
  "React",
  "Node.js",
  "TypeScript",
  "Python",
  "Java",
  "Go",
  "Rust",
  "Kubernetes",
  "Docker",
  "PostgreSQL",
  "Next.js",
  "Django",
  "Spring Boot",
  "Swift",
  "Kotlin",
  "GraphQL",
  "Redis",
  "System design",
];

const steps: { illustration: ReactNode; icon: ReactNode; title: string; body: string }[] = [
  {
    illustration: <CompassIllustration />,
    icon: <ClipboardList className="size-4" aria-hidden />,
    title: "Tell us about the interview",
    body: "Days until the interview, the role, your experience, the formats you'll face and what you want to focus on.",
  },
  {
    illustration: <ChatIllustration />,
    icon: <MessagesSquare className="size-4" aria-hidden />,
    title: "Answer a few smart questions",
    body: "The AI asks 3–5 tailored clarifying questions so your plan targets your actual gaps — not a generic syllabus.",
  },
  {
    illustration: <BooksIllustration />,
    icon: <CalendarDays className="size-4" aria-hidden />,
    title: "Learn, quiz, mock — daily",
    body: "A day-by-day journey with learning docs, question banks and quizzes, finished off with realistic mock interviews.",
  },
];

function FloatingCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`absolute hidden rounded-2xl border border-white/40 bg-surface/90 p-3.5 shadow-lift backdrop-blur-md sm:block ${className ?? ""}`}>
      {children}
    </div>
  );
}

function HeroArt() {
  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="animate-float">
        <RocketIllustration title="A rocket launching into orbit" />
      </div>
      <FloatingCard className="left-0 top-8 w-52 -rotate-3">
        <div className="flex items-center gap-2.5">
          <TechLogo technology="Node.js" size="sm" />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">Node.js · Senior BE</p>
            <p className="text-[11px] text-fg-subtle">Day 3 of 10</p>
          </div>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-muted">
          <div className="h-full w-[42%] rounded-full bg-linear-to-r from-primary to-accent" />
        </div>
      </FloatingCard>
      <FloatingCard className="-right-2 top-1/3 w-48 rotate-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-success-soft-fg">
          <CircleCheck className="size-4 text-success" aria-hidden /> Quiz: 9/10
        </p>
        <p className="mt-1 text-[11px] text-fg-subtle">+60 XP · Quiz whiz unlocked</p>
      </FloatingCard>
      <FloatingCard className="bottom-6 left-10 w-56 -rotate-2">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-amber-400 to-pink-500 text-white">
            <Trophy className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-semibold">Mock interview</p>
            <p className="text-[11px] text-fg-subtle">82/100 · Hire</p>
          </div>
        </div>
      </FloatingCard>
    </div>
  );
}

export default function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 overflow-x-clip">
        {/* Hero — full bleed */}
        <section className="pp-mesh relative">
          <div aria-hidden className="pp-dots absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
          <div className="relative mx-auto grid w-full max-w-[1400px] items-center gap-12 px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:px-10 lg:pb-28 lg:pt-20">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-surface/70 px-3 py-1 text-xs font-semibold text-primary-soft-fg shadow-sm backdrop-blur">
                <Sparkles className="size-3.5 text-primary" aria-hidden />
                Your AI co-pilot for interview day
              </span>
              <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight text-balance sm:text-6xl xl:text-7xl">
                Walk into your interview <span className="pp-gradient-text">ready</span>, not hopeful.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-fg-muted text-pretty sm:text-xl">
                Say “I have a Node.js interview in 10 days”. PrepPilot asks the right questions, maps a day-by-day
                journey around your gaps, then teaches, quizzes and mock-interviews you until you&apos;re confident.
              </p>
              <div className="mt-9">
                <HeroCta />
              </div>
              <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-sm text-fg-muted">
                {["Personalised in minutes", "XP, levels & achievements", "Realistic AI mock interviews"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CircleCheck className="size-4 text-success" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={0.15}>
              <HeroArt />
            </Reveal>
          </div>
        </section>

        {/* Tech marquee */}
        <section aria-label="Supported technologies" className="border-y border-border bg-surface/60 py-6">
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-fg-subtle">
            Prepare for any stack
          </p>
          <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
            <ul className="flex w-max animate-marquee gap-3 hover:[animation-play-state:paused]">
              {[...TECHS, ...TECHS].map((tech, i) => (
                <li
                  key={`${tech}-${i}`}
                  aria-hidden={i >= TECHS.length}
                  className="flex items-center gap-2.5 rounded-full border border-border bg-surface px-3 py-1.5 pr-4 shadow-xs"
                >
                  <TechLogo technology={tech} size="xs" />
                  <span className="whitespace-nowrap text-sm font-medium">{tech}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section id="how" aria-labelledby="how-heading" className="scroll-mt-20">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
            <Reveal inView className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">How it works</p>
              <h2 id="how-heading" className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
                From “I have an interview” to a plan in three steps
              </h2>
            </Reveal>
            <Stagger as="ol" inView className="mt-14 grid gap-6 md:grid-cols-3">
              {steps.map((step, index) => (
                <StaggerItem as="li" key={step.title}>
                  <div className="group relative h-full overflow-hidden rounded-3xl border border-border bg-surface p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
                    <div className="mx-auto max-w-[220px] transition-transform duration-500 group-hover:scale-105">{step.illustration}</div>
                    <div className="mt-4 flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-fg">
                        {index + 1}
                      </span>
                      <span className="text-primary">{step.icon}</span>
                    </div>
                    <h3 className="mt-3 text-xl font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-fg-muted">{step.body}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>

        {/* Feature bento */}
        <section id="features" aria-labelledby="features-heading" className="scroll-mt-20 bg-bg-accent/60">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
            <Reveal inView className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">Everything in one place</p>
              <h2 id="features-heading" className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
                Built for the way interviews actually work
              </h2>
            </Reveal>
            <Stagger inView className="mt-12 grid auto-rows-[minmax(0,auto)] gap-5 md:grid-cols-6">
              <StaggerItem className="md:col-span-4">
                <FeatureCard
                  icon={<BookOpen className="size-5" aria-hidden />}
                  title="AI learning docs with cover art"
                  body="Every topic gets a focused, interview-ready explainer with highlighted code, key takeaways and a table of contents."
                >
                  <div className="mt-6 grid grid-cols-3 gap-3">
                    {[
                      ["Node.js", "Event loop"],
                      ["React", "Hooks"],
                      ["PostgreSQL", "Indexes"],
                    ].map(([tech, topic]) => (
                      <TechCover key={tech} technology={tech} className="group flex h-28 items-end p-3">
                        <span className="rounded-md bg-black/40 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur">{topic}</span>
                      </TechCover>
                    ))}
                  </div>
                </FeatureCard>
              </StaggerItem>
              <StaggerItem className="md:col-span-2">
                <FeatureCard
                  icon={<ListChecks className="size-5" aria-hidden />}
                  title="Quizzes that stick"
                  body="One question at a time, instant explanations, and revision quizzes that mix everything."
                >
                  <div className="mx-auto mt-4 max-w-[180px]">
                    <TargetIllustration />
                  </div>
                </FeatureCard>
              </StaggerItem>
              <StaggerItem className="md:col-span-2">
                <FeatureCard
                  icon={<MessagesSquare className="size-5" aria-hidden />}
                  title="Mock interviews"
                  body="Chat with an AI interviewer that scores each answer and hands you a hiring verdict."
                >
                  <div className="mx-auto mt-4 max-w-[190px]">
                    <ChatIllustration />
                  </div>
                </FeatureCard>
              </StaggerItem>
              <StaggerItem className="md:col-span-2">
                <FeatureCard
                  icon={<Bookmark className="size-5" aria-hidden />}
                  title="Flashcard question bank"
                  body="Flip through likely questions, reveal model answers, bookmark and rate your confidence."
                >
                  <div className="pp-perspective mt-6 flex justify-center">
                    <div className="w-full max-w-[220px] rotate-y-12 rounded-2xl bg-linear-to-br from-primary to-accent p-4 text-white shadow-lift">
                      <p className="text-[11px] uppercase tracking-wider opacity-80">Question</p>
                      <p className="mt-1 text-sm font-semibold">How does backpressure work in Node streams?</p>
                    </div>
                  </div>
                </FeatureCard>
              </StaggerItem>
              <StaggerItem className="md:col-span-2">
                <FeatureCard
                  icon={<Flame className="size-5" aria-hidden />}
                  title="XP, levels & achievements"
                  body="Earn XP for every topic, quiz and mock. Unlock badges as you close in on interview day."
                >
                  <div className="mt-6 flex items-center gap-3">
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-linear-to-br from-primary via-accent to-accent-3 text-lg font-bold text-white shadow-glow">
                      4
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs text-fg-subtle">
                        <span>Level 4</span>
                        <span>320/500 XP</span>
                      </div>
                      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface-muted">
                        <div className="h-full w-[64%] rounded-full bg-linear-to-r from-primary via-accent to-accent-3" />
                      </div>
                    </div>
                    <span className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-yellow-400 to-amber-600 text-white">
                      <Crown className="size-5" aria-hidden />
                    </span>
                  </div>
                </FeatureCard>
              </StaggerItem>
            </Stagger>
          </div>
        </section>

        {/* CTA — full bleed */}
        <section className="pp-hero-gradient relative animate-gradient overflow-hidden text-white">
          <div aria-hidden className="pp-dots absolute inset-0 opacity-30" />
          <div className="relative mx-auto grid w-full max-w-[1400px] items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:px-10">
            <Reveal inView>
              <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-5xl">
                Your interview date is set. Is your plan?
              </h2>
              <p className="mt-4 max-w-xl text-lg text-white/85">
                Create a plan in under five minutes and know exactly what to study each day until the big one.
              </p>
              <div className="mt-8 [&_a:first-child]:bg-white [&_a:first-child]:text-indigo-700 [&_a:first-child:hover]:bg-indigo-50 [&_a:last-child]:border-white/40 [&_a:last-child]:bg-white/10 [&_a:last-child]:text-white [&_a:last-child:hover]:bg-white/20">
                <HeroCta />
              </div>
            </Reveal>
            <Reveal inView delay={0.1} className="mx-auto w-full max-w-sm">
              <TrophyIllustration />
            </Reveal>
          </div>
        </section>
      </main>
      <footer className="border-t border-border bg-surface/60">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-fg-subtle sm:flex-row sm:px-6 lg:px-10">
          <div className="flex items-center gap-2">
            <LogoMark className="size-6 rounded-md" />
            <span className="font-medium text-fg-muted">PrepPilot</span>
          </div>
          <p>AI-powered interview preparation.</p>
        </div>
      </footer>
    </>
  );
}

function FeatureCard({
  icon,
  title,
  body,
  children,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div className="group h-full rounded-3xl border border-border bg-surface p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary transition-transform group-hover:scale-110">
        {icon}
      </span>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{body}</p>
      {children}
    </div>
  );
}
