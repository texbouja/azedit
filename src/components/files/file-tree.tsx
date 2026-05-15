import { useCallback, useEffect, useState } from "react";
import { ChevronRight, FileText, Folder, FolderOpen } from "lucide-react";
import { Icon } from "@/components/primitives";
import { listFolder, type FileEntry } from "@/lib";
import sadUrl from "@/assets/mascot/sad.png";

const DRAG_MIME = "application/x-marka-path";

type FileTreeProps = {
  rootPath: string;
  activePath: string | null;
  onSelect: (path: string) => void;
  onMove?: (src: string, dstParent: string) => void;
  treeVersion?: number;
  depth?: number;
};

export function FileTree({
  rootPath,
  activePath,
  onSelect,
  onMove,
  treeVersion = 0,
  depth = 0,
}: FileTreeProps) {
  const [entries, setEntries] = useState<FileEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    listFolder(rootPath)
      .then((items) => {
        if (!cancelled) setEntries(items);
      })
      .catch((e) => {
        if (!cancelled) {
          console.error("marka.md: listFolder failed", e);
          setError(String(e));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [rootPath, treeVersion]);

  if (error) {
    return (
      <div className="mdv-tree__error">
        <img src={sadUrl} alt="" aria-hidden width={56} height={56} className="mdv-tree__error-art" />
        <span>cannot read folder</span>
      </div>
    );
  }
  if (!entries) {
    return <div className="mdv-tree__loading">loading…</div>;
  }
  if (entries.length === 0 && depth === 0) {
    return <div className="mdv-tree__empty">empty folder</div>;
  }

  return (
    <ul className="mdv-tree" role={depth === 0 ? "tree" : "group"}>
      {entries.map((entry) =>
        entry.isDir ? (
          <FolderNode
            key={entry.path}
            entry={entry}
            activePath={activePath}
            onSelect={onSelect}
            onMove={onMove}
            treeVersion={treeVersion}
            depth={depth}
          />
        ) : (
          <FileNode
            key={entry.path}
            entry={entry}
            active={activePath === entry.path}
            onSelect={onSelect}
            depth={depth}
          />
        ),
      )}
    </ul>
  );
}

type FolderNodeProps = {
  entry: FileEntry;
  activePath: string | null;
  onSelect: (path: string) => void;
  onMove?: (src: string, dstParent: string) => void;
  treeVersion: number;
  depth: number;
};

function isDescendantPath(child: string, parent: string): boolean {
  if (child === parent) return true;
  const sep = parent.includes("\\") ? "\\" : "/";
  const prefix = parent.endsWith(sep) ? parent : parent + sep;
  return child.startsWith(prefix);
}

function FolderNode({ entry, activePath, onSelect, onMove, treeVersion, depth }: FolderNodeProps) {
  const [open, setOpen] = useState(false);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  const onDragStart = (e: React.DragEvent<HTMLButtonElement>) => {
    e.dataTransfer.setData(DRAG_MIME, entry.path);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent<HTMLButtonElement>) => {
    if (!onMove) return;
    // dataTransfer.getData() returns "" during dragover (security); we still allow
    // the drop visual and rely on onDrop to do the final guard.
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!isDropTarget) setIsDropTarget(true);
  };

  const onDragLeave = () => {
    if (isDropTarget) setIsDropTarget(false);
  };

  const onDrop = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsDropTarget(false);
    const src = e.dataTransfer.getData(DRAG_MIME);
    if (!src || !onMove) return;
    if (isDescendantPath(entry.path, src)) return; // drop into self or descendant
    onMove(src, entry.path);
  };

  return (
    <li className="mdv-tree__item" role="treeitem" aria-expanded={open}>
      <button
        type="button"
        draggable
        className={`mdv-tree__row mdv-tree__row--folder${isDropTarget ? " is-drop-target" : ""}`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        onClick={toggle}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        title={entry.name}
      >
        <span className={`mdv-tree__chevron${open ? " is-open" : ""}`}>
          <Icon icon={ChevronRight} size={12} strokeWidth={2} />
        </span>
        <span className="mdv-tree__icon">
          <Icon icon={open ? FolderOpen : Folder} size={13} strokeWidth={1.5} />
        </span>
        <span className="mdv-tree__name">{entry.name}</span>
      </button>
      {open ? (
        <FileTree
          rootPath={entry.path}
          activePath={activePath}
          onSelect={onSelect}
          onMove={onMove}
          treeVersion={treeVersion}
          depth={depth + 1}
        />
      ) : null}
    </li>
  );
}

type FileNodeProps = {
  entry: FileEntry;
  active: boolean;
  onSelect: (path: string) => void;
  depth: number;
};

function FileNode({ entry, active, onSelect, depth }: FileNodeProps) {
  const onDragStart = (e: React.DragEvent<HTMLButtonElement>) => {
    e.dataTransfer.setData(DRAG_MIME, entry.path);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <li className="mdv-tree__item" role="treeitem" aria-selected={active}>
      <button
        type="button"
        draggable
        className={`mdv-tree__row mdv-tree__row--file${active ? " is-active" : ""}`}
        style={{ paddingLeft: `${8 + depth * 12 + 4}px` }}
        onClick={() => onSelect(entry.path)}
        onDragStart={onDragStart}
        title={entry.path}
      >
        <span className="mdv-tree__icon">
          <Icon icon={FileText} size={13} strokeWidth={1.5} />
        </span>
        <span className="mdv-tree__name">{entry.name}</span>
      </button>
    </li>
  );
}
