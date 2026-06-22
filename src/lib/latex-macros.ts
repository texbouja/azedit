import { appConfigDir, join } from "@tauri-apps/api/path";
import { writeTextFile, readTextFile, mkdir } from "@tauri-apps/plugin-fs";

// ── types ──────────────────────────────────────────────────────────────────

export type MacroValue =
  | string                       // \newcommand{\R}{\mathbb{R}}
  | [string, number]             // \newcommand{\v}[1]{\vec{#1}}
  | [string, number, string];    // \newcommand{\v}[2][{}]{\vec{#2}_{#1}}

export type LatexMacroConfig = {
  packages: string[];
  macros: Record<string, MacroValue>;
};

// ── low-level text utilities ───────────────────────────────────────────────

function stripComments(raw: string): string {
  return raw
    .split("\n")
    .map((line) => {
      for (let i = 0; i < line.length; i++) {
        if (line[i] === "\\") { i++; continue; }
        if (line[i] === "%") return line.slice(0, i);
      }
      return line;
    })
    .join("\n");
}

// Read a balanced {…} group. pos must point at the opening '{'.
// Returns [content_without_braces, pos_after_closing_brace].
function readBraceGroup(text: string, pos: number): [string, number] {
  if (text[pos] !== "{") throw new Error(`Expected '{' at ${pos}`);
  let depth = 0;
  let content = "";
  let i = pos;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "{") {
      depth++;
      if (depth > 1) content += ch;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) return [content, i + 1];
      content += ch;
    } else {
      content += ch;
    }
    i++;
  }
  throw new Error("Unmatched '{'");
}

// Read a balanced […] group. pos must point at '['.
// Returns [content_without_brackets, pos_after_']'] or null if no '[' at pos.
function readBracketGroup(text: string, pos: number): [string, number] | null {
  if (pos >= text.length || text[pos] !== "[") return null;
  let depth = 0;
  let content = "";
  let i = pos;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "[") {
      depth++;
      if (depth > 1) content += ch;
    } else if (ch === "]") {
      depth--;
      if (depth === 0) return [content, i + 1];
      content += ch;
    } else {
      content += ch;
    }
    i++;
  }
  return null;
}

function skipSpaces(text: string, pos: number): number {
  while (pos < text.length && /[ \t\r\n]/.test(text[pos])) pos++;
  return pos;
}

// Read a command name (letters only) starting at pos (after the backslash).
// Returns [name, pos_after_name].
function readCmdName(text: string, pos: number): [string, number] {
  let name = "";
  while (pos < text.length && /[a-zA-Z@]/.test(text[pos])) {
    name += text[pos++];
  }
  return [name, pos];
}

// Read the macro name argument: either {\cmdname} or \cmdname.
// Returns [macroname_without_backslash, pos_after] or null on failure.
function readMacroNameArg(text: string, pos: number): [string, number] | null {
  pos = skipSpaces(text, pos);
  if (pos >= text.length) return null;

  if (text[pos] === "{") {
    // {\cmdname} form
    try {
      const [inner, end] = readBraceGroup(text, pos);
      const m = inner.trim().match(/^\\([a-zA-Z@]+)$/);
      if (!m) return null;
      return [m[1], end];
    } catch {
      return null;
    }
  }

  if (text[pos] === "\\") {
    // \cmdname form (without braces around it)
    pos++;
    const [name, end] = readCmdName(text, pos);
    if (!name) return null;
    return [name, end];
  }

  return null;
}

// ── parser ─────────────────────────────────────────────────────────────────

export function parseLatexMacros(raw: string): LatexMacroConfig {
  const packages: string[] = [];
  const macros: Record<string, MacroValue> = {};

  const text = stripComments(raw);
  let i = 0;

  while (i < text.length) {
    // Skip non-backslash characters
    if (text[i] !== "\\") { i++; continue; }

    i++; // consume '\'
    const [cmdName, afterCmd] = readCmdName(text, i);
    i = afterCmd;

    // ── \require{pkgname} ────────────────────────────────────────────────
    if (cmdName === "require") {
      i = skipSpaces(text, i);
      if (i < text.length && text[i] === "{") {
        try {
          const [pkg, end] = readBraceGroup(text, i);
          const name = pkg.trim();
          if (name && !packages.includes(name)) packages.push(name);
          i = end;
        } catch { /* ignore malformed */ }
      }
      continue;
    }

    // ── \newcommand / \renewcommand / \providecommand ────────────────────
    if (
      cmdName === "newcommand" ||
      cmdName === "renewcommand" ||
      cmdName === "providecommand"
    ) {
      // 1. macro name
      const nameResult = readMacroNameArg(text, i);
      if (!nameResult) continue;
      const [macroName, afterName] = nameResult;
      i = afterName;

      i = skipSpaces(text, i);

      // 2. optional [n] — number of arguments
      let numArgs = 0;
      const nResult = readBracketGroup(text, i);
      if (nResult) {
        numArgs = parseInt(nResult[0].trim(), 10);
        if (isNaN(numArgs) || numArgs < 0 || numArgs > 9) numArgs = 0;
        i = nResult[1];
      }

      i = skipSpaces(text, i);

      // 3. optional [default] — default value for #1
      let optDefault: string | null = null;
      if (numArgs > 0) {
        const optResult = readBracketGroup(text, i);
        if (optResult) {
          optDefault = optResult[0];
          i = optResult[1];
        }
      }

      i = skipSpaces(text, i);

      // 4. {definition}
      if (i >= text.length || text[i] !== "{") continue;
      let def = "";
      try {
        const [d, end] = readBraceGroup(text, i);
        def = d;
        i = end;
      } catch { continue; }

      if (!macroName) continue;

      if (numArgs === 0) {
        macros[macroName] = def;
      } else if (optDefault === null) {
        macros[macroName] = [def, numArgs];
      } else {
        macros[macroName] = [def, numArgs, optDefault];
      }
      continue;
    }

    // ── \DeclareMathOperator[*]{\cmd}{op} ───────────────────────────────
    if (cmdName === "DeclareMathOperator") {
      // Check for optional star
      i = skipSpaces(text, i);
      const star = i < text.length && text[i] === "*";
      if (star) i++;

      const nameResult = readMacroNameArg(text, i);
      if (!nameResult) continue;
      const [macroName, afterName] = nameResult;
      i = afterName;

      i = skipSpaces(text, i);

      if (i >= text.length || text[i] !== "{") continue;
      let op = "";
      try {
        const [o, end] = readBraceGroup(text, i);
        op = o;
        i = end;
      } catch { continue; }

      if (!macroName) continue;
      macros[macroName] = star
        ? `\\operatorname*{${op}}`
        : `\\operatorname{${op}}`;
      continue;
    }

    // All other commands (\let, \def, \edef, \usepackage, …) — skip.
  }

  return { packages, macros };
}

// ── file I/O ───────────────────────────────────────────────────────────────

const CONFIG_FILE = "mathjax-macros.json";

async function configFilePath(): Promise<string> {
  const dir = await appConfigDir();
  return join(dir, CONFIG_FILE);
}

export async function saveMacrosToConfig(raw: string): Promise<void> {
  const config = parseLatexMacros(raw);
  const json = JSON.stringify(config, null, 2);
  const dir = await appConfigDir();
  await mkdir(dir, { recursive: true });
  const path = await configFilePath();
  await writeTextFile(path, json);
}

export async function loadMacrosFromConfig(): Promise<LatexMacroConfig | null> {
  try {
    const path = await configFilePath();
    const text = await readTextFile(path);
    return JSON.parse(text) as LatexMacroConfig;
  } catch {
    return null;
  }
}
