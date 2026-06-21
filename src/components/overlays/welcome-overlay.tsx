import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, FolderOpen, Sparkles } from "lucide-react";
import { Button, Icon, Kbd, Overlay, Shortcut } from "@/components/primitives";
import logoUrl from "@/assets/mascot/mdview-transpa-bg.png";
import notebookUrl from "@/assets/mascot/notebook.png";
import penUrl from "@/assets/mascot/pen.png";
import inspectUrl from "@/assets/mascot/inspect.png";
import exciteUrl from "@/assets/mascot/excite.png";

type WelcomeOverlayProps = {
  open: boolean;
  onClose: () => void;
  onOpenFolder: () => void;
};

type Slide = {
  mascot: string;
  title: string;
  body: ReactNode;
};

const SLIDES: Slide[] = [
  {
    mascot: logoUrl,
    title: "bienvenue dans AZEdit",
    body: (
      <>
        un éditeur local orienté enseignement — Markdown, LaTeX, diagrammes.{" "}
        <strong>écrire · prévisualiser · exporter</strong>. tout reste sur votre machine.
      </>
    ),
  },
  {
    mascot: notebookUrl,
    title: "votre bibliothèque de fichiers",
    body: (
      <>
        <Shortcut keys="⌘+⇧+O" /> pour ouvrir un dossier. La barre latérale devient votre bibliothèque — l'icône loupe pour chercher dans toute l'arborescence.
      </>
    ),
  },
  {
    mascot: penUrl,
    title: "éditeur + aperçu côte à côte",
    body: (
      <>
        tapez à gauche, le rendu s'actualise à droite. Blocs de code, diagrammes Mermaid, maths LaTeX — tout en direct. <Shortcut keys="⌘+S" /> pour sauvegarder.
      </>
    ),
  },
  {
    mascot: inspectUrl,
    title: "lecture et export",
    body: (
      <>
        <Shortcut keys="⌘+." /> bascule en mode lecture plein écran. La barre d'actions permet de copier le markdown, d'exporter en PDF ou d'ouvrir des fichiers.
      </>
    ),
  },
  {
    mascot: exciteUrl,
    title: "vous êtes prêt",
    body: (
      <>
        <Shortcut keys="⌘+K" /> pour toutes les commandes. <Shortcut keys="⌘+/" /> pour l'aide. Bonne écriture !
      </>
    ),
  },
];

export function WelcomeOverlay({ open, onClose, onOpenFolder }: WelcomeOverlayProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const slide = SLIDES[step];
  const isFirst = step === 0;
  const isLast = step === SLIDES.length - 1;

  const next = () => setStep((s) => Math.min(SLIDES.length - 1, s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (isLast) {
          onClose();
          void onOpenFolder();
        } else {
          next();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, isLast, onClose, onOpenFolder]);

  return (
    <Overlay open={open} onClose={onClose} ariaLabel="bienvenue dans AZEdit" variant="modal">
      <div className="mdv-welcome">
        <div className="mdv-welcome__slide" key={step}>
          <img
            src={slide.mascot}
            alt=""
            aria-hidden
            width={140}
            height={140}
            draggable={false}
            className="mdv-welcome__art"
          />
          <h1 className="mdv-welcome__title">{slide.title}</h1>
          <p className="mdv-welcome__body">{slide.body}</p>
        </div>

        <div className="mdv-welcome__dots" aria-label="tutorial progress">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`mdv-welcome__dot${i === step ? " is-active" : ""}`}
              onClick={() => setStep(i)}
              aria-current={i === step ? "step" : undefined}
              aria-label={`step ${i + 1}`}
            />
          ))}
        </div>

        <div className="mdv-welcome__actions">
          {!isFirst ? (
            <Button
              onClick={prev}
              icon={<Icon icon={ChevronLeft} size={14} strokeWidth={1.75} />}
            >
              back
            </Button>
          ) : (
            <Button onClick={onClose}>skip</Button>
          )}
          {isLast ? (
            <>
              <Button
                onClick={onClose}
                icon={<Icon icon={Sparkles} size={14} strokeWidth={1.75} />}
              >
                explore the demo
              </Button>
              <Button
                variant="solid"
                onClick={() => {
                  onClose();
                  void onOpenFolder();
                }}
                icon={<Icon icon={FolderOpen} size={14} strokeWidth={1.75} />}
              >
                open a folder
              </Button>
            </>
          ) : (
            <Button
              variant="solid"
              onClick={next}
              iconRight={<Icon icon={ChevronRight} size={14} strokeWidth={1.75} />}
            >
              next
            </Button>
          )}
        </div>

        <div className="mdv-welcome__hint">
          {isLast ? (
            <>
              <Shortcut keys="⌘+⇧+O" /> <span>open a folder</span>
              <span className="mdv-welcome__hint-sep">·</span>
              <Kbd>↵</Kbd> <span>or click</span>
              <span className="mdv-welcome__hint-sep">·</span>
              <Kbd>esc</Kbd> <span>close</span>
            </>
          ) : (
            <>
              <Kbd>↵</Kbd> <span>or</span> <Kbd>→</Kbd> <span>next</span>
              <span className="mdv-welcome__hint-sep">·</span>
              <Kbd>esc</Kbd> <span>close</span>
            </>
          )}
        </div>
      </div>
    </Overlay>
  );
}
