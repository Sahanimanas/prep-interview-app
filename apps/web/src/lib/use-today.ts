"use client";

import { useSyncExternalStore } from "react";
import { toISODateLocal } from "./format";

const noopSubscribe = () => () => {};

/**
 * Today's local date as YYYY-MM-DD, or null during server prerendering. Reading the clock via
 * useSyncExternalStore keeps it out of the prerendered shell (Cache Components forbids reading
 * the current time while prerendering) without a setState-in-effect round trip.
 */
export function useTodayISO(): string | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => toISODateLocal(new Date()),
    () => null,
  );
}
