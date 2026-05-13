import { useCallback, useEffect, useRef } from "react";
import { FolderOpen, FolderPlus } from "lucide-react";
import { Button, Icon } from "@/components/primitives";
import { basename } from "@/lib";
import { FileTree } from "./file-tree";

type SidebarProps = {
  open: boolean;
  rootPath: string | null;
  activePath: string | null;
  width: number;
  onWidthChange: (next: number) => void;
  onOpenFolder: () => void;
  onSelectFile: (path: string) => void;
};

const MIN_WIDTH = 180;
const MAX_WIDTH = 420;

export function Sidebar({
  open,
  rootPath,
  activePath,
  width,
  onWidthChange,
  onOpenFolder,
  onSelectFile,
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
            title="open folder"
            aria-label="open folder"
            onClick={onOpenFolder}
            icon={<Icon icon={FolderOpen} size={13} strokeWidth={1.5} />}
          />
        </header>
        <div className="mdv-sidebar__body">
          {rootPath ? (
            <FileTree rootPath={rootPath} activePath={activePath} onSelect={onSelectFile} />
          ) : (
            <button type="button" className="mdv-sidebar__empty" onClick={onOpenFolder}>
              <Icon icon={FolderPlus} size={20} strokeWidth={1.5} />
              <span>open a folder</span>
              <span className="mdv-sidebar__hint">browse your markdown notes</span>
            </button>
          )}
        </div>
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
