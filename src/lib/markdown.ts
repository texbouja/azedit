import MarkdownIt from "markdown-it";
import mark from "markdown-it-mark";
import taskLists from "markdown-it-task-lists";
import { createHighlighter, type Highlighter } from "shiki";
import type { Theme } from "./theme";

// random suffix per render — mermaid id reuse across re-renders silently fails.
function mermaidId(): string {
  return `mdv-mermaid-${Math.random().toString(36).slice(2, 10)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// allowed langs — shiki chunks load on first use via ensureLangsLoaded.
const LANGS = [
  "markdown", "ts", "tsx", "js", "jsx", "json", "rust", "bash", "css", "html", "python", "go",
  "c", "cpp", "csharp", "objective-c",
  "java", "kotlin", "scala", "groovy",
  "swift",
  "ruby", "php", "lua", "perl", "r", "elixir", "haskell",
  "sql", "yaml", "toml", "xml", "ini",
  "shellscript", "powershell", "dockerfile", "makefile", "nginx",
  "diff", "git-commit",
  "graphql", "protobuf", "regex", "vim", "jsonc",
] as const;

const THEMES = {
  latte: "catppuccin-latte",
  mono: "github-light",
  "mono-dark": "github-dark",
  frappe: "catppuccin-frappe",
  macchiato: "catppuccin-macchiato",
  mocha: "catppuccin-mocha",
  matcha: "vitesse-light",
  kanagawa: "kanagawa-wave",
  "rose-pine": "rose-pine",
  ayu: "ayu-dark",
} as const;

let highlighter: Highlighter | null = null;
let highlighterPromise: Promise<Highlighter> | null = null;
const loadedLangs = new Set<string>();
const loadedThemes = new Set<string>();
// read synchronously inside md.highlight; updated before md.render in renderMarkdown.
let activeShikiTheme: string = THEMES.latte;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({ themes: [], langs: [] })
      .then((h) => {
        highlighter = h;
        return h;
      })
      .catch((err) => {
        console.error("AZedit: shiki highlighter init failed", err);
        highlighterPromise = null;
        throw err;
      });
  }
  return highlighterPromise;
}

const FENCE_RE = /^[ \t]*```([a-zA-Z0-9_+\-]+)/gm;
function extractLangs(src: string): string[] {
  const found = new Set<string>();
  FENCE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = FENCE_RE.exec(src)) !== null) {
    const lang = m[1];
    if ((LANGS as readonly string[]).includes(lang)) found.add(lang);
  }
  return [...found];
}

async function ensureThemeLoaded(h: Highlighter, shikiTheme: string): Promise<void> {
  if (loadedThemes.has(shikiTheme)) return;
  await h.loadTheme(shikiTheme as Parameters<Highlighter["loadTheme"]>[0]);
  loadedThemes.add(shikiTheme);
}

async function ensureLangsLoaded(h: Highlighter, langs: string[]): Promise<void> {
  const toLoad = langs.filter((l) => !loadedLangs.has(l));
  if (toLoad.length === 0) return;
  await Promise.all(
    toLoad.map((l) => h.loadLanguage(l as Parameters<Highlighter["loadLanguage"]>[0])),
  );
  toLoad.forEach((l) => loadedLangs.add(l));
}

// ── MathJax bridge plugin ─────────────────────────────────────────────────
// Emits raw LaTeX wrapped in MathJax delimiters \(...\) and \[...\].
// Registered before the escape rule so _ ^ \ inside math are not consumed.
function mathPlugin(instance: MarkdownIt): void {
  // Block rule: lines starting with $$ ... closing $$
  instance.block.ruler.before("fence", "math_block", (state, startLine, endLine, silent) => {
    const pos = state.bMarks[startLine] + state.tShift[startLine];
    const max = state.eMarks[startLine];

    if (pos + 1 >= max) return false;
    if (state.src[pos] !== "$" || state.src[pos + 1] !== "$") return false;
    // reject $$$ or more
    if (pos + 2 < max && state.src[pos + 2] === "$") return false;

    const afterOpen = state.src.slice(pos + 2, max).trim();

    if (silent) return true;

    let content: string;
    let closeLine: number;

    if (afterOpen.endsWith("$$") && afterOpen.length > 2) {
      // single-line: $$formula$$
      content = afterOpen.slice(0, -2).trim();
      closeLine = startLine;
    } else if (afterOpen.length > 0) {
      return false; // unclosed single-line — not a valid block
    } else {
      // multi-line: content between opening $$ and closing $$
      closeLine = startLine + 1;
      let found = false;
      while (closeLine < endLine) {
        const ls = state.bMarks[closeLine] + state.tShift[closeLine];
        const le = state.eMarks[closeLine];
        if (state.src.slice(ls, le).trim() === "$$") { found = true; break; }
        closeLine++;
      }
      if (!found) return false;
      content = state.getLines(startLine + 1, closeLine, 0, false).trim();
    }

    const token = state.push("math_block", "math", 0);
    token.block = true;
    token.content = content;
    token.map = [startLine, closeLine + 1];
    token.markup = "$$";
    state.line = closeLine + 1;
    return true;
  });

  // Inline rule: $...$ — registered before 'escape' so \, _, ^ inside are raw
  instance.inline.ruler.before("escape", "math_inline", (state, silent) => {
    const src = state.src;
    const pos = state.pos;

    if (src[pos] !== "$") return false;
    if (src[pos + 1] === "$") return false; // block handled above
    // skip price-style: "$ 5" or trailing "$"
    const after = src[pos + 1];
    if (!after || after === " " || after === "\t" || after === "\n") return false;

    let end = pos + 1;
    while (end <= state.posMax) {
      if (src[end] === "\\") { end += 2; continue; }
      if (src[end] === "$") break;
      end++;
    }
    if (end > state.posMax || src[end] !== "$") return false;
    // skip trailing space: "$ x $" with space before closing
    if (src[end - 1] === " " || src[end - 1] === "\t") return false;

    if (silent) return true;

    const token = state.push("math_inline", "math", 0);
    token.markup = "$";
    token.content = src.slice(pos + 1, end);
    state.pos = end + 1;
    return true;
  });

  // Renderer rules — wrap content in MathJax delimiters
  instance.renderer.rules["math_block"] = (tokens, idx) => {
    const c = tokens[idx].content;
    return `<div class="math-block">\\[\n${c}\n\\]</div>\n`;
  };

  instance.renderer.rules["math_inline"] = (tokens, idx) => {
    const c = tokens[idx].content;
    return `<span class="math-inline">\\(${c}\\)</span>`;
  };
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: false,
  highlight: (code, lang) => {
    // mermaid blocks bypass shiki — Preview component renders them as svg
    if (lang === "mermaid") {
      const id = mermaidId();
      const encoded = escapeHtml(code);
      return `<pre class="mdv-mermaid" id="${id}"><code>${encoded}</code></pre>`;
    }
    if (!highlighter) return "";
    const loaded = highlighter.getLoadedLanguages() as readonly string[];
    const language = loaded.includes(lang) ? lang : "text";
    try {
      return highlighter.codeToHtml(code, {
        lang: language,
        theme: activeShikiTheme,
      });
    } catch {
      return "";
    }
  },
});

md.use(taskLists, { enabled: false, label: true });
md.use(mark);
md.use(mathPlugin);

// stamp block tokens with their source line range so the preview DOM can be
// mapped back to exact positions in the markdown source (selection sync)
md.core.ruler.push("source_lines", (state) => {
  for (const token of state.tokens) {
    if (token.map && token.nesting !== -1) {
      token.attrSet("data-sline", String(token.map[0]));
      token.attrSet("data-eline", String(token.map[1]));
    }
  }
  return true;
});

// GitHub-style heading slugs for TOC anchor navigation
const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/ /g, "-")
    .replace(/^-|-$/g, "");

md.renderer.rules.heading_open = (tokens, idx, options, _env, self) => {
  const inline = tokens[idx + 1];
  if (inline?.type === "inline") {
    const id = slugify(inline.content);
    if (id) tokens[idx].attrSet("id", id);
  }
  return self.renderToken(tokens, idx, options);
};

export async function ensureMarkdownReady(): Promise<void> {
  await getHighlighter();
}

export async function renderMarkdown(src: string, theme: Theme): Promise<string> {
  const h = await getHighlighter();
  const shikiTheme = THEMES[theme];
  await ensureThemeLoaded(h, shikiTheme);
  await ensureLangsLoaded(h, extractLangs(src));
  activeShikiTheme = shikiTheme;
  return md.render(src);
}
