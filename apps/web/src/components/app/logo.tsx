import Link from "next/link";
import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-lg bg-primary text-primary-fg shadow-sm",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-[18px]" strokeWidth={2.2} stroke="currentColor">
        <path d="M3.5 13.5 20.5 4l-5 16.5-4-6.5-8-0.5Z" strokeLinejoin="round" />
        <path d="m11.5 14 9-10" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2 rounded-lg text-fg", className)}
      aria-label="PrepPilot home"
    >
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-tight">
        Prep<span className="text-primary">Pilot</span>
      </span>
    </Link>
  );
}
