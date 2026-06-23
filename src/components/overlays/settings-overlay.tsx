import { useState } from "react";
import { Save, Settings2, Sigma, X } from "lucide-react";
import { Button, Icon, Overlay } from "@/components/primitives";
import { useI18n, STORAGE_KEYS, saveMacrosToConfig } from "@/lib";
import { usePersistedState } from "@/hooks/use-persisted-state";

type SettingsTab = "latex";

type SettingsOverlayProps = {
  open: boolean;
  onClose: () => void;
};

export function SettingsOverlay({ open, onClose }: SettingsOverlayProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<SettingsTab>("latex");
  const [savedMacros, setSavedMacros] = usePersistedState<string>(STORAGE_KEYS.latexMacros, "");
  const [draft, setDraft] = useState(savedMacros);
  const isDirty = draft !== savedMacros;

  const handleSave = () => {
    setSavedMacros(draft);
    saveMacrosToConfig(draft).catch(console.error);
    try {
      const mj = (globalThis as any).MathJax;
      if (mj?.tex2svg) {
        // Two-pass reseeding pour contourner le refus de redéfinition
        // et le cas des commandes encore inconnues (première sauvegarde).
        //
        // Passe 1 : \providecommand définit chaque macro si elle n'existe
        //           pas encore — ne génère aucune erreur.
        // Passe 2 : \renewcommand redéfinit chaque macro (elle existe
        //           désormais grâce à la passe 1).
        //
        // \DeclareMathOperator → \def (définition inconditionnelle).

        const ensure = draft
          .replace(/\\newcommand\s*\*/g, '\\providecommand*')
          .replace(/\\newcommand(?![a-zA-Z])/g, '\\providecommand')
          .replace(
            /\\DeclareMathOperator\s*(\*?)\s*\{\\([a-zA-Z@]+)\}\s*\{([^}]+)\}/g,
            (_, star, cmd, op) =>
              `\\def\\${cmd}{\\operatorname${star}{${op}}}`
          );
        const reseed = draft
          .replace(/\\newcommand\s*\*/g, '\\renewcommand*')
          .replace(/\\newcommand(?![a-zA-Z])/g, '\\renewcommand')
          .replace(
            /\\DeclareMathOperator\s*(\*?)\s*\{\\([a-zA-Z@]+)\}\s*\{([^}]+)\}/g,
            (_, star, cmd, op) =>
              `\\def\\${cmd}{\\operatorname${star}{${op}}}`
          );
        mj.tex2svg(ensure, { display: false });
        mj.tex2svg(reseed, { display: false });
      }
    } catch (e) {
      console.error("AZedit: macro reseeding failed", e);
    }
  };

  return (
    <Overlay open={open} onClose={onClose} ariaLabel={t("settings.title")} variant="modal">
      <header className="az-settings__header">
        <div className="az-settings__title">
          <Icon icon={Settings2} size={16} strokeWidth={1.5} />
          <span className="az-settings__title-text">{t("settings.title")}</span>
        </div>
        <Button
          title={t("app.closeEsc")}
          aria-label={t("app.close")}
          onClick={onClose}
          icon={<Icon icon={X} size={14} strokeWidth={1.5} />}
        />
      </header>

      <div className="az-settings__tabs" role="tablist" aria-label={t("settings.title")}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "latex"}
          className={`az-settings__tab${activeTab === "latex" ? " is-active" : ""}`}
          onClick={() => setActiveTab("latex")}
        >
          <Icon icon={Sigma} size={13} strokeWidth={1.5} />
          {t("settings.tab.latex")}
        </button>
      </div>

      <div className="az-settings__body" role="tabpanel">
        {activeTab === "latex" && (
          <section className="az-settings__section">
            <label className="az-settings__label" htmlFor="az-latex-macros">
              {t("settings.latex.label")}
            </label>
            <p className="az-settings__hint">{t("settings.latex.hint")}</p>
            <textarea
              id="az-latex-macros"
              className="az-settings__textarea"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("settings.latex.placeholder")}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
          </section>
        )}
      </div>

      <footer className="az-settings__footer">
        {!isDirty && <p className="az-settings__restart-hint">{t("settings.restartHint")}</p>}
        <Button
          variant="solid"
          aria-label={t("settings.latex.saved")}
          onClick={handleSave}
          disabled={!isDirty}
          icon={<Icon icon={Save} size={13} strokeWidth={1.5} />}
        >
          {t("settings.latex.saved")}
        </Button>
      </footer>
    </Overlay>
  );
}
