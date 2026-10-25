import type { Metadata } from "next";
import { Logo } from "@/components/app/logo";
import { CompassIllustration } from "@/components/illustrations";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="pp-mesh flex min-h-dvh flex-1 flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
        <Logo />
      </header>
      <main id="main" className="flex flex-1 flex-col items-center justify-center px-4 pb-24 text-center">
        <div className="w-full max-w-xs">
          <CompassIllustration />
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-primary">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">We couldn&apos;t find that page</h1>
        <p className="mt-3 max-w-md text-fg-muted">
          The link may be broken, or the plan you&apos;re looking for may have been deleted.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/dashboard">Go to dashboard</ButtonLink>
          <ButtonLink href="/" variant="outline">
            Home
          </ButtonLink>
        </div>
      </main>
    </div>
  );
}
