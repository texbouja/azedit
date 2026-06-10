import { useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  Circle,
  Cloud,
  Coffee,
  Flower2,
  Leaf,
  Monitor,
  Moon,
  PanelLeftClose,
  RotateCcw,
  Sparkles,
  Sun,
  Sunset,
  Terminal,
  Waves,
} from "lucide-react";
import { Button, Icon, Popover } from "@/components/primitives";
import {
  getSystemTheme,
  LANGUAGE_CHOICES,
  previewTheme,
  THEME_GROUPS,
  WRITING_FONT_SIZE_OPTIONS,
  WRITING_LINE_HEIGHT_OPTIONS,
  WRITING_WIDTH_OPTIONS,
  useI18n,
  useThemeMode,
  useTransparency,
  type Theme,
  type ThemeMode,
  type WritingDisplay,
  type WritingFontSize,
  type WritingLineHeight,
  type WritingWidth,
} from "@/lib";

const THEME_ICONS: Record<ThemeMode, typeof Sun> = {
  system: Monitor,
  latte: Sun,
  mono: Circle,
  "mono-dark": Circle,
  matcha: Leaf,
  frappe: Cloud,
  macchiato: Coffee,
  mocha: Moon,
  kanagawa: Waves,
  "rose-pine": Flower2,
  ayu: Sunset,
  claude: Sparkles,
  codex: Terminal,
  gemini: Sparkles,
  cursor: Terminal,
};

type ThemeButtonProps = {
  vimOn?: boolean;
  onToggleVim?: () => void;
  writingDisplay: WritingDisplay;
  onWritingWidthChange: (value: WritingWidth) => void;
  onWritingFontSizeChange: (value: WritingFontSize) => void;
  onWritingLineHeightChange: (value: WritingLineHeight) => void;
  onWritingCenteredChange: (value: boolean) => void;
  onResetWritingDisplay: () => void;
};

type SegmentControlProps<T extends string> = {
  label: string;
  valueLabel: string;
  value: T;
  options: readonly T[];
  labelFor: (option: T) => string;
  onChange: (value: T) => void;
};

function SegmentControl<T extends string>({
  label,
  valueLabel,
  value,
  options,
  labelFor,
  onChange,
}: SegmentControlProps<T>) {
  return (
    <div className="mdv-menu__control">
      <div className="mdv-menu__control-head">
        <span className="mdv-menu__control-label">{label}</span>
        <span className="mdv-menu__control-value">{valueLabel}</span>
      </div>
      <div className="mdv-menu__segmented" role="group" aria-label={label}>
        {options.map((option) => {
          const active = option === value;
          return (
            <button
              key={option}
              type="button"
              className={`mdv-menu__segment${active ? " is-active" : ""}`}
              onClick={() => onChange(option)}
              aria-pressed={active}
            >
              {labelFor(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ThemeButton({
  vimOn = false,
  onToggleVim,
  writingDisplay,
  onWritingWidthChange,
  onWritingFontSizeChange,
  onWritingLineHeightChange,
  onWritingCenteredChange,
  onResetWritingDisplay,
}: ThemeButtonProps) {
  const { language, setLanguage, t } = useI18n();
  const { mode, resolved, setMode } = useThemeMode();
  const { opacity, on: transparent, set: setTransparency } = useTransparency();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openThemeGroups, setOpenThemeGroups] = useState<Set<string>>(
    () => new Set(["neutral", "ai"]),
  );
  const anchorRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<number | null>(null);

  const resolveThemeForPreview = (value: ThemeMode): Theme =>
    value === "system" ? getSystemTheme() : value;

  const previewOnHover = (value: ThemeMode) => {
    if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => {
      previewTheme(resolveThemeForPreview(value));
      hoverTimer.current = null;
    }, 60);
  };

  const cancelHoverTimer = () => {
    if (hoverTimer.current !== null) {
      window.clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };

  const cancelPreview = () => {
    cancelHoverTimer();
    previewTheme(null);
  };

  const ActiveIcon = mode === "system" ? Monitor : THEME_ICONS[resolved];

  const toggleThemeGroup = (label: string) => {
    setOpenThemeGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  return (
    <div className="mdv-titlebar__theme" ref={anchorRef}>
      <Button
        data-tooltip={t("title.themeTooltip")}
        aria-label={t("title.theme")}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
        icon={<Icon icon={ActiveIcon} size={14} strokeWidth={1.5} />}
      />
      <Popover
        open={menuOpen}
        onClose={() => {
          cancelPreview();
          setMenuOpen(false);
        }}
        anchorRef={anchorRef}
      >
        <div className="mdv-menu mdv-menu--theme" onMouseLeave={cancelPreview}>
          {THEME_GROUPS.map((group) => {
            const activeInGroup = group.choices.some((c) => c.value === mode);
            const expanded = openThemeGroups.has(group.label) || activeInGroup;
            return (
              <section
                key={group.label}
                className={`mdv-menu__group${expanded ? " is-open" : ""}`}
              >
                <button
                  type="button"
                  className="mdv-menu__group-trigger"
                  onClick={() => toggleThemeGroup(group.label)}
                  aria-expanded={expanded}
                >
                  <span>{t(`theme.group.${group.label}`)}</span>
                  <Icon icon={ChevronRight} size={13} strokeWidth={1.7} />
                </button>
                <div className="mdv-menu__group-body">
                  <div className="mdv-menu__group-inner">
                    {group.choices.map((c) => {
                      const active = mode === c.value;
                      return (
                        <button
                          key={c.value}
                          type="button"
                          className={`mdv-menu__item${active ? " is-active" : ""}`}
                          onMouseEnter={() => previewOnHover(c.value)}
                          onMouseLeave={cancelHoverTimer}
                          onFocus={() => previewOnHover(c.value)}
                          onBlur={cancelHoverTimer}
                          onClick={() => {
                            cancelPreview();
                            setMode(c.value);
                            setMenuOpen(false);
                          }}
                          role="menuitemradio"
                          aria-checked={active}
                        >
                          <span className="mdv-menu__item-icon">
                            <Icon icon={THEME_ICONS[c.value]} size={14} strokeWidth={1.5} />
                          </span>
                          <span className="mdv-menu__item-label">{c.label}</span>
                          {active ? (
                            <span className="mdv-menu__item-check">
                              <Icon icon={Check} size={13} strokeWidth={2} />
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })}
          <div className="mdv-menu__divider" aria-hidden />
          <div className={`mdv-menu__slider${transparent ? " is-active" : ""}`}>
            <span className="mdv-menu__slider-icon" aria-hidden>
              <Icon icon={Sparkles} size={14} strokeWidth={1.5} />
            </span>
            <span className="mdv-menu__slider-label">{t("title.transparency")}</span>
            <span className="mdv-menu__slider-value" aria-hidden>
              {opacity >= 100 ? t("title.off") : `${100 - opacity}%`}
            </span>
            <input
              type="range"
              className="mdv-menu__slider-input"
              min={0}
              max={100}
              step={1}
              value={100 - opacity}
              onChange={(e) => setTransparency(100 - Number(e.target.value))}
              aria-label={t("title.transparency")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={100 - opacity}
              aria-valuetext={t("title.percentTransparent", { percent: 100 - opacity })}
            />
          </div>
          <div className="mdv-menu__divider" aria-hidden />
          <label className="mdv-menu__select-row">
            <span className="mdv-menu__select-label">{t("title.language")}</span>
            <select
              className="mdv-menu__select"
              value={language}
              onChange={(e) => setLanguage(e.target.value as typeof language)}
              aria-label={t("title.language")}
            >
              {LANGUAGE_CHOICES.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.nativeLabel}
                </option>
              ))}
            </select>
          </label>
          <div className="mdv-menu__divider" aria-hidden />
          <div className="mdv-menu__label">{t("title.writing")}</div>
          <SegmentControl
            label={t("title.writingWidth")}
            valueLabel={t(`writing.width.${writingDisplay.width}`)}
            value={writingDisplay.width}
            options={WRITING_WIDTH_OPTIONS}
            labelFor={(option) => t(`writing.width.${option}`)}
            onChange={onWritingWidthChange}
          />
          <SegmentControl
            label={t("title.writingFont")}
            valueLabel={t(`writing.font.${writingDisplay.fontSize}`)}
            value={writingDisplay.fontSize}
            options={WRITING_FONT_SIZE_OPTIONS}
            labelFor={(option) => t(`writing.font.${option}`)}
            onChange={onWritingFontSizeChange}
          />
          <SegmentControl
            label={t("title.writingSpacing")}
            valueLabel={t(`writing.spacing.${writingDisplay.lineHeight}`)}
            value={writingDisplay.lineHeight}
            options={WRITING_LINE_HEIGHT_OPTIONS}
            labelFor={(option) => t(`writing.spacing.${option}`)}
            onChange={onWritingLineHeightChange}
          />
          <button
            type="button"
            className={`mdv-menu__item${writingDisplay.centered ? " is-active" : ""}`}
            onClick={() => onWritingCenteredChange(!writingDisplay.centered)}
            role="menuitemcheckbox"
            aria-checked={writingDisplay.centered}
          >
            <span className="mdv-menu__item-icon">
              <Icon icon={PanelLeftClose} size={14} strokeWidth={1.5} />
            </span>
            <span className="mdv-menu__item-label">{t("title.centerWriting")}</span>
            <span className={`mdv-menu__switch${writingDisplay.centered ? " is-on" : ""}`} aria-hidden />
          </button>
          <button
            type="button"
            className="mdv-menu__item"
            onClick={onResetWritingDisplay}
          >
            <span className="mdv-menu__item-icon">
              <Icon icon={RotateCcw} size={14} strokeWidth={1.5} />
            </span>
            <span className="mdv-menu__item-label">{t("title.resetWriting")}</span>
          </button>
          {onToggleVim ? (
            <>
              <div className="mdv-menu__divider" aria-hidden />
              <div className="mdv-menu__label">{t("title.editor")}</div>
              <button
                type="button"
                className={`mdv-menu__item${vimOn ? " is-active" : ""}`}
                onClick={onToggleVim}
                role="menuitemcheckbox"
                aria-checked={vimOn}
              >
                <span className="mdv-menu__item-icon">
                  <Icon icon={Terminal} size={14} strokeWidth={1.5} />
                </span>
                <span className="mdv-menu__item-label">{t("title.vimMode")}</span>
                <span className={`mdv-menu__switch${vimOn ? " is-on" : ""}`} aria-hidden />
              </button>
            </>
          ) : null}
        </div>
      </Popover>
    </div>
  );
}
