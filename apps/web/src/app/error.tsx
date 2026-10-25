"use client";

import { ErrorView } from "@/components/app/error-view";

export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <main id="main" className="flex flex-1 flex-col">
      <ErrorView error={error} retry={retry} />
    </main>
  );
}
