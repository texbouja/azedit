import { useState } from "react";
import { ChevronRight, FileText, Minus, Table2 } from "lucide-react";
import { Icon } from "@/components/primitives";
import { basename, isCsvPath, type FileEntry } from "@/lib";

const DRAG_MIME = "application/x-marka-path";

type PinnedFilesProps = {
  pinnedFiles: readonly string[];
  activePath: string | null;
  onSelect: (path: string) => void;
  onRemove: (path: string) => void;
  onAdd: (path: string) => void;
  onContextMenu?: (e: React.MouseEvent, entry: FileEntry) => void;
};

export function PinnedFiles({
  pinnedFiles,
  activePath,
  onSelect,
  onRemove,
  onAdd,
  onContextMenu,
}: PinnedFilesProps) {
  const [open, setOpen] = useState(true);
  const [isDrop, setIsDrop] = useState(false);

  return (
    <section className={`mdv-rootfolder mdv-pinned-files${isDrop ? " is-drop" : ""}`}>
      <div
        className={`mdv-rootfolder__header${isDrop ? " is-drop-target" : ""}`}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "link";
          setIsDrop(true);
        }}
        onDragLeave={() => setIsDrop(false)}
        onDrop={(e) => {
          const src = e.dataTransfer.getData(DRAG_MIME);
          if (!src) { setIsDrop(false); return; }
          e.preventDefault();
          e.stopPropagation();
          setIsDrop(false);
          if (!pinnedFiles.includes(src)) onAdd(src);
        }}
      >
        <button
          type="button"
          className="mdv-rootfolder__toggle"
          onClick={() => setOpen((v) => !v)}
        >
          <span className={`mdv-tree__chevron${open ? " is-open" : ""}`}>
            <Icon icon={ChevronRight} size={12} strokeWidth={2} />
          </span>
          <span className="mdv-tree__icon">
            <Icon icon={FileText} size={13} strokeWidth={1.5} />
          </span>
          <span className="mdv-rootfolder__name">files</span>
        </button>
      </div>
      {open ? (
        pinnedFiles.length === 0 ? (
          <div
            className={`mdv-pinned-files__drop-zone${isDrop ? " is-over" : ""}`}
            onDragOver={(e) => {
              if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = "link";
              setIsDrop(true);
            }}
            onDragLeave={() => setIsDrop(false)}
            onDrop={(e) => {
              const src = e.dataTransfer.getData(DRAG_MIME);
              if (!src) { setIsDrop(false); return; }
              e.preventDefault();
              e.stopPropagation();
              setIsDrop(false);
              if (!pinnedFiles.includes(src)) onAdd(src);
            }}
          >
            <span className="mdv-pinned-files__drop-hint">drag a file here or click + to add</span>
          </div>
        ) : (
          <ul
            className="mdv-tree"
            onDragOver={(e) => {
              if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "link";
              setIsDrop(true);
            }}
            onDragLeave={(e) => {
              if (e.currentTarget === e.target) setIsDrop(false);
            }}
            onDrop={(e) => {
              const src = e.dataTransfer.getData(DRAG_MIME);
              if (!src) { setIsDrop(false); return; }
              e.preventDefault();
              setIsDrop(false);
              if (!pinnedFiles.includes(src)) onAdd(src);
            }}
          >
            {pinnedFiles.map((path) => (
              <li key={path} className="mdv-tree__item">
                <button
                  type="button"
                  className={`mdv-tree__row mdv-tree__row--file${activePath === path ? " is-active" : ""}`}
                  style={{ paddingLeft: "12px" }}
                  onClick={() => onSelect(path)}
                  onContextMenu={(e) => {
                    if (!onContextMenu) return;
                    e.preventDefault();
                    onContextMenu(e, { path, name: basename(path), isDir: false });
                  }}
                  title={path}
                >
                  <span className="mdv-tree__icon">
                    <Icon icon={isCsvPath(path) ? Table2 : FileText} size={13} strokeWidth={1.5} />
                  </span>
                  <span className="mdv-tree__name">{basename(path)}</span>
                </button>
                <button
                  type="button"
                  className="mdv-tree__fav is-fav"
                  data-tooltip="remove from files"
                  aria-label={`remove ${basename(path)} from files`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(path);
                  }}
                >
                  <Icon icon={Minus} size={11} strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </section>
  );
}
