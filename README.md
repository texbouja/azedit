# AZEdit

Éditeur de texte orienté enseignement supérieur (CPGE), basé sur [Marka.md](https://github.com/mattenarle10/markamd) (MIT).

## Différences avec Marka.md

| Fonctionnalité | AZEdit | Marka.md |
|---|---|---|
| Polices | Fira Sans + Fira Code | Inter + JetBrains Mono |
| Rendu LaTeX | MathJax 3 (Phase 2) | — |
| Thèmes | 10 (sans thèmes IA) | 14 |
| Intégration IA | — | Context Tray, compteur tokens |
| Mise à jour auto | — | tauri-plugin-updater |
| i18n | — | i18next |
| PlantUML | — | plantuml-encoder |

## Stack

- **UI** : React 19 + TypeScript
- **Build** : Vite 7 + Tauri v2 (Rust)
- **Éditeur** : CodeMirror 6 + mode Vim
- **Markdown** : markdown-it v14 + Shiki v4
- **Diagrammes** : Mermaid v11
- **Maths** : MathJax 3 (à venir — Phase 2)

## Développement

```bash
npm install
npm run tauri dev
```

## Roadmap

- [x] Phase 1 — Fork de Marka.md, retrait des fonctionnalités IA, build fonctionnel
- [ ] Phase 2 — Rendu LaTeX natif via MathJax 3
- [ ] Phase 3 — Support fichiers `.tex` + compilation pdflatex/tectonic
- [ ] Phase 4 — Recherche dans le projet (grep concurrent Rust)
