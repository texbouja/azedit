import { useCallback, useEffect, useRef, useState } from "react";
import {
  joinPath,
  pathExists,
  pickSaveMarkdown,
  readMarkdown,
  STORAGE_KEYS,
  validateMarkdownFile,
  writeMarkdown,
} from "@/lib";
import { DEMO_MARKDOWN } from "@/lib/demo";
import type { SaveStatus } from "@/components/chrome";
import { usePersistedState } from "./use-persisted-state";
import { useFileWatcher } from "./use-file-watcher";

const SAVED_FLASH_MS = 1200;

export type LoadError = { message: string; path?: string };

type UseFileSessionArgs = {
  onLoadError?: (err: LoadError) => void;
};

type UseFileSessionResult = {
  source: string;
  setSource: (v: string) => void;
  savedContent: string;
  activePath: string | null;
  setActivePath: (v: string | null | ((p: string | null) => string | null)) => void;
  rootPath: string | null;
  setRootPath: (v: string | null | ((p: string | null) => string | null)) => void;
  saveStatus: SaveStatus;
  recentFiles: string[];
  setRecentFiles: (v: string[] | ((prev: string[]) => string[])) => void;
  externalReloadToast: boolean;
  dismissExternalReload: () => void;
  externalConflict: string | null;
  setExternalConflict: (v: string | null) => void;
  /** Accept fresh content from disk (external-change reload, "discard mine"). */
  acceptExternalChange: (fresh: string) => void;
  loadFile: (path: string) => Promise<void>;
  loadDemo: () => void;
  saveNow: (path: string, content: string) => Promise<void>;
  /** Picks save location + writes. Returns the chosen path (or null if cancelled). */
  saveAs: () => Promise<string | null>;
  /** Discard buffer, leave activePath null. Accepts optional initial text for OS-drop. */
  startNewBuffer: (initial?: string) => void;
  dirty: boolean;
};

export function useFileSession({ onLoadError }: UseFileSessionArgs = {}): UseFileSessionResult {
  const [source, setSource] = useState<string>(DEMO_MARKDOWN);
  const [savedContent, setSavedContent] = useState<string>(DEMO_MARKDOWN);
  const [activePath, setActivePath] = usePersistedState<string | null>(
    STORAGE_KEYS.lastFile,
    null,
  );
  const [rootPath, setRootPath] = usePersistedState<string | null>(
    STORAGE_KEYS.lastFolder,
    null,
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [recentFiles, setRecentFiles] = usePersistedState<string[]>(
    STORAGE_KEYS.recentFiles,
    [],
  );
  const [externalReloadToast, setExternalReloadToast] = useState(false);
  const [externalConflict, setExternalConflict] = useState<string | null>(null);

  const dismissExternalReload = useCallback(() => setExternalReloadToast(false), []);

  const acceptExternalChange = useCallback((fresh: string) => {
    setSource(fresh);
    setSavedContent(fresh);
    setSaveStatus("idle");
  }, []);

  const loadFile = useCallback(
    async (path: string) => {
      const check = await validateMarkdownFile(path);
      if (!check.ok) {
        onLoadError?.({ message: check.reason, path });
        console.warn("marka.md: refused to open", path, "·", check.reason);
        return;
      }
      try {
        const content = await readMarkdown(path);
        setSource(content);
        setSavedContent(content);
        setActivePath(path);
        setSaveStatus("idle");
        setRecentFiles((prev) => [path, ...prev.filter((p) => p !== path)].slice(0, 8));
      } catch (err) {
        console.error("marka.md: readMarkdown failed", err);
        onLoadError?.({ message: String(err), path });
      }
    },
    [setActivePath, setRecentFiles, onLoadError],
  );

  const loadDemo = useCallback(() => {
    setSource(DEMO_MARKDOWN);
    setSavedContent(DEMO_MARKDOWN);
    setActivePath(null);
    setSaveStatus("idle");
  }, [setActivePath]);

  const startNewBuffer = useCallback((initial: string = "") => {
    setSource(initial);
    setSavedContent(initial);
    setActivePath(null);
    setSaveStatus("idle");
    requestAnimationFrame(() => {
      const editor = document.querySelector<HTMLElement>(".mdv-editor .cm-content");
      editor?.focus();
    });
  }, [setActivePath]);

  const saveNow = useCallback(async (path: string, content: string) => {
    setSaveStatus("saving");
    try {
      await writeMarkdown(path, content);
      setSavedContent(content);
      setSaveStatus("saved");
      window.setTimeout(() => {
        setSaveStatus((s) => (s === "saved" ? "idle" : s));
      }, SAVED_FLASH_MS);
    } catch (err) {
      console.error("marka.md: writeMarkdown failed", err);
      setSaveStatus("dirty");
    }
  }, []);

  const saveAs = useCallback(async (): Promise<string | null> => {
    const defaultPath = activePath
      ?? (rootPath ? joinPath(rootPath, "untitled.md") : "untitled.md");
    const target = await pickSaveMarkdown(defaultPath);
    if (!target) return null;
    await saveNow(target, source);
    setActivePath(target);
    return target;
  }, [activePath, rootPath, source, saveNow, setActivePath]);

  // stable refs so handleExternalChange identity doesn't fluctuate with keystrokes.
  const sourceRef = useRef(source);
  const savedRef = useRef(savedContent);
  useEffect(() => {
    sourceRef.current = source;
  }, [source]);
  useEffect(() => {
    savedRef.current = savedContent;
  }, [savedContent]);

  const handleExternalChange = useCallback(async () => {
    if (!activePath) return;
    try {
      const fresh = await readMarkdown(activePath);
      if (fresh === sourceRef.current) return;
      const isDirty = sourceRef.current !== savedRef.current;
      if (!isDirty) {
        setSource(fresh);
        setSavedContent(fresh);
        setExternalReloadToast(true);
        window.setTimeout(() => setExternalReloadToast(false), 2400);
      } else {
        setExternalConflict(fresh);
      }
    } catch (err) {
      console.error("marka.md: external change reload failed", err);
    }
  }, [activePath]);
  useFileWatcher(activePath, handleExternalChange);

  // mount-only: restore last open file from persisted activePath.
  useEffect(() => {
    if (!activePath) return;
    let cancelled = false;
    void (async () => {
      try {
        const exists = await pathExists(activePath);
        if (cancelled) return;
        if (exists) {
          void loadFile(activePath);
        } else {
          setActivePath(null);
        }
      } catch (err) {
        console.warn("marka.md: session restore failed", err);
        if (!cancelled) setActivePath(null);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // mark dirty as soon as content diverges from disk
  useEffect(() => {
    if (!activePath) {
      setSaveStatus("idle");
      return;
    }
    if (source !== savedContent) {
      setSaveStatus((s) => (s === "saving" ? s : "dirty"));
    }
  }, [source, savedContent, activePath]);

  const dirty = activePath != null && source !== savedContent;

  return {
    source,
    setSource,
    savedContent,
    activePath,
    setActivePath,
    rootPath,
    setRootPath,
    saveStatus,
    recentFiles,
    setRecentFiles,
    externalReloadToast,
    dismissExternalReload,
    externalConflict,
    setExternalConflict,
    acceptExternalChange,
    loadFile,
    loadDemo,
    saveNow,
    saveAs,
    startNewBuffer,
    dirty,
  };
}
