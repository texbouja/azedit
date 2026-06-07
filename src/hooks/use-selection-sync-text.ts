import { useEffect, type RefObject } from "react";
import { EditorView } from "@codemirror/view";

function findTextInDOM(root: HTMLElement, text: string): Range | null {
  if (!text || !text.trim()) return null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) nodes.push(n as Text);

  const fullText = nodes.map((tn) => tn.textContent ?? "").join("");
  const idx = fullText.indexOf(text);
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
    const onMouseUp = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;
      const text = sel.toString();
      if (!text.trim()) return;

      const prose = document.querySelector<HTMLElement>(".mdv-prose");
      const editorContent = document.querySelector<HTMLElement>(".mdv-editor .cm-content");
      const anchor = sel.anchorNode;

      if (prose && anchor && prose.contains(anchor)) {
        // Preview → Editor
        const view = viewRef.current;
        if (!view) return;
        const src = view.state.doc.toString();
        const idx = src.indexOf(text);
        if (idx < 0) return;
        view.dispatch({
          selection: { anchor: idx, head: idx + text.length },
          effects: EditorView.scrollIntoView(idx, { y: "center" }),
        });
        return;
      }

      if (editorContent && anchor && editorContent.contains(anchor)) {
        // Editor → Preview
        if (!prose) return;
        const range = findTextInDOM(prose, text);
        if (!range) return;
        const domSel = window.getSelection();
        if (domSel) {
          domSel.removeAllRanges();
          domSel.addRange(range);
          // scroll the matched element into view
          const el = range.startContainer.parentElement;
          el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      }
    };

    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, [viewRef, rebindKey]);
}
