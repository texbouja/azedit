import { useEffect } from "react";

export type ShortcutHandler = (event: KeyboardEvent) => void;

const IS_MAC =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);

/**
 * Map keys like "mod+b" / "mod+shift+o" / "mod+ctrl+f" / "esc" to handlers.
 *
 * Modifier semantics:
 *   - `mod` (or `cmd`) = primary command modifier: ⌘ on macOS, Ctrl elsewhere
 *   - `ctrl` = literal Ctrl key — when paired with `mod` on macOS, requires BOTH
 *     ⌘ AND Ctrl (e.g. `mod+ctrl+f` = ⌃⌘F for fullscreen on mac)
 *   - `shift`, `alt`/`option` — exact match
 *
 * A bare `mod+x` shortcut REJECTS extra modifiers — e.g. on mac, `mod+f` will
 * only fire on ⌘F, NOT on ⌃⌘F. This prevents collisions between, say, the
 * reading-mode find (`mod+f`) and fullscreen (`mod+ctrl+f`).
 *
 * useShortcuts({
 *   "mod+k": () => setPaletteOpen(true),
 *   "mod+s": () => save(),
 *   "mod+ctrl+f": () => toggleFullscreen(),
 * });
 */
export function useShortcuts(map: Record<string, ShortcutHandler>): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cmdKey = e.metaKey;
      const ctrlKey = e.ctrlKey;
      const shift = e.shiftKey;
      const alt = e.altKey;
      const key = e.key.toLowerCase();

      for (const [combo, handler] of Object.entries(map)) {
        const parts = combo.toLowerCase().split("+").map((s) => s.trim());
        const hasMod = parts.includes("mod") || parts.includes("cmd");
        const hasCtrl = parts.includes("ctrl");
        const needsShift = parts.includes("shift");
        const needsAlt = parts.includes("alt") || parts.includes("option");
        const wantKey = parts[parts.length - 1];

        if (key !== wantKey) continue;

        // platform-aware modifier matching:
        //   "mod+x"        → primary modifier only; reject any extra ctrl on mac
        //   "mod+ctrl+x"   → primary + literal Ctrl (mac: ⌘+⌃, non-mac: just ⌃)
        //   "ctrl+x"       → literal Ctrl only
        //   bare "escape"  → no modifiers allowed
        if (hasMod && hasCtrl) {
          if (IS_MAC) {
            if (!(cmdKey && ctrlKey)) continue;
          } else {
            // on non-mac, "mod" IS ctrl — combo collapses to ctrl+x
            if (!ctrlKey) continue;
          }
        } else if (hasMod) {
          if (IS_MAC) {
            if (!cmdKey) continue;
            if (ctrlKey) continue; // reject ⌃⌘X — that's a "mod+ctrl+x" combo
          } else {
            if (!ctrlKey) continue;
            if (cmdKey) continue;
          }
        } else if (hasCtrl) {
          if (!ctrlKey) continue;
          if (cmdKey) continue;
        } else {
          // bare key — reject any modifier
          if (cmdKey || ctrlKey) continue;
        }

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
