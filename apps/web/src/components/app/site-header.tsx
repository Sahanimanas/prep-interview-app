"use client";

import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { Logo } from "./logo";
import { ThemeCycleButton } from "./theme-toggle";

/** Glassy marketing header; adapts its CTA to the auth state. */
export function SiteHeader() {
  const { status } = useAuth();

  return (
    <header className="pp-glass sticky top-0 z-40 border-b border-border/60">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
        <Logo />
        <nav aria-label="Primary" className="hidden items-center gap-1 text-sm font-medium text-fg-muted md:flex">
          <a href="#how" className="rounded-lg px-3 py-2 hover:bg-surface-muted hover:text-fg">
            How it works
          </a>
          <a href="#features" className="rounded-lg px-3 py-2 hover:bg-surface-muted hover:text-fg">
            Features
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeCycleButton />
          {status === "loading" && <Skeleton className="h-9 w-28 rounded-full" />}
          {status === "unauthenticated" && (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                Log in
              </ButtonLink>
              <ButtonLink href="/register" size="sm">
                Get started
              </ButtonLink>
            </>
          )}
          {status === "authenticated" && (
            <ButtonLink href="/dashboard" size="sm" rightIcon={<ArrowRight className="size-4" aria-hidden />}>
              Dashboard
            </ButtonLink>
          )}
        </div>
      </div>
    </header>
  );
}
