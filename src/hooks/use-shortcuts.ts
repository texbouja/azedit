import { useEffect } from "react";

export type ShortcutHandler = (event: KeyboardEvent) => void;

/**
 * Map keys like "mod+b" / "mod+shift+o" / "esc" to handlers.
 * `mod` = ⌘ on macOS, Ctrl elsewhere. Match is case-insensitive on the letter.
 *
 * useShortcuts({
 *   "mod+k": () => setPaletteOpen(true),
 *   "mod+s": () => save(),
 * });
 */
export function useShortcuts(map: Record<string, ShortcutHandler>): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const shift = e.shiftKey;
      const alt = e.altKey;
      const key = e.key.toLowerCase();

      for (const [combo, handler] of Object.entries(map)) {
        const parts = combo.toLowerCase().split("+").map((s) => s.trim());
        const needsMod = parts.includes("mod") || parts.includes("cmd") || parts.includes("ctrl");
        const needsShift = parts.includes("shift");
        const needsAlt = parts.includes("alt") || parts.includes("option");
        const wantKey = parts[parts.length - 1];

        if (key !== wantKey) continue;
        if (needsMod !== mod) continue;
        if (needsShift !== shift) continue;
        if (needsAlt !== alt) continue;

        handler(e);
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [map]);
}
