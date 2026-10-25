interface IssueLike {
  path: ReadonlyArray<PropertyKey>;
  message: string;
}

/** Flatten zod issues into `{ "dotted.path": "first message" }` — same shape as ApiError.fieldErrors. */
export function issuesToFieldErrors(issues: ReadonlyArray<IssueLike>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map((p) => String(p)).join(".");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
