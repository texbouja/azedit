import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CircleHelp,
  FilePlus2,
  FolderOpen,
  FolderPlus,
  Leaf,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Save,
  Sparkles,
  Sun,
} from "lucide-react";
import { Button, Icon } from "@/components/primitives";
import {
  Breadcrumb,
  CommandPalette,
  Editor,
  HelpOverlay,
  Preview,
  Sidebar,
  Splitter,
  TitleBar,
  type Command,
  type SaveStatus,
} from "@/components/features";
import { useDebouncedValue, usePersistedState } from "@/hooks";
import {
  basename,
  pickFolder,
  pickMarkdownFile,
  readMarkdown,
  setThemeMode,
  setTransparency,
  writeMarkdown,
  STORAGE_KEYS,
} from "@/lib";
import { DEMO_MARKDOWN } from "@/lib/demo";
import "./app.css";

const SAVED_FLASH_MS = 1200;

export function App() {
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
  const [sidebarOpen, setSidebarOpen] = usePersistedState<boolean>(
    STORAGE_KEYS.sidebarOpen,
    false,
  );
  const [sidebarWidth, setSidebarWidth] = usePersistedState<number>(
    STORAGE_KEYS.sidebarWidth,
    240,
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const debouncedPreview = useDebouncedValue(source, 50);

  const { words, minutes } = useMemo(() => {
    const trimmed = source.trim();
    const w = trimmed.length ? trimmed.split(/\s+/).length : 0;
    const m = Math.max(1, Math.round(w / 220));
    return { words: w, minutes: m };
  }, [source]);

  const dirty = activePath != null && source !== savedContent;

  const loadFile = useCallback(
    async (path: string) => {
      try {
        const content = await readMarkdown(path);
        setSource(content);
        setSavedContent(content);
        setActivePath(path);
        setSaveStatus("idle");
      } catch (err) {
        console.error("mdview: readMarkdown failed", err);
      }
    },
    [setActivePath],
  );

  const saveNow = useCallback(
    async (path: string, content: string) => {
      setSaveStatus("saving");
      try {
        await writeMarkdown(path, content);
        setSavedContent(content);
        setSaveStatus("saved");
        window.setTimeout(() => {
          setSaveStatus((s: SaveStatus) => (s === "saved" ? "idle" : s));
        }, SAVED_FLASH_MS);
      } catch (err) {
        console.error("mdview: writeMarkdown failed", err);
        setSaveStatus("dirty");
      }
    },
    [],
  );

  // mark dirty as soon as content diverges from disk
  useEffect(() => {
    if (!activePath) {
      setSaveStatus("idle");
      return;
    }
    if (source !== savedContent) {
      setSaveStatus((s: SaveStatus) => (s === "saving" ? s : "dirty"));
    }
  }, [source, savedContent, activePath]);

  const handleOpenFolder = useCallback(async () => {
    const folder = await pickFolder();
    if (folder) {
      setRootPath(folder);
      setSidebarOpen(true);
    }
  }, [setRootPath, setSidebarOpen]);

  const handleOpenFile = useCallback(async () => {
    const file = await pickMarkdownFile();
    if (file) {
      void loadFile(file);
    }
  }, [loadFile]);

  const handleNewFile = useCallback(() => {
    setSource("");
    setSavedContent("");
    setActivePath(null);
    setSaveStatus("idle");
  }, [setActivePath]);

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen(!sidebarOpen);
  }, [setSidebarOpen, sidebarOpen]);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (k === "/") {
        e.preventDefault();
        setHelpOpen((v) => !v);
      } else if (k === "b") {
        e.preventDefault();
        setSidebarOpen(!sidebarOpen);
      } else if (k === "s") {
        e.preventDefault();
        if (activePath && source !== savedContent) {
          void saveNow(activePath, source);
        }
      } else if (k === "n") {
        e.preventDefault();
        handleNewFile();
      } else if (k === "o" && !e.shiftKey) {
        e.preventDefault();
        void handleOpenFile();
      } else if (k === "o" && e.shiftKey) {
        e.preventDefault();
        void handleOpenFolder();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    sidebarOpen,
    activePath,
    source,
    savedContent,
    saveNow,
    handleOpenFile,
    handleOpenFolder,
    handleNewFile,
    setSidebarOpen,
  ]);

  const commands = useMemo<Command[]>(
    () => [
      {
        id: "new",
        label: "new file",
        hint: "start an untitled markdown buffer",
        shortcut: "⌘N",
        icon: FilePlus2,
        action: handleNewFile,
      },
      {
        id: "open-file",
        label: "open file…",
        hint: "pick a .md from your disk",
        shortcut: "⌘O",
        icon: FolderOpen,
        action: handleOpenFile,
      },
      {
        id: "open-folder",
        label: "open folder…",
        hint: "load a folder into the sidebar",
        shortcut: "⌘⇧O",
        icon: FolderPlus,
        action: handleOpenFolder,
      },
      {
        id: "save",
        label: "save",
        hint: activePath ? "write to disk" : "no file loaded — pick one first",
        shortcut: "⌘S",
        icon: Save,
        action: () => {
          if (activePath && source !== savedContent) {
            void saveNow(activePath, source);
          }
        },
      },
      {
        id: "toggle-sidebar",
        label: sidebarOpen ? "hide sidebar" : "show sidebar",
        shortcut: "⌘B",
        icon: sidebarOpen ? PanelLeftClose : PanelLeftOpen,
        action: () => setSidebarOpen(!sidebarOpen),
      },
      {
        id: "theme-system",
        label: "theme: system",
        hint: "follow macOS appearance",
        icon: Monitor,
        action: () => setThemeMode("system"),
      },
      {
        id: "theme-latte",
        label: "theme: latte",
        hint: "catppuccin light",
        icon: Sun,
        action: () => setThemeMode("latte"),
      },
      {
        id: "theme-matcha",
        label: "theme: matcha",
        hint: "washi paper + kelly green",
        icon: Leaf,
        action: () => setThemeMode("matcha"),
      },
      {
        id: "theme-frappe",
        label: "theme: frappé",
        hint: "catppuccin mid-dark",
        icon: Moon,
        action: () => setThemeMode("frappe"),
      },
      {
        id: "theme-macchiato",
        label: "theme: macchiato",
        hint: "catppuccin deeper dark",
        icon: Moon,
        action: () => setThemeMode("macchiato"),
      },
      {
        id: "theme-mocha",
        label: "theme: mocha",
        hint: "catppuccin deepest dark",
        icon: Moon,
        action: () => setThemeMode("mocha"),
      },
      {
        id: "transparency-on",
        label: "transparency: on",
        hint: "macOS vibrancy through the window",
        icon: Sparkles,
        action: () => setTransparency(true),
      },
      {
        id: "transparency-off",
        label: "transparency: off",
        hint: "solid window background",
        icon: Sparkles,
        action: () => setTransparency(false),
      },
      {
        id: "help",
        label: "show help",
        hint: "keyboard shortcuts + tips",
        shortcut: "⌘/",
        icon: CircleHelp,
        action: () => setHelpOpen(true),
      },
    ],
    [
      handleNewFile,
      handleOpenFile,
      handleOpenFolder,
      activePath,
      source,
      savedContent,
      saveNow,
      sidebarOpen,
      setSidebarOpen,
    ],
  );

  const displayName = activePath ? basename(activePath) : undefined;

  return (
    <div className={`mdv-app${sidebarOpen ? " has-sidebar" : ""}`}>
      <TitleBar
        fileName={displayName}
        dirty={dirty}
        onOpenFolder={handleOpenFolder}
        onOpenFile={handleOpenFile}
        onNewFile={handleNewFile}
      />

      <Breadcrumb
        sidebarOpen={sidebarOpen}
        onToggleSidebar={handleToggleSidebar}
        rootPath={rootPath}
        activePath={activePath}
        saveStatus={saveStatus}
      />

      <main className="mdv-shell">
        <Sidebar
          open={sidebarOpen}
          rootPath={rootPath}
          activePath={activePath}
          width={sidebarWidth}
          onWidthChange={setSidebarWidth}
          onOpenFolder={handleOpenFolder}
          onSelectFile={(path) => void loadFile(path)}
        />
        <Splitter
          left={<Editor value={source} onChange={setSource} />}
          right={<Preview source={debouncedPreview} />}
        />
      </main>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
      />

      <HelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />

      <footer className="mdv-statusbar">
        <div className="mdv-statusbar__group">
          <span>{displayName ?? "untitled"}</span>
        </div>
        <div className="mdv-statusbar__group">
          <span>{words} {words === 1 ? "word" : "words"}</span>
          <span>·</span>
          <span>{minutes} min read</span>
          <Button
            className="mdv-statusbar__help"
            title="how to use (⌘/)"
            aria-label="how to use"
            onClick={() => setHelpOpen(true)}
            icon={<Icon icon={CircleHelp} size={12} strokeWidth={1.5} />}
          />
        </div>
      </footer>
    </div>
  );
}
