"use client";

import { useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY } from "./theme-script";

export type ThemePref = "system" | "light" | "dark";

const listeners = new Set<() => void>();
let mediaBound = false;

function readPref(): ThemePref {
  const value = document.documentElement.getAttribute("data-theme-pref");
  return value === "light" || value === "dark" ? value : "system";
}

function applyTheme(pref: ThemePref) {
  const root = document.documentElement;
  const dark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.setAttribute("data-theme-pref", pref);
  root.setAttribute("data-theme", dark ? "dark" : "light");
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!mediaBound) {
    mediaBound = true;
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (readPref() === "system") {
        applyTheme("system");
        listeners.forEach((l) => l());
      }
    });
  }
  return () => {
    listeners.delete(listener);
  };
}

export function setThemePref(pref: ThemePref) {
  try {
    if (pref === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    // Storage may be unavailable (private mode); the choice still applies for this page view.
  }
  applyTheme(pref);
  listeners.forEach((l) => l());
}

export function useThemePref(): ThemePref {
  return useSyncExternalStore(subscribe, readPref, () => "system");
}
