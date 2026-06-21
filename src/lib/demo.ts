export const DEMO_MARKDOWN = `# Bienvenue dans AZEdit

![](/mascot/write.png)

Un éditeur local orienté CPGE — Markdown, LaTeX, diagrammes Mermaid.
Éditez à gauche, l'aperçu se met à jour à droite. **⌘.** pour le mode lecture.

---

## Mathématiques LaTeX

Les formules s'affichent en direct grâce à MathJax :

Formule inline : $E = mc^2$ ou $\\lim_{n\\to\\infty} \\frac{1}{n} = 0$.

Bloc display :

$$
\\int_0^{+\\infty} e^{-t^2}\\,dt = \\frac{\\sqrt{\\pi}}{2}
$$

Environnement align :

$$
\\begin{align}
  \\nabla \\cdot \\mathbf{E} &= \\frac{\\rho}{\\varepsilon_0} \\\\
  \\nabla \\times \\mathbf{B} &= \\mu_0 \\mathbf{J} + \\mu_0 \\varepsilon_0 \\frac{\\partial \\mathbf{E}}{\\partial t}
\\end{align}
$$

---

## Diagrammes Mermaid

\`\`\`mermaid
flowchart LR
  Cours --> Exercices
  Exercices --> Correction
  Correction --> Cours
\`\`\`

---

## Code

Shiki colore chaque bloc selon le thème actif :

\`\`\`python
def suite_arithmetique(a0: float, r: float, n: int) -> list[float]:
    return [a0 + k * r for k in range(n)]
\`\`\`

---

![](/mascot/excite.png)

**⌘N** pour un nouveau fichier · **⌘⇧O** pour ouvrir un dossier · **⌘K** pour toutes les commandes.

_AZEdit · fork de Marka.md · MIT_
`;
