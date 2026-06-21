import { type ReactNode } from "react";

export type Language = "en";

export type Translate = (key: string, vars?: Record<string, string | number>) => string;

function interpolate(key: string, vars?: Record<string, string | number>): string {
  if (!vars) return key;
  return key.replace(/\{(\w+)\}/g, (_, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : `{${name}}`,
  );
}

/* eslint-disable @typescript-eslint/quotes */
const STRINGS: Record<string, string> = {
  "app.newFile": "New file",
  "app.exportPdf": "Export PDF",
  "app.pdfFailed": "PDF export failed",
  "app.savedTo": "Saved to {name}",
  "app.openDefault": "Open with default app",
  "app.openAsText": "Open as text",
  "app.dropMarkdownOnly": "Drop a markdown or CSV file",
  "app.fileReloaded": "File reloaded from disk",
  "app.fileConflict": "File was modified externally",
  "app.reloadDiscard": "Reload (discard changes)",
  "app.fileSingular": "{count} file",
  "app.filePlural": "{count} files",
  "tabs.closeUnsaved": "Close {name} without saving?",
  "menu.rename": "Rename",
  "menu.copyPath": "Copy path",
  "menu.copyRelativePath": "Copy relative path",
  "menu.pathCopied": "Path copied",
  "menu.revealExplorer": "Reveal in file manager",
  "menu.newFile": "New file",
  "menu.newFolder": "New folder",
  "menu.openDefault": "Open with default app",
  "menu.delete": "Delete",
  "menu.deleteFolder": "Delete folder",
  "menu.confirmDelete": "Delete {name}?",
  "menu.confirmDeleteFolder": "Delete folder {name}? This cannot be undone.",
  "command.recentHint": "{dir}",
  "command.openFolderLabel": "Open folder",
  "command.openFolderHint": "Add a folder to the sidebar",
  "command.openFileLabel": "Open file",
  "command.openFileHint": "Open a markdown or CSV file",
  "command.newFileHint": "Create a new untitled buffer",
  "command.save": "Save",
  "command.saveHintReady": "Save the current file",
  "command.saveHintEmpty": "No file open",
  "command.undoFileOp": "Undo last file operation",
  "command.undoFileOpHint": "Undo rename, move, or create",
  "command.hideSidebar": "Hide sidebar",
  "command.showSidebar": "Show sidebar",
  "command.sidebarHint": "Toggle the file tree panel",
  "command.exitReading": "Exit reading mode",
  "command.enterReading": "Reading mode",
  "command.backToSplit": "Back to split view",
  "command.readingHint": "Full-width preview, no editor",
  "command.exitEditorOnly": "Exit editor-only",
  "command.enterEditorOnly": "Editor only",
  "command.editorOnlyHint": "Hide the preview pane",
  "command.fullscreen": "Toggle fullscreen",
  "command.fullscreenHint": "Maximise the window",
  "command.copyMarkdown": "Copy markdown",
  "command.copyMarkdownHint": "Copy the raw markdown source",
  "command.exportPdfHint": "Open in browser to save as PDF",
  "command.themePrefix": "{theme}",
  "command.transparencyOn": "Transparency on",
  "command.transparencyOnHint": "Enable window background transparency",
  "command.transparencyOff": "Transparency off",
  "command.transparencyOffHint": "Disable background transparency",
  "command.showHelp": "Keyboard shortcuts",
  "command.showHelpHint": "Show all keyboard shortcuts",
  "command.demo": "Open demo file",
  "command.demoHint": "Load the built-in example document",
  "command.tutorial": "Replay tutorial",
  "command.tutorialHint": "Show the welcome guide again",
  "command.about": "About AZEdit",
  "command.aboutHint": "Version info and credits",
  "diagram.openViewer": "Open diagram viewer",
  "sidebar.context": "Context",
  "sidebar.tokens": "{tokens} tokens",
  "title.language": "Language",
};
/* eslint-enable @typescript-eslint/quotes */

export function useI18n(): { t: Translate; language: Language; setLanguage: (lang: Language) => void } {
  const t: Translate = (key, vars) => {
    const template = STRINGS[key] ?? key;
    return interpolate(template, vars);
  };
  return { t, language: "en", setLanguage: () => undefined };
}

export const LANGUAGE_CHOICES: Array<{ value: Language; label: string; nativeLabel: string }> = [
  { value: "en", label: "English", nativeLabel: "English" },
];

export function I18nProvider({ children }: { children: ReactNode }): ReactNode {
  return children;
}
