import MarkdownIt from "markdown-it";
import { createHighlighter, type Highlighter } from "shiki";
import type { Theme } from "./theme";

const LANGS = ["markdown", "ts", "tsx", "js", "jsx", "json", "rust", "bash", "css", "html", "python", "go"];
const THEMES = {
  latte: "catppuccin-latte",
  frappe: "catppuccin-frappe",
  macchiato: "catppuccin-macchiato",
  mocha: "catppuccin-mocha",
} as const;

let highlighterPromise: Promise<Highlighter> | null = null;
let highlighter: Highlighter | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [THEMES.latte, THEMES.frappe, THEMES.macchiato, THEMES.mocha],
      langs: LANGS,
    })
      .then((h) => {
        highlighter = h;
        return h;
      })
      .catch((err) => {
        console.error("mdview: shiki highlighter init failed", err);
        highlighterPromise = null;
        throw err;
      });
  }
  return highlighterPromise;
}

void getHighlighter().catch(() => {
  // already logged in getHighlighter
});

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: false,
  highlight: (code, lang) => {
    if (!highlighter) return "";
    const loaded = highlighter.getLoadedLanguages() as readonly string[];
    const language = loaded.includes(lang) ? lang : "text";
    try {
      return highlighter.codeToHtml(code, {
        lang: language,
        themes: {
          latte: THEMES.latte,
          frappe: THEMES.frappe,
          macchiato: THEMES.macchiato,
          mocha: THEMES.mocha,
        },
        defaultColor: false,
      });
    } catch {
      return "";
    }
  },
});

export async function ensureMarkdownReady(): Promise<void> {
  await getHighlighter();
}

export function renderMarkdown(src: string, _theme: Theme): string {
  return md.render(src);
}
