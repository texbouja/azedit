import { CircleHelp } from "lucide-react";
import { Button, Icon } from "@/components/primitives";
import { formatTokens } from "@/lib";

type StatusBarProps = {
  fileName?: string;
  words: number;
  minutes: number;
  /** rough token count of the currently-loaded buffer */
  docTokens: number;
  onShowHelp: () => void;
};

export function StatusBar({
  fileName,
  words,
  minutes,
  docTokens,
  onShowHelp,
}: StatusBarProps) {
  return (
    <footer className="mdv-statusbar" data-tauri-drag-region>
      <div className="mdv-statusbar__group" data-tauri-drag-region>
        <span data-tauri-drag-region>{fileName ?? "untitled"}</span>
      </div>
      <div className="mdv-statusbar__group" data-tauri-drag-region>
        <span>
          {words} {words === 1 ? "word" : "words"}
        </span>
        <span>·</span>
        <span>~{formatTokens(docTokens)} tokens</span>
        <span>·</span>
        <span>{minutes} min read</span>
        <Button
          className="mdv-statusbar__help"
          title="how to use (⌘/)"
          aria-label="how to use"
          onClick={onShowHelp}
          icon={<Icon icon={CircleHelp} size={12} strokeWidth={1.5} />}
        />
      </div>
    </footer>
  );
}
