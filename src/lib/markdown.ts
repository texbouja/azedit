import MarkdownIt from "markdown-it";
import mark from "markdown-it-mark";
import taskLists from "markdown-it-task-lists";
import { createHighlighter, type Highlighter } from "shiki";
import type { Theme } from "./theme";
import { STORAGE_KEYS } from "./storage";
import type { MacroValue } from "./latex-macros";

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

// ── Markdown-it instance (lazy, requires MathJax via dynamic import) ──

let md: MarkdownIt | null = null;
let mdInit: Promise<void> | null = null;

// ── MathJax config injection ──────────────────────────────────────────────
//
// mathxyjax3 (loaded by markdown-it-mathjax3) overwrites globalThis.MathJax
// with its own config. We inject user macros by intercepting that assignment
// so that MathJax's TeX processor is initialised with the macros from the
// start — instead of relying on post-init tex2svg calls which may or may not
// persist in the macro dictionary depending on MathJax internals.
//
// macroConfig holds parsed macros (record of MacroValue) to be injected.
// Populated once from localStorage / config file; reused by the setter below.
let macroConfig: Record<string, MacroValue> | null = null;

async function loadMacroConfig(): Promise<Record<string, MacroValue> | null> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.latexMacros);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === "string" && parsed.trim()) {
          const { parseLatexMacros } = await import("./latex-macros");
          return parseLatexMacros(parsed).macros;
        }
      } catch {
        // raw wasn't JSON — maybe it's raw TeX (written manually)
        if (raw.trim()) {
          const { parseLatexMacros } = await import("./latex-macros");
          return parseLatexMacros(raw).macros;
        }
      }
    }
    // fall back to config file on disk
    const { loadMacrosFromConfig } = await import("./latex-macros");
    const fileRaw = await loadMacrosFromConfig();
    if (fileRaw && fileRaw.trim()) {
      localStorage.setItem(STORAGE_KEYS.latexMacros, JSON.stringify(fileRaw));
      const { parseLatexMacros } = await import("./latex-macros");
      return parseLatexMacros(fileRaw).macros;
    }
  } catch { /* no macros available */ }
  return null;
}

function installMacroInterceptor(parsed: Record<string, MacroValue>): void {
  const desc = Object.getOwnPropertyDescriptor(globalThis, "MathJax");
  let first = true;
  Object.defineProperty(globalThis, "MathJax", {
    get() { return undefined; },
    set(value) {
      if (first && value && typeof value === "object") {
        first = false;
        value.tex ??= {};
        value.tex.macros ??= {};
        Object.assign(value.tex.macros, parsed);
      }
      // restore original descriptor
      if (desc) {
        Object.defineProperty(globalThis, "MathJax", desc);
      } else {
        delete (globalThis as any).MathJax;
      }
      // re-apply the assignment (triggers the restored descriptor)
      (globalThis as any).MathJax = value;
    },
    configurable: true,
    enumerable: true,
  });
}

async function initMd(): Promise<MarkdownIt> {
  if (mdInit) return await mdInit, md!;
  mdInit = (async () => {
    // load + parse user macros BEFORE mathxyjax3 claims globalThis.MathJax
    macroConfig = await loadMacroConfig();
    if (macroConfig && Object.keys(macroConfig).length > 0) {
      installMacroInterceptor(macroConfig);
    }

    const mod = await import("markdown-it-mathjax3");
    const mathjax3 = mod.default;

    const instance = new MarkdownIt({
      html: false,
      linkify: true,
      typographer: true,
      breaks: false,
      highlight: (code, lang) => {
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
        } catch { return ""; }
      },
    });

    instance.use(taskLists, { enabled: false, label: true });
    instance.use(mark);
    instance.use(mathjax3);

    // Wrap mathjax3 output in CSS-classed containers so the preview
    // can style display vs inline math independently.
    // Also strip <mjx-assistive-mml> que mathxyjax3 génère avec un <style>
    // malformé (règle imbriquée invalide → le stylesheet MathJax est ignoré
    // → l'assistive MathML s'affiche superposé au SVG).
    const STRIP_ASSISTIVE = /<mjx-assistive-mml[\s\S]*?<\/mjx-assistive-mml>/g;
    const origInline = instance.renderer.rules.math_inline!;
    const origBlock = instance.renderer.rules.math_block!;
    instance.renderer.rules.math_inline = (tokens, idx, opts, env, self) => {
      const html = origInline(tokens, idx, opts, env, self);
      return `<span class="mdv-math-inline">${html.replace(STRIP_ASSISTIVE, '')}</span>`;
    };
    instance.renderer.rules.math_block = (tokens, idx, opts, env, self) => {
      const html = origBlock(tokens, idx, opts, env, self);
      return `<span class="mdv-math-block">${html.replace(STRIP_ASSISTIVE, '')}</span>`;
    };

    // stamp block tokens with their source line range
    instance.core.ruler.push("source_lines", (state) => {
      for (const token of state.tokens) {
        if (token.map && token.nesting !== -1) {
          token.attrSet("data-sline", String(token.map[0]));
          token.attrSet("data-eline", String(token.map[1]));
        }
      }
      return true;
    });

    // GitHub-style heading slugs
    const slugify = (text: string): string =>
      text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, "")
        .replace(/ /g, "-")
        .replace(/^-|-$/g, "");

    instance.renderer.rules.heading_open = (tokens, idx, options, _env, self) => {
      const inline = tokens[idx + 1];
      if (inline?.type === "inline") {
        const id = slugify(inline.content);
        if (id) tokens[idx].attrSet("id", id);
      }
      return self.renderToken(tokens, idx, options);
    };

    // fallback: after MathJax is initialised try tex2svg reseed
    // for any macros the config injection might have missed
    try {
      const mj = (globalThis as any).MathJax;
      if (macroConfig && mj?.tex2svg && Object.keys(macroConfig).length > 0) {
        const raw = localStorage.getItem(STORAGE_KEYS.latexMacros);
        let src = raw;
        if (src) {
          try { src = JSON.parse(src); } catch {}
        }
        if (src && src.trim()) {
          const ensure = src
            .replace(/\\newcommand\s*\*/g, '\\providecommand*')
            .replace(/\\newcommand(?![a-zA-Z])/g, '\\providecommand')
            .replace(
              /\\DeclareMathOperator\s*(\*?)\s*\{\\([a-zA-Z@]+)\}\s*\{([^}]+)\}/g,
              (_, star, cmd, op) =>
                `\\def\\${cmd}{\\operatorname${star}{${op}}}`
            );
          const reseed = src
            .replace(/\\newcommand\s*\*/g, '\\renewcommand*')
            .replace(/\\newcommand(?![a-zA-Z])/g, '\\renewcommand')
            .replace(
              /\\DeclareMathOperator\s*(\*?)\s*\{\\([a-zA-Z@]+)\}\s*\{([^}]+)\}/g,
              (_, star, cmd, op) =>
                `\\def\\${cmd}{\\operatorname${star}{${op}}}`
            );
          mj.tex2svg(ensure, { display: false });
          mj.tex2svg(reseed, { display: false });
        }
      }
    } catch (e) {
      console.error("AZedit: macro reseed fallback failed", e);
    }

    md = instance;
  })();
  await mdInit;
  return md!;
}

export async function ensureMarkdownReady(): Promise<void> {
  await Promise.all([getHighlighter(), initMd()]);
}

export async function renderMarkdown(src: string, theme: Theme): Promise<string> {
  const [h, instance] = await Promise.all([getHighlighter(), initMd()]);
  const shikiTheme = THEMES[theme];
  await ensureThemeLoaded(h, shikiTheme);
  await ensureLangsLoaded(h, extractLangs(src));
  activeShikiTheme = shikiTheme;
  return instance.render(src);
}
