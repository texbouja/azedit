# AZEdit — Guide de développement

Documentation pour les sessions Claude Code futures. Lire ce fichier en premier.

---

## Vision du projet

Éditeur de texte orienté enseignement/CPGE, capable d'éditer du Markdown et du LaTeX
dans une interface proche de VSCode, avec rendu mathématique natif.

**AZEdit est un fork de [Marka.md](https://github.com/mattenarle10/markamd) (MIT).**
Le clone se trouve dans `/home/GitHub/azedit/clones/markamd`.

---

## Principe directeur

> **Maximiser la compatibilité avec l'upstream Marka.md.**
> Avant d'implémenter une fonctionnalité, vérifier si Marka.md l'a déjà.
> Toujours adapter depuis Marka.md plutôt que réécrire.

Cela permet d'intégrer les futures mises à jour de Marka.md avec un minimum de conflits.

---

## Stack technique (identique à Marka.md, sauf ajouts marqués ★)

| Couche | Technologie |
|--------|-------------|
| UI | **React 19** + TypeScript ~5.9 |
| Build | Vite 7 |
| Éditeur | CodeMirror 6 + `@replit/codemirror-vim` |
| Markdown | `markdown-it` v14 + `shiki` v4 (coloration syntaxique) |
| Diagrammes | Mermaid v11 (lazy-loaded) |
| Maths | **MathJax 3** ★ (absent de Marka.md — ajout Phase 2) |
| Backend | Tauri v2 (Rust) |
| FS | `@tauri-apps/plugin-fs` + `plugin-dialog` + `plugin-opener` |
| Icônes | **Material Icons** ★ (Marka.md utilise Lucide) |
| Polices | **Fira Sans + Fira Code** ★ (Marka.md utilise Inter + JetBrains Mono) |

---

## Ce qu'on retire de Marka.md (fonctionnalités IA)

Les éléments suivants ne sont **pas** portés dans AZEdit :

| Fichier / Élément | Raison |
|-------------------|--------|
| `src/lib/context-bundle.ts` | Copie de fichiers pour LLM |
| `src/lib/bundle.ts` | Compteur de tokens |
| Affichage tokens dans StatusBar | Spécifique IA |
| Thèmes `claude`, `codex`, `gemini`, `cursor` | Branding IA |
| `DOT_PREFIX_ALLOWLIST` : `.agent`, `.claude`, `.codex`, `.cursor` | Dossiers agents IA |
| Permissions Tauri pour ces dossiers | Idem |
| `AGENTS.md` | Documentation agents |
| Context Tray dans Sidebar | Staging fichiers pour LLM |
| `use-update-flow.ts` + plugin updater/process | Mise à jour auto (à ajouter plus tard) |
| `lib/plantuml.ts` + DiagramViewer partie PlantUML | Service externe plantuml.com |
| i18n (`src/locales/`, `lib/i18n.tsx`) | Pas nécessaire pour CPGE FR |

---

## Ce qu'on AJOUTE par rapport à Marka.md

### Phase 2 — MathJax (rendu LaTeX inline/display)

- Plugin markdown-it custom dans `src/lib/markdown.ts` :
  - `$$...$$` (bloc) → `\[\n...\n\]`
  - `$...$` (inline) → `\(...\)`
  - Protection du contenu math contre le traitement Markdown (`_`, backslash escapes)
- `public/tex-svg.js` : bundle browser MathJax pré-compilé
  (évite `eval('require')` dans WebKitGTK — copier depuis `node_modules/mathjax-full/es5/tex-svg.js`)
- Configuration dans `index.html` avant le script :
  ```html
  <script>
    window.MathJax = {
      tex: { inlineMath: [['\\(','\\)']], displayMath: [['\\[','\\]']],
             processEscapes: true, processEnvironments: true, tags: 'ams' },
      svg: { fontCache: 'global' },
      startup: { typeset: false },
    };
  </script>
  <script src="/tex-svg.js" defer></script>
  ```
- `src/lib/math.ts` : `typesetContainer(el)` — attend `startup.promise` puis typeset
- Support natif `\newcommand`, `\DeclareMathOperator`, toutes les macros CPGE

### Phase 3 — Fichiers .tex

- Ajouter `.tex` dans `isSupportedTextPath` dans `lib/files.ts`
- Commande Rust `compile_latex` (tectonic ou pdflatex via `tokio::process`)
- Composant `PdfViewer` (iframe `data:application/pdf;base64,...`)
- Retour d'erreurs LaTeX dans la console existante

### Phase 4 — Recherche avancée

- Commande Rust `search_in_project` (walkdir + rayon, grep concurrent)
- Panneau recherche dans Sidebar (onglet dédié)

---

## Architecture Rust backend (`src-tauri/src/lib.rs`)

Le backend Rust est **minimal**, comme Marka.md.
Toutes les opérations FS standard passent par les plugins Tauri officiels.

| Commande Tauri | Utilité |
|----------------|---------|
| `reveal_in_file_manager(path)` | `xdg-open` sur le dossier parent (Linux) |
| `take_pending_open_files()` | Fichiers passés en argument CLI |
| `search_in_project(dir, query, caseSensitive)` | Phase 4 — grep concurrent Rust |
| `compile_latex(filePath)` | Phase 3 — spawn pdflatex/tectonic |

### Cargo.toml (dépendances actives)

```toml
[dependencies]
tauri = "2"
tauri-plugin-fs = "2"
tauri-plugin-dialog = "2"
tauri-plugin-opener = "2"
tauri-plugin-single-instance = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
# Phase 3 : tokio = { version = "1", features = ["process"] }, base64 = "0.22"
# Phase 4 : walkdir = "2", rayon = "1"
```

**Ne pas inclure** : comrak, serde_yaml, tempfile (supprimés depuis la migration Marka.md).

---

## Identité visuelle AZEdit (différences avec Marka.md)

### Polices (`src/styles/globals.css`)
```css
@import "@fontsource/fira-sans/400.css";
@import "@fontsource/fira-sans/500.css";
@import "@fontsource/fira-sans/600.css";
@import "@fontsource/fira-code/400.css";
@import "@fontsource/fira-code/500.css";
```

### Variables CSS (`src/styles/tokens.css`)
```css
:root {
  --font-ui: "Fira Sans", -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: "Fira Code", ui-monospace, SFMono-Regular, monospace;
}
```

### Icônes
Utiliser Material Icons au lieu de Lucide React :
```tsx
// À la place de <Icon name="..." className="..." />
<span className="material-icons" style={{ fontSize: 18 }}>icon_name</span>
```

### Clés localStorage (préfixe `az.`)
```typescript
// src/lib/storage.ts
export const STORAGE_KEYS = {
  themeMode: "az.theme",
  splitterRatio: "az.split.ratio",
  sidebarOpen: "az.sidebar.open",
  sidebarWidth: "az.sidebar.width",
  lastFolder: "az.lastFolder",
  lastFile: "az.lastFile",
  // ...
}
```

### Thèmes CSS conservés (10 sur 14 de Marka.md)
`latte`, `mono`, `mono-dark`, `frappe`, `macchiato`, `mocha`, `matcha`, `kanagawa`, `rose-pine`, `ayu`

---

## Phases de développement

### Phase 1 — Initialisation du fork ← PROCHAINE ÉTAPE

**Objectif** : AZEdit qui compile et tourne, issu de Marka.md sans les features IA.

Checklist :
- [ ] Partir de la structure de fichiers Marka.md (copier les sources)
- [ ] `package.json` : remplacer `lucide-react` → `material-icons`, ajouter `@fontsource/fira-*`, supprimer `plantuml-encoder`, `i18next` et dépendances update
- [ ] `src/styles/globals.css` : changer imports polices → Fira Sans + Fira Code
- [ ] `src/styles/tokens.css` : supprimer 4 thèmes IA (`claude`, `codex`, `gemini`, `cursor`)
- [ ] `src/lib/theme.ts` : supprimer entrées IA dans `THEME_GROUPS`, `VALID`, `THEME_HINTS`
- [ ] `src/lib/storage.ts` : changer préfixe `mdview.` → `az.`
- [ ] `src/lib/files.ts` : supprimer `.agent/.claude/.codex/.cursor` de `DOT_PREFIX_ALLOWLIST` ; adapter messages d'erreur
- [ ] `src/lib/markdown.ts` : supprimer PlantUML (`plantUmlUrl`, import `plantuml`)
- [ ] `src/lib/pdf-export.ts` : adapter nom de l'app dans le HTML exporté
- [ ] `src/components/` : supprimer Context Tray, compteur tokens, boutons IA, DiagramViewer partie PlantUML
- [ ] `src/app.tsx` : retirer tout ce qui concerne IA, i18n, updater
- [ ] `src-tauri/Cargo.toml` : ajouter plugin-fs, plugin-dialog, plugin-opener ; supprimer comrak, serde_yaml, tempfile, base64
- [ ] `src-tauri/src/lib.rs` : retirer toutes les commandes FS custom et render_markdown ; garder `reveal_in_file_manager` + `take_pending_open_files`
- [ ] `src-tauri/capabilities/default.json` : copier depuis Marka.md, supprimer `.agent/.claude/.codex/.cursor`
- [ ] `src-tauri/tauri.conf.json` : identifier `com.azedit.app`, supprimer section updater
- [ ] Conserver `public/favicon.svg`, `public/icons.svg`, `src-tauri/icons/`
- [ ] `npm install` + `npm run tauri dev` → build fonctionnel

### Phase 2 — MathJax

- [ ] `cp node_modules/mathjax-full/es5/tex-svg.js public/tex-svg.js`
- [ ] Configurer `window.MathJax` dans `index.html`
- [ ] Plugin math dans `src/lib/markdown.ts` (inline `$...$` et bloc `$$...$$`)
- [ ] `src/lib/math.ts` : `typesetContainer(el)`
- [ ] `preview.tsx` : appeler `typesetContainer(article)` après mise à jour `innerHTML`
- [ ] Tester avec documents CPGE réels

### Phase 3 — Compilation LaTeX

- [ ] Ajouter `.tex` dans `lib/files.ts`
- [ ] Commande Rust `compile_latex` + `tokio` dans Cargo
- [ ] Composant `PdfViewer`
- [ ] Bouton "Compiler" conditionnel dans la toolbar

### Phase 4 — Recherche globale

- [ ] `search_in_project` Rust (walkdir + rayon)
- [ ] Panneau SearchPanel dans Sidebar

---

## Fichiers identité AZEdit (ne jamais écraser)

```
public/favicon.svg
public/icons.svg
src-tauri/icons/           ← toutes les déclinaisons PNG/ICO/ICNS
src-tauri/tauri.conf.json  ← identifier com.azedit.app
```

---

## Notes de contexte

- **Utilisateur** : enseignant en CPGE, documents avec maths denses (`\newcommand`, `\mathbb`, `\DeclareMathOperator`)
- **OS cible** : Linux (WebKitGTK) — attention aux bugs WebKit (`eval('require')` → bundle pré-compilé MathJax)
- **Build cibles** : `["deb", "rpm"]`
- **Binaire installé** : `~/bin/azedit` avec `.desktop` KDE
- **MathJax vs KaTeX** : MathJax retenu car support natif de tous les macros LaTeX sans configuration
- **PlantUML abandonnée** : dépend d'un service externe
- **i18n abandonnée** : public cible exclusivement francophone
- **Marka.md version** : 1.5.11 — `clones/markamd/` est le référentiel de comparaison
