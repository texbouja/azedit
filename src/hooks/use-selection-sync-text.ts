import { useEffect, type RefObject } from "react";
import { EditorView } from "@codemirror/view";

function stripMarkdown(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")        // images → remove entirely
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")      // links → label only
    .replace(/\*{1,2}([^*\n]+)\*{1,2}/g, "$1")   // bold/italic
    .replace(/_{1,2}([^_\n]+)_{1,2}/g, "$1")     // underscore bold/italic
    .replace(/`([^`\n]+)`/g, "$1")                // inline code
    .replace(/^#{1,6}\s+/gm, "")                  // headings
    .replace(/^[-*+]\s+/gm, "")                   // unordered list markers
    .replace(/^\d+\.\s+/gm, "")                   // ordered list markers
    .replace(/^>\s*/gm, "")                       // blockquotes
    .replace(/\|/g, " ")                           // table pipes
    .replace(/\s{2,}/g, " ")                      // collapse extra whitespace
    .trim();
}

// markdown-it's typographer turns straight quotes into curly ones in the
// preview; normalize both sides before matching. Every replacement is 1:1 in
// length so computed indices remain valid on the original strings.
function normalizeTypography(text: string): string {
  return text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/ /g, " ");
}

// Find all occurrences of `needle` in `haystack`, return the start index of
// the one whose position is closest to `targetOffset` (an absolute char index).
function nearestOccurrence(haystack: string, needle: string, targetOffset: number): number {
  let bestIdx = -1;
  let bestDist = Infinity;
  let searchFrom = 0;
  while (true) {
    const found = haystack.indexOf(needle, searchFrom);
    if (found < 0) break;
    const dist = Math.abs(found - targetOffset);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = found;
    }
    searchFrom = found + 1;
  }
  return bestIdx;
}

function findTextInDOM(root: HTMLElement, text: string, targetOffset = 0): Range | null {
  if (!text || !text.trim()) return null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) nodes.push(n as Text);

  const fullText = normalizeTypography(nodes.map((tn) => tn.textContent ?? "").join(""));
  if (fullText.length === 0) return null;

  // Pick the occurrence nearest to the estimated absolute offset so that
  // duplicate words in the same area resolve to the correct instance.
  const idx = nearestOccurrence(fullText, normalizeTypography(text), targetOffset);
  if (idx < 0) return null;
  let pos = 0;
  let startNode: Text | null = null;
  let startOff = 0;
  let endNode: Text | null = null;
  let endOff = 0;

  for (const tn of nodes) {
    const len = tn.textContent?.length ?? 0;
    if (!startNode && pos + len > idx) {
      startNode = tn;
      startOff = idx - pos;
    }
    if (!endNode && pos + len >= idx + text.length) {
      endNode = tn;
      endOff = idx + text.length - pos;
      break;
    }
    pos += len;
  }

  if (!startNode || !endNode) return null;
  const range = document.createRange();
  range.setStart(startNode, startOff);
  range.setEnd(endNode, endOff);
  return range;
}

/**
 * Bidirectional text-selection sync between the editor and preview.
 *
 * - mouseup in preview → find selected text in the markdown source → set CM selection
 * - mouseup in editor  → find selected text in the preview DOM → set browser selection
 */
export function useSelectionSyncText(
  viewRef: RefObject<EditorView | null>,
  rebindKey?: unknown,
): void {
  useEffect(() => {
    // Remember the last selection we acted on. mouseup fires for ANY mouse
    // release — including scrollbar drags and stray clicks — while a previous
    // selection still lingers. Without this guard, scrolling via the scrollbar
    // re-runs the sync and its scrollIntoView snaps both panes back to the old
    // selection. We only act when the selection actually changed.
    let last: {
      anchorNode: Node | null;
      anchorOffset: number;
      focusNode: Node | null;
      focusOffset: number;
    } | null = null;

    const onMouseUp = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        last = null;
        return;
      }
      const text = sel.toString();
      if (!text.trim()) {
        last = null;
        return;
      }

      // same selection as last time → stray mouseup (e.g. scrollbar drag), skip
      if (
        last &&
        last.anchorNode === sel.anchorNode &&
        last.anchorOffset === sel.anchorOffset &&
        last.focusNode === sel.focusNode &&
        last.focusOffset === sel.focusOffset
      ) {
        return;
      }
      last = {
        anchorNode: sel.anchorNode,
        anchorOffset: sel.anchorOffset,
        focusNode: sel.focusNode,
        focusOffset: sel.focusOffset,
      };

      const prose = document.querySelector<HTMLElement>(".mdv-prose");
      const editorContent = document.querySelector<HTMLElement>(".mdv-editor .cm-content");
      const anchor = sel.anchorNode;

      if (prose && anchor && prose.contains(anchor)) {
        // Preview → Editor: the anchor's enclosing block carries its exact
        // source line range (data-sline/data-eline stamped at render time),
        // so we search only within those source lines.
        const view = viewRef.current;
        if (!view) return;
        const doc = view.state.doc;
        const anchorEl = anchor instanceof Element ? anchor : anchor.parentElement;
        const block = anchorEl?.closest<HTMLElement>("[data-sline]");
        const needle = normalizeTypography(text);
        let bestIdx = -1;
        if (block) {
          const s = Number(block.dataset.sline);
          const e = Math.min(Number(block.dataset.eline ?? s + 1), doc.lines);
          if (Number.isFinite(s) && s + 1 <= doc.lines) {
            const from = doc.line(s + 1).from; // data-sline is 0-based
            const to = doc.line(Math.max(e, s + 1)).to;
            const idx = normalizeTypography(doc.sliceString(from, to)).indexOf(needle);
            if (idx >= 0) bestIdx = from + idx;
          }
        }
        if (bestIdx < 0) {
          // fallback: plain search across the whole source
          bestIdx = normalizeTypography(doc.toString()).indexOf(needle);
        }
        if (bestIdx < 0) return;
        view.dispatch({
          selection: { anchor: bestIdx, head: bestIdx + text.length },
          effects: EditorView.scrollIntoView(bestIdx, { y: "center" }),
        });
        return;
      }

      if (editorContent && anchor && editorContent.contains(anchor)) {
        // Editor → Preview: resolve the selection's source line to its exact
        // preview block via data-sline, then search only inside that block.
        if (!prose) return;
        const stripped = stripMarkdown(text);
        if (!stripped) return;
        const view = viewRef.current;
        if (!view) return;
        const doc = view.state.doc;
        const selFrom = view.state.selection.main.from;
        const selLine = doc.lineAt(selFrom).number - 1; // 0-based
        let scope: HTMLElement | null = null;
        for (const el of prose.querySelectorAll<HTMLElement>("[data-sline]")) {
          const s = Number(el.dataset.sline);
          const e = Number(el.dataset.eline ?? s + 1);
          if (selLine >= s && selLine < e) {
            // keep the innermost (deepest) block containing the line
            if (!scope || scope.contains(el)) scope = el;
          }
        }
        let range: Range | null = null;
        if (scope) {
          // offset within the block: stripped length of source from block
          // start to selection start — disambiguates repeats in one paragraph
          const blockFrom = doc.line(Number(scope.dataset.sline) + 1).from;
          const localOffset = stripMarkdown(doc.sliceString(blockFrom, selFrom)).length;
          range = findTextInDOM(scope, stripped, localOffset);
        }
        range ??= findTextInDOM(prose, stripped, 0);
        if (!range) return;
        const domSel = window.getSelection();
        if (domSel) {
          domSel.removeAllRanges();
          domSel.addRange(range);
          // intentionally do NOT scroll: keep both panes' positions fixed,
          // only mirror the selection (scrolling here would echo through
          // useSyncScroll and jump the editor)
        }
      }
    };

    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, [viewRef, rebindKey]);
}
