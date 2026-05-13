# mdview

_local markdown, live._

a native macos markdown editor + live preview. live editor on the left (codemirror 6), rendered preview on the right (markdown-it + shiki). minimal chrome, full catppuccin theme support, macos vibrancy. ~10 mb bundle.

## features

- live preview with debounced render (~50 ms)
- catppuccin themes: latte / frappé / macchiato / mocha + system auto-switch
- macos vibrancy with opt-in transparency toggle
- copy-to-clipboard on every code block
- syntax highlighting via shiki (catppuccin themes baked in)
- resizable split with persisted ratio
- standard codemirror 6 keybindings

## install

### from source

requires bun (or npm), rust toolchain, xcode command line tools.

```sh
bun install
bun run tauri dev      # native window with hmr
bun run tauri build    # produces .dmg under src-tauri/target/release/bundle/dmg/
```

### prebuilt

`.dmg` releases coming once phase 4 lands.

## stack

| layer | choice |
|---|---|
| shell | tauri 2 |
| frontend | react 19, vite 7, typescript 5.8 |
| editor | codemirror 6 + @codemirror/lang-markdown |
| markdown | markdown-it + shiki |
| icons | lucide-react |
| styling | css variables, no framework |

## project structure

```
src/
├── app.tsx                  # shell layout
├── main.tsx                 # react entry
├── components/
│   ├── primitives/          # button, icon, pane, divider, popover
│   └── features/            # title-bar, editor, preview, splitter, logo
├── hooks/                   # useDebouncedValue, usePersistedState
├── lib/                     # markdown, theme, storage, demo
└── styles/                  # tokens, globals, + per-concern css splits
src-tauri/
├── src/lib.rs               # rust entry, vibrancy setup
├── tauri.conf.json          # window config (overlay title bar)
└── Cargo.toml
```

every folder exports its public api via `index.ts`. path alias `@/*` resolves to `src/*`.

## roadmap

shipped:
- branded shell, codemirror editor, live markdown preview, resizable split
- full catppuccin themes (latte / frappé / macchiato / mocha) + system + opt-in transparency
- copy-to-clipboard on every code block

planned:
- file tree sidebar — open a folder, browse `.md` files like an ide
- ⌘o / ⌘s / drag-drop + finder "open with → mdview"
- app icon, synchronized scroll, signed `.dmg`, homebrew tap
- mermaid + katex (stretch)

## license

mit
