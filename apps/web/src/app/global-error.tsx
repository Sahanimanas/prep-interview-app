"use client";

import "./globals.css";

export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
        <title>Something went wrong · PrepPilot</title>
        <h1 className="text-2xl font-semibold tracking-tight">PrepPilot hit an unexpected error</h1>
        <p className="mt-2 max-w-md text-fg-muted">Please try again. If the problem continues, reload the page.</p>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-8 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-fg hover:bg-primary-hover"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
