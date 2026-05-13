import { useEffect, useMemo, useRef, useState } from "react";
import { ensureMarkdownReady, renderMarkdown, useTheme } from "@/lib";

type PreviewProps = {
  source: string;
};

// hand-written lucide copy + check icons so we don't drag in react-dom/server
const COPY_ICON_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
const CHECK_ICON_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
const COPY_DEFAULT_HTML = `<span class="mdv-copy__icon mdv-copy__icon--default">${COPY_ICON_SVG}copy</span>`;
const COPY_DONE_HTML = `<span class="mdv-copy__icon mdv-copy__icon--done">${CHECK_ICON_SVG}copied</span>`;

function decorateCodeBlocks(root: HTMLElement): () => void {
  const cleanups: Array<() => void> = [];
  const blocks = Array.from(root.querySelectorAll("pre.shiki")) as HTMLPreElement[];

  blocks.forEach((pre) => {
    if (pre.parentElement?.classList.contains("mdv-codeblock")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "mdv-codeblock";
    pre.parentNode?.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mdv-copy";
    btn.setAttribute("aria-label", "copy code");
    btn.innerHTML = `${COPY_DEFAULT_HTML}${COPY_DONE_HTML}`;
    wrapper.appendChild(btn);

    const onClick = async (e: MouseEvent) => {
      e.preventDefault();
      const text = pre.textContent ?? "";
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
        } catch {
          // give up
        }
        document.body.removeChild(ta);
      }
      btn.classList.add("is-done");
      window.setTimeout(() => btn.classList.remove("is-done"), 1400);
    };

    btn.addEventListener("click", onClick);
    cleanups.push(() => btn.removeEventListener("click", onClick));
  });

  return () => cleanups.forEach((fn) => fn());
}

export function Preview({ source }: PreviewProps) {
  const theme = useTheme();
  const [ready, setReady] = useState(false);
  const articleRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    void ensureMarkdownReady().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const html = useMemo(() => renderMarkdown(source, theme), [source, theme, ready]);

  useEffect(() => {
    if (!articleRef.current) return;
    return decorateCodeBlocks(articleRef.current);
  }, [html]);

  return (
    <div className="mdv-preview" data-theme={theme}>
      <article
        ref={articleRef}
        className="mdv-prose"
        data-theme={theme}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
