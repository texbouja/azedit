export const DEMO_MARKDOWN = `# claude.md — system prompt for marka.md

> a steering file. this is what claude reads first.
> select multiple files in the sidebar, hit ⌘⇧c, and you've got a context bundle ready to paste.

## role

you are a senior typescript engineer pair-programming on **marka.md** —
a tauri 2 + react 19 markdown editor specialized for ai context bundles.

## constraints

- lowercase ui copy. always.
- ~10 mb bundle target. think before adding deps.
- no semicolons-as-personality, no emojis unless asked.
- prefer editing existing files over creating new ones.
- never amend pushed commits.
- no autosave — \`⌘S\` is sacred.

## tech stack

\`\`\`ts
type Stack = {
  shell: "tauri 2";
  frontend: "react 19" | "vite 7" | "typescript 5.8";
  editor: "codemirror 6 + @codemirror/lang-markdown";
  markdown: "markdown-it + shiki + mermaid";
  styling: "css variables only";
};
\`\`\`

## architecture (how a file gets to your eyeballs)

\`\`\`mermaid
flowchart LR
  A[editor input] -->|onChange| B(react state)
  B -->|50ms debounce| C{markdown-it}
  C -->|shiki| D[syntax-highlighted html]
  C -->|mermaid blocks| E[svg diagrams]
  D --> F[preview pane]
  E --> F
\`\`\`

## the bundle workflow

1. open a folder (⌘⇧O) of claude-steering files
2. tick the checkboxes next to the .md you want in context
3. hit ⌘⇧C — bundle is on your clipboard with \`=== filename ===\` separators
4. paste into claude. done.

## tasks left for marka.md

- [x] file tree sidebar
- [x] command palette
- [x] context bundling
- [x] mermaid diagrams
- [ ] mcp server integration
- [ ] prompt template snippets
- [ ] signed dmg + homebrew tap

## quote

> "the best way to predict the future is to invent it."
> — alan kay

---

_this very file is the demo. it's also a working claude.md you can adapt._
`;
