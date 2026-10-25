import type { Metadata } from "next";
import { Suspense } from "react";
import { MockView } from "@/components/mocks/mock-view";
import { PageSkeleton } from "@/components/ui/skeleton";

// Authenticated per-user data is fetched on the client (React Query), so navigations into
// this segment are intentionally not instant; opt out of dev-time instant-nav validation.
export const instant = false;

export const metadata: Metadata = { title: "Mock interview" };

export default function MockPage({ params }: { params: Promise<{ planId: string; mockId: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton label="Loading interview…" />}>
      <MockView params={params} />
    </Suspense>
  );
}
