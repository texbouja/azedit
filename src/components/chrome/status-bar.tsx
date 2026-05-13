import { CircleHelp } from "lucide-react";
import { Button, Icon } from "@/components/primitives";

type StatusBarProps = {
  fileName?: string;
  words: number;
  minutes: number;
  onShowHelp: () => void;
};

export function StatusBar({ fileName, words, minutes, onShowHelp }: StatusBarProps) {
  return (
    <footer className="mdv-statusbar">
      <div className="mdv-statusbar__group">
        <span>{fileName ?? "untitled"}</span>
      </div>
      <div className="mdv-statusbar__group">
        <span>
          {words} {words === 1 ? "word" : "words"}
        </span>
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
