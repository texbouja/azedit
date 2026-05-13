import { open } from "@tauri-apps/plugin-dialog";
import { readDir, readTextFile, writeTextFile, exists } from "@tauri-apps/plugin-fs";

export type FileEntry = {
  name: string;
  path: string;
  isDir: boolean;
};

export async function pickFolder(): Promise<string | null> {
  const result = await open({
    directory: true,
    multiple: false,
    title: "open folder",
  });
  if (typeof result === "string") return result;
  return null;
}

export async function pickMarkdownFile(): Promise<string | null> {
  const result = await open({
    multiple: false,
    title: "open markdown",
    filters: [{ name: "markdown", extensions: ["md", "markdown", "mdx"] }],
  });
  if (typeof result === "string") return result;
  return null;
}

const MARKDOWN_EXT = /\.(md|markdown|mdx)$/i;

export function isMarkdownPath(path: string): boolean {
  return MARKDOWN_EXT.test(path);
}

export function basename(path: string): string {
  const i = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return i >= 0 ? path.slice(i + 1) : path;
}

export function dirname(path: string): string {
  const i = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return i > 0 ? path.slice(0, i) : "/";
}

function joinPath(parent: string, child: string): string {
  const sep = parent.includes("\\") ? "\\" : "/";
  if (parent.endsWith(sep)) return `${parent}${child}`;
  return `${parent}${sep}${child}`;
}

export async function listFolder(path: string): Promise<FileEntry[]> {
  const entries = await readDir(path);
  return entries
    .filter((e) => !e.name.startsWith("."))
    .map((e) => ({
      name: e.name,
      path: joinPath(path, e.name),
      isDir: e.isDirectory,
    }))
    .sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export async function readMarkdown(path: string): Promise<string> {
  return readTextFile(path);
}

export async function writeMarkdown(path: string, content: string): Promise<void> {
  await writeTextFile(path, content);
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    return await exists(path);
  } catch {
    return false;
  }
}
