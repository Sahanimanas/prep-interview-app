const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const shortDateFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });

/** Parse a YYYY-MM-DD date as a *local* calendar date (not UTC midnight). */
export function parseISODate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function formatDate(isoDateOrDateTime: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(isoDateOrDateTime)
    ? parseISODate(isoDateOrDateTime)
    : new Date(isoDateOrDateTime);
  return Number.isNaN(date.getTime()) ? isoDateOrDateTime : dateFormatter.format(date);
}

export function formatShortDate(isoDate: string): string {
  const date = parseISODate(isoDate);
  return Number.isNaN(date.getTime()) ? isoDate : shortDateFormatter.format(date);
}

/** Format a Date as YYYY-MM-DD in local time (for <input type="date">). */
export function toISODateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Whole calendar days from `from` to the YYYY-MM-DD `target` (local dates). */
export function daysBetween(from: Date, target: string): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = parseISODate(target);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export function addDays(from: Date, days: number): Date {
  const next = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

export function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `${Math.round(value)}%`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}
