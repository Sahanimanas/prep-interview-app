import type { Metadata } from "next";
import { Suspense } from "react";
import { QuizView } from "@/components/quizzes/quiz-view";
import { PageSkeleton } from "@/components/ui/skeleton";

// Authenticated per-user data is fetched on the client (React Query), so navigations into
// this segment are intentionally not instant; opt out of dev-time instant-nav validation.
export const instant = false;

export const metadata: Metadata = { title: "Quiz" };

export default function QuizPage({ params }: { params: Promise<{ planId: string; quizId: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton label="Loading quiz…" />}>
      <QuizView params={params} />
    </Suspense>
  );
}
