import { useEffect, useState } from "react";
import { FileText, FolderOpen, Layers3, Palette, Star, Table2, Workflow, X } from "lucide-react";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Button, Icon, Overlay } from "@/components/primitives";
import mascotUrl from "@/assets/mascot/excite.png";

type AboutOverlayProps = {
  open: boolean;
  onClose: () => void;
};

const REPO_URL = "https://github.com/texbouja/azedit";

const FEATURES = [
  { icon: FileText, label: "markdown", detail: "écriture + aperçu" },
  { icon: Layers3, label: "LaTeX", detail: "MathJax — Phase 2" },
  { icon: FolderOpen, label: "fichiers", detail: "copier chemins + révéler" },
  { icon: Table2, label: "csv", detail: "aperçu tableau" },
  { icon: Workflow, label: "mermaid", detail: "diagrammes en direct" },
  { icon: Palette, label: "thèmes", detail: "10 palettes" },
];

let cachedVersion: string | null = null;

export function AboutOverlay({ open, onClose }: AboutOverlayProps) {
  const [version, setVersion] = useState<string | null>(cachedVersion);

  useEffect(() => {
    if (!open || cachedVersion) return;
    let cancelled = false;
    getVersion()
      .then((v) => {
        if (cancelled) return;
        cachedVersion = v;
        setVersion(v);
      })
      .catch(() => {
        if (!cancelled) setVersion(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleOpen = async (url: string) => {
    try {
      await openUrl(url);
    } catch (err) {
      console.error("AZedit: openUrl failed", err);
    }
  };

  return (
    <Overlay open={open} onClose={onClose} ariaLabel="about AZedit" variant="modal">
      <header className="mdv-about__header">
        <span className="mdv-about__eyebrow">about</span>
        <Button
          title="close (esc)"
          aria-label="close"
          onClick={onClose}
          icon={<Icon icon={X} size={14} strokeWidth={1.5} />}
        />
      </header>

      <div className="mdv-about__body">
        <img
          src={mascotUrl}
          alt=""
          aria-hidden
          width={88}
          height={88}
          loading="eager"
          draggable={false}
          className="mdv-about__art"
        />
        <div className="mdv-about__brand">AZedit</div>
        <div className="mdv-about__version">
          <span className="mdv-about__version-num">{version ? `v${version}` : "v…"}</span>
          <span className="mdv-about__dot" aria-hidden> · </span>
          <span>MIT</span>
        </div>
        <p className="mdv-about__tagline">
          éditeur de texte pensé pour la production de documents à destination des CPGE — Cours, exercices, devoirs, fiche de colles. Édition en markdown ou LaTeX.
        </p>

        <div className="mdv-about__features" aria-label="AZedit features">
          {FEATURES.map((feature) => (
            <div key={feature.label} className="mdv-about__feature">
              <Icon icon={feature.icon} size={13} strokeWidth={1.6} />
              <span className="mdv-about__feature-label">{feature.label}</span>
              <span className="mdv-about__feature-detail">{feature.detail}</span>
            </div>
          ))}
        </div>

        <div className="mdv-about__links">
          <button
            type="button"
            className="mdv-about__link mdv-about__link--star"
            onClick={() => void handleOpen(REPO_URL)}
          >
            <Icon icon={Star} size={13} strokeWidth={1.5} />
            github.com/texbouja/azedit
          </button>
        </div>
      </div>

      <footer className="mdv-about__footer">
        <span>fork de Marka.md · MIT · open source</span>
      </footer>
    </Overlay>
  );
}
