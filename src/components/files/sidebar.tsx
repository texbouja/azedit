import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, FolderOpen, Search, X } from "lucide-react";
import { Button, Icon } from "@/components/primitives";
import { basename, dirname, walkMarkdownFiles, type FlatFileEntry } from "@/lib";
import emptyTowerUrl from "@/assets/mascot/empty-m.png";
import { FileTree } from "./file-tree";

type SidebarProps = {
  open: boolean;
  rootPath: string | null;
  activePath: string | null;
  selectedPaths: ReadonlySet<string>;
  width: number;
  onWidthChange: (next: number) => void;
  onOpenFolder: () => void;
  onSelectFile: (path: string) => void;
  onToggleSelection: (path: string) => void;
  onClearSelection: () => void;
  onCopyBundle: () => void;
};

const MIN_WIDTH = 180;
const MAX_WIDTH = 420;

export function Sidebar({
  open,
  rootPath,
  activePath,
  selectedPaths,
  width,
  onWidthChange,
  onOpenFolder,
  onSelectFile,
  onToggleSelection,
  onClearSelection,
  onCopyBundle,
}: SidebarProps) {
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(width);

  const onResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      draggingRef.current = true;
      startXRef.current = e.clientX;
      startWidthRef.current = width;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [width],
  );

  const onResizePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      const delta = e.clientX - startXRef.current;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidthRef.current + delta));
      onWidthChange(next);
    },
    [onWidthChange],
  );

  const stopResize = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // pointer already released
    }
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  const [query, setQuery] = useState("");
  // reset search when the folder changes
  useEffect(() => {
    setQuery("");
  }, [rootPath]);

  const selectedCount = selectedPaths.size;

  return (
    <aside
      className={`mdv-sidebar${open ? " is-open" : ""}`}
      style={{ width: open ? `${width}px` : "0px" }}
      aria-hidden={!open}
    >
      <div className="mdv-sidebar__inner" style={{ width: `${width}px` }}>
        <header className="mdv-sidebar__header">
          <span className="mdv-sidebar__title">
            {rootPath ? basename(rootPath) : "no folder"}
          </span>
          <Button
            title="open folder (⌘⇧O)"
            aria-label="open folder"
            onClick={onOpenFolder}
            icon={<Icon icon={FolderOpen} size={13} strokeWidth={1.5} />}
          />
        </header>
        {rootPath ? (
          <SidebarSearch
            rootPath={rootPath}
            value={query}
            onChange={setQuery}
          />
        ) : null}
        <div className="mdv-sidebar__body">
          {rootPath ? (
            query.trim().length > 0 ? (
              <SearchResults
                rootPath={rootPath}
                query={query}
                activePath={activePath}
                onSelect={onSelectFile}
              />
            ) : (
              <FileTree
                rootPath={rootPath}
                activePath={activePath}
                selectedPaths={selectedPaths}
                onSelect={onSelectFile}
                onToggleSelection={onToggleSelection}
              />
            )
          ) : (
            <button type="button" className="mdv-sidebar__empty" onClick={onOpenFolder}>
              <img
                src={emptyTowerUrl}
                alt=""
                aria-hidden
                width={72}
                height={68}
                draggable={false}
                className="mdv-sidebar__empty-art"
              />
              <span>open a folder</span>
              <span className="mdv-sidebar__hint">browse your markdown notes</span>
            </button>
          )}
        </div>
        {selectedCount > 0 ? (
          <footer className="mdv-sidebar__bundle">
            <div className="mdv-sidebar__bundle-info">
              <span className="mdv-sidebar__bundle-count">{selectedCount}</span>
              <span className="mdv-sidebar__bundle-label">
                {selectedCount === 1 ? "file selected" : "files selected"}
              </span>
            </div>
            <div className="mdv-sidebar__bundle-actions">
              <Button
                title="copy bundle to clipboard (⌘⇧C)"
                aria-label="copy bundle"
                onClick={onCopyBundle}
                icon={<Icon icon={Copy} size={12} strokeWidth={1.5} />}
              />
              <Button
                title="clear selection"
                aria-label="clear selection"
                onClick={onClearSelection}
                icon={<Icon icon={X} size={12} strokeWidth={1.5} />}
              />
            </div>
          </footer>
        ) : null}
      </div>

      <div
        className="mdv-sidebar__resize"
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={stopResize}
        onPointerCancel={stopResize}
        role="separator"
        aria-orientation="vertical"
        aria-label="resize sidebar"
      />
    </aside>
  );
}

type SidebarSearchProps = {
  rootPath: string;
  value: string;
  onChange: (next: string) => void;
};

function SidebarSearch({ value, onChange }: SidebarSearchProps) {
  return (
    <div className="mdv-sidebar__search">
      <span className="mdv-sidebar__search-icon" aria-hidden>
        <Icon icon={Search} size={12} strokeWidth={1.5} />
      </span>
      <input
        type="text"
        className="mdv-sidebar__search-input"
        placeholder="search markdown…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
      />
      {value.length > 0 ? (
        <button
          type="button"
          className="mdv-sidebar__search-clear"
          aria-label="clear search"
          onClick={() => onChange("")}
        >
          <Icon icon={X} size={11} strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}

type SearchResultsProps = {
  rootPath: string;
  query: string;
  activePath: string | null;
  onSelect: (path: string) => void;
};

const MAX_RESULTS = 80;

function SearchResults({ rootPath, query, activePath, onSelect }: SearchResultsProps) {
  const [index, setIndex] = useState<FlatFileEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIndex(null);
    walkMarkdownFiles(rootPath)
      .then((items) => {
        if (!cancelled) setIndex(items);
      })
      .catch(() => {
        if (!cancelled) setIndex([]);
      });
    return () => {
      cancelled = true;
    };
  }, [rootPath]);

  const results = useMemo(() => {
    if (!index) return null;
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: FlatFileEntry[] = [];
    for (const e of index) {
      if (e.rel.toLowerCase().includes(q)) {
        out.push(e);
        if (out.length >= MAX_RESULTS) break;
      }
    }
    return out;
  }, [index, query]);

  if (!index) return <div className="mdv-tree__loading">indexing…</div>;
  if (results && results.length === 0) {
    return <div className="mdv-tree__empty">no matches</div>;
  }

  return (
    <ul className="mdv-search-results" role="listbox">
      {results?.map((r) => {
        const dir = dirname(r.rel);
        const isActive = r.path === activePath;
        return (
          <li key={r.path}>
            <button
              type="button"
              className={`mdv-search-result${isActive ? " is-active" : ""}`}
              title={r.path}
              onClick={() => onSelect(r.path)}
            >
              <span className="mdv-search-result__name">{r.name}</span>
              {dir && dir !== "/" ? (
                <span className="mdv-search-result__dir">{dir}</span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
