import type { Metadata } from "next";
import { Suspense } from "react";
import { PlanView } from "@/components/plans/plan-view";
import { PageSkeleton } from "@/components/ui/skeleton";

// Authenticated per-user data is fetched on the client (React Query), so navigations into
// this segment are intentionally not instant; opt out of dev-time instant-nav validation.
export const instant = false;

export const metadata: Metadata = { title: "Prep plan" };

export default function PlanPage({ params }: { params: Promise<{ planId: string }> }) {
  // Params are URL data: resolve them inside Suspense so the App Shell stays shareable.
  return (
    <Suspense fallback={<PageSkeleton label="Loading plan…" />}>
      <PlanView params={params} />
    </Suspense>
  );
}
