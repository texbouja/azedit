import { useMemo, useState } from "react";
import { Editor, Preview, Splitter, TitleBar } from "@/components/features";
import { useDebouncedValue } from "@/hooks";
import { DEMO_MARKDOWN } from "@/lib/demo";
import "./app.css";

export function App() {
  const [source, setSource] = useState<string>(DEMO_MARKDOWN);
  const debounced = useDebouncedValue(source, 50);

  const { words, minutes } = useMemo(() => {
    const trimmed = source.trim();
    const w = trimmed.length ? trimmed.split(/\s+/).length : 0;
    const m = Math.max(1, Math.round(w / 220));
    return { words: w, minutes: m };
  }, [source]);

  return (
    <div className="mdv-app">
      <TitleBar />

      <main className="mdv-shell">
        <Splitter
          left={<Editor value={source} onChange={setSource} />}
          right={<Preview source={debounced} />}
        />
      </main>

      <footer className="mdv-statusbar">
        <div className="mdv-statusbar__group">
          <span>untitled</span>
        </div>
        <div className="mdv-statusbar__group">
          <span>{words} {words === 1 ? "word" : "words"}</span>
          <span>·</span>
          <span>{minutes} min read</span>
        </div>
      </footer>
    </div>
  );
}
