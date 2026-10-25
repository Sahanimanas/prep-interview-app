import type { Metadata } from "next";
import { Suspense } from "react";
import { NewPlanWizard } from "@/components/plans/new-plan-wizard";
import { PageSkeleton } from "@/components/ui/skeleton";

// Per-user data is fetched on the client (React Query); opt out of dev-time instant-nav validation.
export const instant = false;

export const metadata: Metadata = { title: "New prep plan" };

export default function NewPlanPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewPlanWizard />
    </Suspense>
  );
}
