# Séance AZEdit — Macro MathJax et suivi du développement

## Problème principal

Les macros LaTeX personnalisées (`\newcommand`, `\DeclareMathOperator`) définies
dans les paramètres ne sont **pas reconnues** par MathJax au rendu du Markdown.
Les macros sont correctement définies dans le fichier de config et `localStorage`,
mais MathJax reste ignorante de leur existence.

## Cause profonde

Le module importé est `markdown-it-mathjax3`, qui importe à son tour
`mathjax-full` version **ESM** (`tex-svg-full-BI3fonbT.js`). Voici la chaîne :

```
preview.tsx
  └─ ensureMarkdownReady()
       └─ initMd()
            └─ import("markdown-it-mathjax3")  // dynamic import
                 └─ import("mathjax-full/esm/...")  // bundle ESM
                      └─ tex-svg-full-BI3fonbT.js
                           └─ `globalThis.MathJax = { tex: {...} }`  // config scope
                                └─ MathJax démarre → lit `globalThis.MathJax` → init → remplace
```

### Point clé — le timing

1. `mathjax3` assigne `globalThis.MathJax = { tex: {...} }` (config)
2. MathJax lit cette config **dans le même tour synchrone**
3. MathJax s'initialise et **remplace** `globalThis.MathJax` par l'objet MathJax complet
4. Après ce remplacement, on peut appeler `MathJax.tex2svg()` (ajouté par Startup)

Notre `initMd()` attend que `globalThis.MathJax.tex2svg` soit défini (polling
toutes les 50ms). Mais entre l'assignment de la config (étape 1) et la
disponibilité de `tex2svg` (étape 4), **notre injection via
`globalThis.MathJax.tex.macros` arrive trop tard pour être prise en compte par
le démarrage**.

**Q : `ensure / reseed`** lors du `tex2svg()` — pourquoi ne suffit-il pas ?

MathJax 3 Component Loader transforme le code avant exécution. L'objet `MathJax`
initial peut être une copie et les modifications apportées pendant l'init
peuvent être écrasées ou non propagées au module `TeX` interne.

### Découvertes lors de l'investigation

#### 1. `tex-svg-full-BI3fonbT.js` ne contient PAS `tex2svg`

```
> rg 'tex2svg' tex-svg-full-BI3fonbT.js
→ Pas de résultat (N/A)
```

`tex2svg` est ajoutée dynamiquement par le module Startup de MathJax. Le bundle
ESM n'exporte que les composants de base ; c'est `registerAll()` qui connecte
les morceaux.

#### 2. `globalThis.MathJax` = `undefined` AVANT le `import("markdown-it-mathjax3")`

```
> globalThis.MathJax
→ undefined
```

Et ne devient défini qu'à l'intérieur du module importé.

#### 3. Le polling ne suffit pas

Notre `waitForMathJax()` (tous les 50ms jusqu'à 30s) attend bien que
`tex2svg` soit disponible, mais à ce moment-là, les macros sont déjà figées
dans le module TeX.

## Solution implémentée

### `installMacroInterceptor()` (dans `src/lib/markdown.ts`)

Un **accesseur (getter/setter)** sur `globalThis.MathJax` qui intercepte
**le premier assignment** (la config par `mathjax3`) et injecte les macros
directement dans `value.tex.macros` **avant** que MathJax démarre.

```typescript
function installMacroInterceptor(parsed: Record<string, MacroValue>): void {
  const desc = Object.getOwnPropertyDescriptor(globalThis, "MathJax");
  let first = true;
  Object.defineProperty(globalThis, "MathJax", {
    get() { return undefined; },
    set(value) {
      if (first && value && typeof value === "object") {
        first = false;
        value.tex ??= {};
        value.tex.macros ??= {};
        Object.assign(value.tex.macros, parsed);
      }
      // restore original descriptor and re-assign
      if (desc) {
        Object.defineProperty(globalThis, "MathJax", desc);
      } else {
        delete (globalThis as any).MathJax;
      }
      (globalThis as any).MathJax = value;
    },
    configurable: true,
    enumerable: true,
  });
}
```

### `loadMacroConfig()` (dans `src/lib/markdown.ts`)

Lecture des macros depuis `localStorage` (gère à la fois JSON et raw TeX) ou
depuis le fichier de config. Retourne `null` si aucune macro.

## Fichiers modifiés

| Fichier | Modifications |
|---------|---------------|
| `src/lib/markdown.ts` | Ajout `installMacroInterceptor`, `loadMacroConfig` ; appel dans `initMd` avant le `import()` |
| `src/lib/latex-macros.ts` | Export de `MacroValue` (type) |
| TypeScript | Compilation OK |
| Build (Vite) | OK |

## `public/tex-svg.js` est ABSENT

Le fichier `public/tex-svg.js` mentionné dans `CLAUDE.md` pour le bundle
pré-compilé MathJax n'existe pas. Le `import("mathjax-full/esm/...")` actuel
passe par Vite et le bundle `tex-svg-full-BI3fonbT.js` généré automatiquement
par Vite. On utilise donc MATHJAX VIA LE BUNDLE VITE, pas un fichier statique.

## `ensure / reseed` (gardé comme fallback)

Après l'init de MathJax, on appelle `tex2svg()` avec `ensure` puis `reseed`
pour forcer la propagation des macros dans le module TeX. Ce n'est pas
strictement nécessaire maintenant que l'intercepteur les injecte au bon moment,
mais c'est une sécurité.

## À retenir

### `usePersistedState` stocke en JSON

```typescript
// usePersistedState fait ça en interne :
localStorage.setItem(key, JSON.stringify(value))
```

Donc si l'utilisateur tape `\newcommand{\R}{\mathbb{R}}`, `localStorage`
stocke `'"\\newcommand{\\R}{\\mathbb{R}}"'` (string JSON-encodée).

### `parseLatexMacros()` attend du TEXTE brut

La fonction lit depuis `localStorage` ou un fichier texte. On a ajouté
`JSON.parse()` quand on lit depuis `localStorage` pour désérialiser.

## Prochaines pistes (conceptuelles)

1. **Vérifier si `initMd` est bien réentrante** — le `mdInit` cache la promise,
   donc un second appel ne réinstallera pas l'intercepteur. OK.
2. **Retenter sans l'intercepteur** si `public/tex-svg.js` est présent (bundle
   statique, pas de composant loader) → approche plus propre.
3. **Pousser les macros dans `MathJax.config` avant tout appel** → déjà fait
   via l'intercepteur.
4. **Si les macros ne persistent toujours pas**, envisager un monkey-patch de
   `mathjax3` ou une version modifiée du plugin.
