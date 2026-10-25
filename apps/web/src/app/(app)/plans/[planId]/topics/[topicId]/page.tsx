import type { Metadata } from "next";
import { Suspense } from "react";
import { TopicView } from "@/components/topics/topic-view";
import { PageSkeleton } from "@/components/ui/skeleton";

// Authenticated per-user data is fetched on the client (React Query), so navigations into
// this segment are intentionally not instant; opt out of dev-time instant-nav validation.
export const instant = false;

export const metadata: Metadata = { title: "Topic" };

export default function TopicPage({ params }: { params: Promise<{ planId: string; topicId: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton label="Loading topic…" />}>
      <TopicView params={params} />
    </Suspense>
  );
}
