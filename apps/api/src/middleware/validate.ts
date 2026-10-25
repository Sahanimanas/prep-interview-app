import type { z } from 'zod';
import { badRequest } from '../lib/errors';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Parse untrusted input with a zod schema, throwing a 400 with field-level details. */
export function parse<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input ?? {});
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ path: i.path, message: i.message }));
    throw badRequest(details[0]?.message ?? 'Invalid request', details);
  }
  return result.data;
}

/** Route params are user input too: reject malformed ids before they reach Postgres. */
export function uuidParam(value: string | string[] | undefined, name = 'id'): string {
  const v = Array.isArray(value) ? value[0] : value;
  if (!v || !UUID_RE.test(v)) throw badRequest(`Invalid ${name}`);
  return v;
}
