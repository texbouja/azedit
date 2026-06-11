import { useEffect, type RefObject } from "react";
import { EditorView } from "@codemirror/view";

type TextPoint = {
  node: Text;
  start: number;
  end: number;
};

function normalizeTypography(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ");
}

function normalizeChar(char: string): string {
  if (char === "\u00a0" || /\s/.test(char)) return " ";
  if (char === "“" || char === "”") return "\"";
  if (char === "‘" || char === "’") return "'";
  return char;
}

function buildTextMap(nodes: Text[]): { text: string; points: TextPoint[] } {
  let text = "";
  const points: TextPoint[] = [];
  let lastWasSpace = false;

  for (const node of nodes) {
    const content = node.textContent ?? "";
    for (let i = 0; i < content.length; i += 1) {
      const char = normalizeChar(content[i]);
      if (char === " ") {
        if (lastWasSpace) continue;
        lastWasSpace = true;
      } else {
        lastWasSpace = false;
      }

      text += char;
      points.push({ node, start: i, end: i + 1 });
    }
  }

  return { text, points };
}

function buildSourceMap(source: string): { text: string; offsets: number[] } {
  let text = "";
  const offsets: number[] = [];
  let lastWasSpace = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = normalizeChar(source[i]);
    if (char === " ") {
      if (lastWasSpace) continue;
      lastWasSpace = true;
    } else {
      lastWasSpace = false;
    }

    text += char;
    offsets.push(i);
  }

  return { text, offsets };
}

function findInNormalizedSource(source: string, needle: string, targetOffset = 0): number {
  const { text, offsets } = buildSourceMap(source);
  const idx = nearestOccurrence(text, needle, targetOffset);
  return idx >= 0 ? offsets[idx] : -1;
}

function stripMarkdown(text: string): string {
  return normalizeTypography(text)
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .replace(/^[\s>#*-]+/gm, "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nearestOccurrence(haystack: string, needle: string, targetOffset: number): number {
  let best = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  let idx = haystack.indexOf(needle);

  while (idx >= 0) {
    const distance = Math.abs(idx - targetOffset);
    if (distance < bestDistance) {
      best = idx;
      bestDistance = distance;
    }
    idx = haystack.indexOf(needle, idx + Math.max(needle.length, 1));
  }

  return best;
}

function findTextInDOM(root: HTMLElement, text: string, targetOffset = 0): Range | null {
  if (!text || !text.trim()) return null;
  const needle = normalizeTypography(text).trim();
  if (!needle) return null;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) nodes.push(n as Text);

  const { text: fullText, points } = buildTextMap(nodes);
  const idx = nearestOccurrence(fullText, needle, targetOffset);
  if (idx < 0) return null;

  const startPoint = points[idx];
  const endPoint = points[idx + needle.length - 1];
  if (!startPoint || !endPoint) return null;

  const range = document.createRange();
  range.setStart(startPoint.node, startPoint.start);
  range.setEnd(endPoint.node, endPoint.end);
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
    const onMouseUp = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      const text = sel.toString();
      if (!text.trim()) return;

      const prose = document.querySelector<HTMLElement>(".mdv-prose");
      const editorContent = document.querySelector<HTMLElement>(".mdv-editor .cm-content");
      const anchor = sel.anchorNode;

      if (prose && anchor && prose.contains(anchor)) {
        const view = viewRef.current;
        if (!view) return;

        const doc = view.state.doc;
        const anchorElement = anchor instanceof Element ? anchor : anchor.parentElement;
        const block = anchorElement?.closest<HTMLElement>("[data-sline]");
        const needle = normalizeTypography(text).trim();
        let idx = -1;

        if (block) {
          const startLine = Number(block.dataset.sline);
          const endLine = Number(block.dataset.eline ?? startLine + 1);

          if (Number.isFinite(startLine) && startLine + 1 <= doc.lines) {
            const from = doc.line(startLine + 1).from;
            const toLine = Math.min(Math.max(endLine, startLine + 1), doc.lines);
            const to = doc.line(toLine).to;
            const localIdx = findInNormalizedSource(doc.sliceString(from, to), needle);
            if (localIdx >= 0) idx = from + localIdx;
          }
        }

        if (idx < 0) idx = findInNormalizedSource(doc.toString(), needle);
        if (idx < 0) return;

        view.dispatch({
          selection: { anchor: idx, head: idx + text.length },
          effects: EditorView.scrollIntoView(idx, { y: "center" }),
        });
        return;
      }

      if (editorContent && anchor && editorContent.contains(anchor)) {
        if (!prose) return;
        const view = viewRef.current;
        if (!view) return;

        const stripped = stripMarkdown(text);
        if (!stripped) return;

        const doc = view.state.doc;
        const selFrom = view.state.selection.main.from;
        const selLine = doc.lineAt(selFrom).number - 1;
        let scope: HTMLElement | null = null;

        for (const el of prose.querySelectorAll<HTMLElement>("[data-sline]")) {
          const startLine = Number(el.dataset.sline);
          const endLine = Number(el.dataset.eline ?? startLine + 1);
          if (selLine >= startLine && selLine < endLine) {
            if (!scope || scope.contains(el)) scope = el;
          }
        }

        let range: Range | null = null;
        if (scope) {
          const startLine = Number(scope.dataset.sline);
          if (Number.isFinite(startLine) && startLine + 1 <= doc.lines) {
            const from = doc.line(startLine + 1).from;
            const localOffset = stripMarkdown(doc.sliceString(from, selFrom)).length;
            range = findTextInDOM(scope, stripped, localOffset);
          }
        }

        range ??= findTextInDOM(prose, stripped);
        if (!range) return;

        const domSel = window.getSelection();
        if (domSel) {
          domSel.removeAllRanges();
          domSel.addRange(range);
        }
      }
    };

    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, [viewRef, rebindKey]);
}
