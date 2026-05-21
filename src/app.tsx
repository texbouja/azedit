import { useCallback, useEffect, useMemo, useState } from "react";
import { Breadcrumb, StatusBar, TitleBar, type VimMode } from "@/components/chrome";
import { Editor, Preview, ReadingFind, Splitter } from "@/components/editor";
import { ContextMenu, Sidebar, type ContextMenuItem } from "@/components/files";
import { AboutOverlay, CommandPalette, DropOverlay, HelpOverlay, Toast, WelcomeOverlay } from "@/components/overlays";
import { TooltipRoot } from "@/components/primitives";
import {
  useContextMenu,
  useDebouncedValue,
  useFileOps,
  useFileSession,
  useNotifications,
  useOverlays,
  usePersistedState,
  useShortcuts,
  useSyncScroll,
  useUpdateFlow,
} from "@/hooks";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { openPath } from "@tauri-apps/plugin-opener";
import {
  basename,
  buildCommands,
  dirname,
  estimateTokens,
  exportPreviewToPdf,
  isMarkdownPath,
  PdfExportError,
  pickFolder,
  pickMarkdownFile,
  removeEntry,
  STORAGE_KEYS,
} from "@/lib";
import "./app.css";

export function App() {
  const {
    loadError,
    setLoadError,
    dismissLoadError,
    copyPulse,
    copyToast,
    dismissCopyToast,
    saveAsToast,
    dismissSaveAsToast,
    showSaveAsToast,
    copyMarkdown: copyMarkdownCore,
  } = useNotifications();

  const {
    source,
    setSource,
    savedContent,
    activePath,
    setActivePath,
    rootPath,
    setRootPath,
    saveStatus,
    recentFiles,
    externalReloadToast,
    dismissExternalReload,
    externalConflict,
    setExternalConflict,
    loadFile,
    loadDemo,
    saveNow,
    saveAs: saveAsCore,
    startNewBuffer,
    dirty,
  } = useFileSession({ onLoadError: setLoadError });

  const [sidebarOpen, setSidebarOpen] = usePersistedState<boolean>(
    STORAGE_KEYS.sidebarOpen,
    false,
  );
  const [sidebarWidth, setSidebarWidth] = usePersistedState<number>(
    STORAGE_KEYS.sidebarWidth,
    240,
  );
  const {
    treeVersion,
    bumpTree,
    editingPath,
    setEditingPath,
    newEntry,
    setNewEntry,
    handleMove,
    handleSubmitRename,
    handleSubmitNew,
    handleUndoFileOp,
  } = useFileOps({
    activePath,
    setActivePath,
    loadFile,
    startNewBuffer,
    onError: setLoadError,
  });

  const {
    paletteOpen,
    setPaletteOpen,
    helpOpen,
    setHelpOpen,
    aboutOpen,
    setAboutOpen,
    welcomeOpen,
    dismissWelcome,
    showWelcome,
    showHelp,
    showAbout,
  } = useOverlays();

  const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu();

  const {
    updateAvail,
    setUpdateAvail,
    updateInstalling,
    updateUpToDate,
    setUpdateUpToDate,
    handleApplyUpdate,
    handleManualUpdateCheck,
  } = useUpdateFlow({ onError: setLoadError });

  const [vimOn, setVimOn] = usePersistedState<boolean>(STORAGE_KEYS.vimMode, false);
  const [vimMode, setVimMode] = useState<VimMode | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen((v: boolean) => !v);
  }, [setSidebarOpen]);

  const exportToPdf = useCallback(async () => {
    try {
      await exportPreviewToPdf({ source, activePath });
    } catch (err) {
      const message = err instanceof PdfExportError
        ? err.message
        : "couldn't export to pdf";
      console.error("marka.md: pdf export failed", err);
      setLoadError({ message });
    }
  }, [source, activePath]);


  const toggleFullscreen = useCallback(async () => {
    const win = getCurrentWindow();
    try {
      const isFs = await win.isFullscreen();
      await win.setFullscreen(!isFs);
    } catch (err) {
      console.error("marka.md: fullscreen toggle failed", err);
    }
  }, []);

  const [readingMode, setReadingMode] = useState(false);
  const [editorOnly, setEditorOnly] = useState(false);
  // reading + editor-only are mutually exclusive view modes
  const toggleReadingMode = useCallback(() => {
    setReadingMode((v) => {
      const next = !v;
      if (next) setEditorOnly(false);
      return next;
    });
  }, []);
  const exitReadingMode = useCallback(() => setReadingMode(false), []);
  const toggleEditorOnly = useCallback(() => {
    setEditorOnly((v) => {
      const next = !v;
      if (next) setReadingMode(false);
      return next;
    });
  }, []);

  // ⌘F only bound while reading — CM owns it in editor mode.
  const [findOpen, setFindOpen] = useState(false);
  const [proseEl, setProseEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!readingMode) {
      setProseEl(null);
      setFindOpen(false);
      return;
    }
    // wait one frame for Preview to render its <article class="mdv-prose">
    const id = window.requestAnimationFrame(() => {
      setProseEl(document.querySelector<HTMLElement>(".mdv-prose"));
    });
    return () => window.cancelAnimationFrame(id);
  }, [readingMode]);

  const copyMarkdown = useCallback(() => copyMarkdownCore(source), [copyMarkdownCore, source]);

  const debouncedPreview = useDebouncedValue(source, 50);

  // proportional editor <-> preview scroll sync; rebinds when active file changes
  useSyncScroll({ rebindKey: activePath ?? "untitled" });

  const { words, minutes, docTokens } = useMemo(() => {
    const trimmed = source.trim();
    const w = trimmed.length ? trimmed.split(/\s+/).length : 0;
    const m = Math.max(1, Math.round(w / 220));
    const t = estimateTokens(source);
    return { words: w, minutes: m, docTokens: t };
  }, [source]);

  // wraps useFileSession's saveAs to bump the sidebar tree + show landing toast.
  const saveAs = useCallback(async () => {
    const target = await saveAsCore();
    if (!target) return;
    bumpTree();
    showSaveAsToast(`saved to ${basename(target)}`);
  }, [saveAsCore, bumpTree, showSaveAsToast]);

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
    startNewBuffer();
  }, [startNewBuffer]);

  const contextItems = useMemo<ContextMenuItem[]>(() => {
    if (!contextMenu) return [];
    const { path, isDir } = contextMenu;
    const items: ContextMenuItem[] = [
      {
        label: "rename",
        onSelect: () => setEditingPath(path),
      },
    ];
    if (isDir) {
      items.push("divider");
      items.push({
        label: "new file",
        onSelect: () => setNewEntry({ parent: path, kind: "file" }),
      });
      items.push({
        label: "new folder",
        onSelect: () => setNewEntry({ parent: path, kind: "folder" }),
      });
    } else {
      items.push("divider");
      items.push({
        label: "reveal in finder",
        onSelect: () => void openPath(dirname(path)),
      });
      items.push({
        label: "open in default app",
        onSelect: () => void openPath(path),
      });
    }
    items.push("divider");
    items.push({
      label: isDir ? "delete folder" : "delete",
      destructive: true,
      onSelect: () => {
        const name = basename(path);
        const msg = isDir
          ? `delete folder "${name}" and everything inside it?\n\nthis cannot be undone.`
          : `delete "${name}"?\n\nthis cannot be undone.`;
        if (!window.confirm(msg)) return;
        void (async () => {
          try {
            await removeEntry(path, isDir);
            // if the deleted file was active, clear the editor back to demo
            if (!isDir && activePath === path) {
              loadDemo();
            }
            // if the deleted folder contained the active file, clear too
            if (isDir && activePath && activePath.startsWith(path + "/")) {
              loadDemo();
            }
            bumpTree();
          } catch (err) {
            console.error("marka.md: delete failed", err);
            setLoadError({ message: `couldn't delete: ${String(err)}` });
          }
        })();
      },
    });
    return items;
  }, [contextMenu, activePath, setActivePath, bumpTree]);

  // OS "Open With → marka.md" from Finder — Rust emits marka:open-file
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen<string>("marka:open-file", (event) => {
      const path = event.payload;
      if (typeof path === "string" && path.length > 0) {
        void loadFile(path);
      }
    }).then((un) => {
      unlisten = un;
    });
    return () => {
      unlisten?.();
    };
  }, [loadFile]);

  // OS drop. dragDropEnabled is OFF so Tauri doesn't intercept. counter guards
  // nested dragenter/leave firing multiple times.
  useEffect(() => {
    let enterCount = 0;

    const isOsFileDrag = (e: DragEvent) => {
      if (!e.dataTransfer) return false;
      // never engage on in-app sidebar drags
      if (e.dataTransfer.types.includes("application/x-marka-path")) return false;
      return e.dataTransfer.types.includes("Files");
    };

    const reset = () => {
      enterCount = 0;
      setDragActive(false);
    };

    const onDragEnter = (e: DragEvent) => {
      if (!isOsFileDrag(e)) return;
      enterCount += 1;
      if (enterCount === 1) setDragActive(true);
    };

    const onDragOver = (e: DragEvent) => {
      if (!isOsFileDrag(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };

    const onDragLeave = (e: DragEvent) => {
      if (!isOsFileDrag(e)) return;
      enterCount = Math.max(0, enterCount - 1);
      if (enterCount === 0) setDragActive(false);
    };

    const onDrop = async (e: DragEvent) => {
      if (!isOsFileDrag(e)) {
        // safety: any drop that lands on window resets state
        reset();
        return;
      }
      e.preventDefault();
      reset();
      const files = Array.from(e.dataTransfer?.files ?? []);
      const firstMd = files.find((f) => isMarkdownPath(f.name));
      if (firstMd) {
        // WKWebView doesn't expose file path; load content as an untitled buffer.
        try {
          const text = await firstMd.text();
          startNewBuffer(text);
        } catch (err) {
          console.error("marka.md: file drop read failed", err);
          setLoadError({ message: `could not read ${firstMd.name} — ${err}` });
        }
      } else if (files.length > 0) {
        setLoadError({
          message: "only .md / .markdown / .mdx files can be opened in marka.md",
        });
      }
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    // safety: any of these end the drag for sure — keeps state from sticking
    window.addEventListener("dragend", reset);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("dragend", reset);
      window.removeEventListener("blur", reset);
    };
  }, [setActivePath]);

  const shortcuts = useMemo(
    () => ({
      "mod+k": (e: KeyboardEvent) => {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      },
      "mod+/": (e: KeyboardEvent) => {
        e.preventDefault();
        setHelpOpen((v) => !v);
      },
      "mod+b": (e: KeyboardEvent) => {
        e.preventDefault();
        // functional update — avoids stale closure on rapid double-tap when
        // shortcuts memo hasn't rebuilt yet
        setSidebarOpen((v: boolean) => !v);
      },
      "mod+s": (e: KeyboardEvent) => {
        e.preventDefault();
        if (activePath) {
          // existing file — only write if dirty
          if (source !== savedContent) void saveNow(activePath, source);
        } else {
          // untitled buffer — open native save dialog (resolves #17 save half + macOS parity)
          void saveAs();
        }
      },
      "mod+shift+s": (e: KeyboardEvent) => {
        e.preventDefault();
        // explicit "save as" — works on both untitled and existing buffers
        void saveAs();
      },
      "mod+n": (e: KeyboardEvent) => {
        e.preventDefault();
        handleNewFile();
      },
      "mod+o": (e: KeyboardEvent) => {
        e.preventDefault();
        void handleOpenFile();
      },
      "mod+shift+o": (e: KeyboardEvent) => {
        e.preventDefault();
        void handleOpenFolder();
      },
      "mod+shift+c": (e: KeyboardEvent) => {
        e.preventDefault();
        void copyMarkdown();
      },
      "mod+p": (e: KeyboardEvent) => {
        e.preventDefault();
        exportToPdf();
      },
      "mod+ctrl+f": (e: KeyboardEvent) => {
        e.preventDefault();
        void toggleFullscreen();
      },
      "mod+.": (e: KeyboardEvent) => {
        e.preventDefault();
        toggleReadingMode();
      },
      "mod+shift+.": (e: KeyboardEvent) => {
        e.preventDefault();
        toggleEditorOnly();
      },
      escape: (e: KeyboardEvent) => {
        if (readingMode) {
          e.preventDefault();
          exitReadingMode();
        }
      },
      // ⌘F / Ctrl+F — only active in reading mode. In editor mode, codemirror
      // owns ⌘F via its searchKeymap (editor.tsx:105).
      ...(readingMode
        ? {
            "mod+f": (e: KeyboardEvent) => {
              e.preventDefault();
              setFindOpen(true);
            },
          }
        : {}),
    }),
    [
      activePath,
      source,
      savedContent,
      saveNow,
      saveAs,
      handleOpenFile,
      handleOpenFolder,
      handleNewFile,
      handleToggleSidebar,
      copyMarkdown,
      exportToPdf,
      toggleFullscreen,
      readingMode,
      toggleReadingMode,
      exitReadingMode,
      toggleEditorOnly,
    ],
  );
  useShortcuts(shortcuts);

  const commands = useMemo(
    () =>
      buildCommands({
        newFile: handleNewFile,
        openFile: handleOpenFile,
        openFolder: handleOpenFolder,
        save: () => {
          if (activePath && source !== savedContent) {
            void saveNow(activePath, source);
          }
        },
        toggleSidebar: handleToggleSidebar,
        toggleReading: toggleReadingMode,
        showHelp,
        showWelcome,
        showAbout,
        loadDemo,
        undoFileOp: handleUndoFileOp,
        checkForUpdates: handleManualUpdateCheck,
        copyMarkdown,
        exportToPdf,
        toggleFullscreen,
        openRecent: (path: string) => void loadFile(path),
        recentFiles,
        hasActivePath: activePath != null,
        sidebarOpen,
        readingMode,
        editorOnly,
        toggleEditorOnly,
      }),
    [
      handleNewFile,
      handleOpenFile,
      handleOpenFolder,
      activePath,
      source,
      savedContent,
      saveNow,
      sidebarOpen,
      copyMarkdown,
      showHelp,
      showWelcome,
      showAbout,
      loadDemo,
      handleUndoFileOp,
      handleManualUpdateCheck,
      exportToPdf,
      toggleFullscreen,
      handleToggleSidebar,
      loadFile,
      recentFiles,
    ],
  );

  const displayName = activePath ? basename(activePath) : undefined;

  return (
    <div
      className={`mdv-app${sidebarOpen ? " has-sidebar" : ""}${readingMode ? " is-reading" : ""}`}
    >
      <TitleBar
        fileName={displayName}
        filePath={activePath}
        dirty={dirty}
        readingMode={readingMode}
        onToggleReading={toggleReadingMode}
        onCopyMarkdown={activePath || source ? () => void copyMarkdown() : undefined}
        copyPulse={copyPulse}
        onExportPdf={exportToPdf}
        vimOn={vimOn}
        onToggleVim={() => setVimOn((v) => !v)}
      />

      <Breadcrumb
        sidebarOpen={sidebarOpen}
        onToggleSidebar={handleToggleSidebar}
        rootPath={rootPath}
        activePath={activePath}
        saveStatus={saveStatus}
        onNewFile={handleNewFile}
        onOpenFile={handleOpenFile}
        onOpenFolder={handleOpenFolder}
        onCopyMarkdown={activePath || source ? () => void copyMarkdown() : undefined}
        copyPulse={copyPulse}
      />

      <main className="mdv-shell">
        {readingMode ? (
          <>
            <Preview source={debouncedPreview} />
            <ReadingFind
              open={findOpen}
              onClose={() => setFindOpen(false)}
              scope={proseEl}
              contentKey={debouncedPreview}
            />
          </>
        ) : (
          <>
            <Sidebar
              open={sidebarOpen}
              rootPath={rootPath}
              activePath={activePath}
              width={sidebarWidth}
              onWidthChange={setSidebarWidth}
              onOpenFolder={handleOpenFolder}
              onSelectFile={(path) => void loadFile(path)}
              onMove={handleMove}
              onContextMenu={handleContextMenu}
              editingPath={editingPath}
              onSubmitRename={handleSubmitRename}
              onCancelEdit={() => setEditingPath(null)}
              newEntry={newEntry}
              onSubmitNew={handleSubmitNew}
              onCancelNew={() => setNewEntry(null)}
              treeVersion={treeVersion}
            />
            {editorOnly ? (
              <div className="mdv-shell__editor-solo">
                <Editor value={source} onChange={setSource} vimOn={vimOn} onVimMode={setVimMode} />
              </div>
            ) : (
              <Splitter
                left={<Editor value={source} onChange={setSource} vimOn={vimOn} onVimMode={setVimMode} />}
                right={<Preview source={debouncedPreview} />}
              />
            )}
          </>
        )}
      </main>

      <Toast
        open={loadError != null}
        message={loadError?.message ?? ""}
        onDismiss={dismissLoadError}
        action={
          loadError?.path
            ? {
                label: "open in default app",
                onClick: async () => {
                  if (loadError.path) {
                    try {
                      await openPath(loadError.path);
                    } catch (err) {
                      console.error("marka.md: openPath failed", err);
                    }
                  }
                },
              }
            : undefined
        }
      />

      <Toast
        open={copyToast && loadError == null}
        message="copied to clipboard · paste anywhere"
        variant="info"
        onDismiss={dismissCopyToast}
      />

      <Toast
        open={saveAsToast != null && loadError == null}
        message={saveAsToast ?? ""}
        variant="info"
        onDismiss={dismissSaveAsToast}
      />

      <Toast
        open={updateAvail != null && loadError == null}
        message={
          updateInstalling
            ? `installing v${updateAvail?.version}…`
            : `update available · v${updateAvail?.version}`
        }
        variant="info"
        durationMs={null}
        onDismiss={() => setUpdateAvail(null)}
        action={
          updateInstalling
            ? undefined
            : { label: "install", onClick: () => void handleApplyUpdate() }
        }
      />

      <Toast
        open={updateUpToDate && loadError == null && updateAvail == null}
        message="you're on the latest version 🐙"
        variant="info"
        onDismiss={() => setUpdateUpToDate(false)}
      />

      <Toast
        open={externalReloadToast && loadError == null}
        message="file changed externally · reloaded"
        variant="info"
        onDismiss={dismissExternalReload}
      />

      <Toast
        open={externalConflict != null && loadError == null}
        message="this file changed externally · your unsaved edits would be lost"
        variant="info"
        durationMs={null}
        onDismiss={() => setExternalConflict(null)}
        action={{
          label: "reload (discard mine)",
          onClick: () => {
            if (externalConflict != null) {
              setSource(externalConflict);
            }
            setExternalConflict(null);
          },
        }}
      />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
      />

      <HelpOverlay
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        onReplayTutorial={showWelcome}
      />

      <AboutOverlay
        open={aboutOpen}
        onClose={() => setAboutOpen(false)}
        onCheckForUpdates={handleManualUpdateCheck}
      />

      <WelcomeOverlay
        open={welcomeOpen}
        onClose={dismissWelcome}
        onOpenFolder={handleOpenFolder}
      />

      <DropOverlay active={dragActive} />
      <TooltipRoot />

      <ContextMenu
        open={contextMenu != null}
        x={contextMenu?.x ?? 0}
        y={contextMenu?.y ?? 0}
        items={contextItems}
        onClose={closeContextMenu}
      />

      <StatusBar
        fileName={displayName}
        words={words}
        minutes={minutes}
        docTokens={docTokens}
        onShowHelp={() => setHelpOpen(true)}
        vimMode={readingMode ? null : vimMode}
      />
    </div>
  );
}
