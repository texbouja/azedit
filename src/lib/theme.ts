import { useSyncExternalStore } from "react";
import { STORAGE_KEYS } from "./storage";

export type Theme = "latte" | "frappe" | "macchiato" | "mocha" | "matcha";
export type ThemeMode = "system" | Theme;

const VALID: ReadonlyArray<ThemeMode> = [
  "system",
  "latte",
  "frappe",
  "macchiato",
  "mocha",
  "matcha",
];

const STORAGE_KEY = STORAGE_KEYS.themeMode;
const MQ = "(prefers-color-scheme: dark)";

const listeners = new Set<() => void>();

function readMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v && (VALID as readonly string[]).includes(v)) return v as ThemeMode;
  } catch {
    // ignore
  }
  return "system";
}

function systemTheme(): Theme {
  if (typeof window === "undefined") return "latte";
  return window.matchMedia(MQ).matches ? "mocha" : "latte";
}

function resolve(mode: ThemeMode): Theme {
  return mode === "system" ? systemTheme() : mode;
}

function apply(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const resolved = resolve(mode);
  document.documentElement.setAttribute("data-theme", resolved);
  document.documentElement.setAttribute("data-theme-mode", mode);
}

export function setThemeMode(mode: ThemeMode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore
  }
  apply(mode);
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

const TRANSPARENCY_KEY = STORAGE_KEYS.transparency;

function readTransparency(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(TRANSPARENCY_KEY) === "on";
  } catch {
    return false;
  }
}

function applyTransparency(on: boolean): void {
  if (typeof document === "undefined") return;
  if (on) document.documentElement.setAttribute("data-transparency", "on");
  else document.documentElement.removeAttribute("data-transparency");
}

export function setTransparency(on: boolean): void {
  try {
    window.localStorage.setItem(TRANSPARENCY_KEY, on ? "on" : "off");
  } catch {
    // ignore
  }
  applyTransparency(on);
  listeners.forEach((fn) => fn());
}

if (typeof window !== "undefined") {
  apply(readMode());
  applyTransparency(readTransparency());
  const mq = window.matchMedia(MQ);
  const onSystemChange = () => {
    if (readMode() === "system") {
      apply("system");
      listeners.forEach((fn) => fn());
    }
  };
  mq.addEventListener("change", onSystemChange);
}

export function getSystemTheme(): Theme {
  return systemTheme();
}

export function useThemeMode(): { mode: ThemeMode; resolved: Theme; setMode: (m: ThemeMode) => void } {
  const mode = useSyncExternalStore(
    subscribe,
    readMode,
    () => "system" as ThemeMode,
  );
  return { mode, resolved: resolve(mode), setMode: setThemeMode };
}

export function useTransparency(): { on: boolean; set: (v: boolean) => void } {
  const on = useSyncExternalStore(subscribe, readTransparency, () => false);
  return { on, set: setTransparency };
}

export function useTheme(): Theme {
  return useThemeMode().resolved;
}
