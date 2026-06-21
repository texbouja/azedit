import React, { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';

interface EditorProps {
  markdownState: string;
  setMarkdownState: (text: string) => void;
}

export const CodeMirrorEditor: React.FC<EditorProps> = ({ markdownState, setMarkdownState }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const state = EditorState.create({
      doc: markdownState,
      extensions: [
        basicSetup,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            // EXTRACTION DE LA CHAÎNE BRUTE UNIQUEMENT via l'état interne
            const rawText = update.state.doc.toString();
            setMarkdownState(rawText);
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: editorRef.current });
    return () => view.destroy();
  }, []);

  return <div ref={editorRef} className="editor-container" />;
};