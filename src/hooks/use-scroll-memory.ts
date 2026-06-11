import { useEffect, useRef } from "react";

type ScrollPosition = {
  editor: number;
  preview: number;
};

export function useScrollMemory(activePath: string | null): void {
  const memory = useRef(new Map<string, ScrollPosition>());

  useEffect(() => {
    const path = activePath;
    if (!path) return;

    const editorScroller = document.querySelector<HTMLElement>(".mdv-editor .cm-scroller");
    const preview = document.querySelector<HTMLElement>(".mdv-preview");

    const onEditorScroll = () => {
      if (!editorScroller) return;
      const prev = memory.current.get(path) ?? { editor: 0, preview: 0 };
      memory.current.set(path, { ...prev, editor: editorScroller.scrollTop });
    };
    const onPreviewScroll = () => {
      if (!preview) return;
      const prev = memory.current.get(path) ?? { editor: 0, preview: 0 };
      memory.current.set(path, { ...prev, preview: preview.scrollTop });
    };

    editorScroller?.addEventListener("scroll", onEditorScroll, { passive: true });
    preview?.addEventListener("scroll", onPreviewScroll, { passive: true });

    return () => {
      editorScroller?.removeEventListener("scroll", onEditorScroll);
      preview?.removeEventListener("scroll", onPreviewScroll);
    };
  }, [activePath]);

  useEffect(() => {
    const saved = activePath ? memory.current.get(activePath) : null;
    if (!saved) return;

    const id = window.requestAnimationFrame(() => {
      const editorScroller = document.querySelector<HTMLElement>(".mdv-editor .cm-scroller");
      const preview = document.querySelector<HTMLElement>(".mdv-preview");
      if (editorScroller) editorScroller.scrollTop = saved.editor;
      if (preview) preview.scrollTop = saved.preview;
    });

    return () => window.cancelAnimationFrame(id);
  }, [activePath]);
}
