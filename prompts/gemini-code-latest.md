# 📋 Note de Correction Performance : Optimisation du Pipeline de Rendu

## 1. Diagnostic de la Lenteur (Pourquoi l'application rame)

Le passage au parsing Server-Side Rendering (SSR) avec MathJax v3 (`@mdit/plugin-mathjax`) génère directement des fichiers SVG autonomes. Bien que cette méthode soit la plus robuste, son exécution immédiate dans le fil d'édition principal provoque un goulot d'étranglement critique :

* **Fréquence de calcul excessive :** Si `md.render()` est appelé directement dans le `updateListener` de CodeMirror, l'application recalcule l'intégralité du document Markdown et régénère *tous* les tracés vectoriels SVG à **chaque caractère frappé** (toutes les quelques millisecondes).
* **Blocage du thread UI :** React et CodeMirror se retrouvent bloqués par ce traitement lourd de chaînes de caractères, ce qui fige l'interface utilisateur et détruit la fluidité de la saisie.

---

## 2. Solution Architecturale : Le Débouchage (Debouncing)

Pour restituer les 60 FPS natifs à l'éditeur CodeMirror, le calcul lourd du rendu ne doit **jamais** s'exécuter de manière synchrone avec la frappe au clavier. Il faut introduire un **Debounce** : le panneau de prévisualisation attend que l'utilisateur s'arrête de taper pendant un laps de temps défini (ex: 300ms) avant de déclencher la compilation Markdown/MathJax.

### Flux d'exécution optimisé :
1. L'utilisateur tape ➔ L'état local léger de CodeMirror se met à jour instantanément (Fluide).
2. Le listener intercepte le changement ➔ Le déclenchement du rendu est mis en attente.
3. Pause de frappe (> 300ms) ➔ La chaîne brute est transmise à `markdown-it`.
4. Rendu synchrone isolé ➔ Mise à jour du Preview HTML.

---

## 3. Code Source à Implémenter

### Étape 1 : Installation de la dépendance
```bash
npm install lodash.debounce @types/lodash.debounce
```

## Étape 2 
```typescript
import React, { useEffect, useRef, useMemo } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import debounce from 'lodash.debounce';

interface EditorProps {
  initialContent: string;
  onContentChangeDebounced: (text: string) => void;
}

export const CodeMirrorEditor: React.FC<EditorProps> = ({ initialContent, onContentChangeDebounced }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  // Création d'une instance de mise à jour "débouncée" persistante
  const debouncedUpdate = useMemo(
    () => debounce((text: string) => onContentChangeDebounced(text), 300),
    [onContentChangeDebounced]
  );

  useEffect(() => {
    if (!editorRef.current) return;

    const state = EditorState.create({
      doc: initialContent,
      extensions: [
        basicSetup,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            // Extraction brute ultra-rapide (quelques microsecondes)
            const rawText = update.state.doc.toString();
            
            // Appel temporisé : le traitement lourd attend une pause de frappe
            debouncedUpdate(rawText);
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: editorRef.current });
    
    return () => {
      view.destroy();
      debouncedUpdate.cancel(); // Évite les fuites de mémoire au démontage
    };
  }, []);

  return <div ref={editorRef} className="editor-container" />;
};
```

## Directives d'Optimisation pour les Documents Longs

Si le dégroupage (debounce) ne suffit pas sur des cours très denses (plusieurs milliers de lignes remplies de mathématiques), appliquez l'une des stratégies suivantes :

1. Virtualisation de la Preview : Utiliser un mécanisme de Virtual Scrolling côté affichage pour ne monter dans le DOM de la preview que les éléments visibles à l'écran.

2. Lazy Rendering / Segmentation : Ne passer au parser md.render() que le bloc de texte ou la section active en cours d'édition plutôt que de réévaluer le fichier entier à chaque cycle.