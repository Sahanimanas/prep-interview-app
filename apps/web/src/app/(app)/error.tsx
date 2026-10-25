"use client";

import { ErrorView } from "@/components/app/error-view";

export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorView error={error} retry={retry} />;
}
