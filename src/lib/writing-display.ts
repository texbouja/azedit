export type WritingWidth = "narrow" | "comfort" | "wide" | "full";
export type WritingFontSize = "small" | "default" | "large" | "x-large";
export type WritingLineHeight = "compact" | "comfortable" | "airy";

export type WritingDisplay = {
  width: WritingWidth;
  fontSize: WritingFontSize;
  lineHeight: WritingLineHeight;
  centered: boolean;
};

export const DEFAULT_WRITING_DISPLAY: WritingDisplay = {
  width: "comfort",
  fontSize: "default",
  lineHeight: "comfortable",
  centered: false,
};

export const WRITING_WIDTH_OPTIONS: WritingWidth[] = ["narrow", "comfort", "wide", "full"];
export const WRITING_FONT_SIZE_OPTIONS: WritingFontSize[] = ["small", "default", "large", "x-large"];
export const WRITING_LINE_HEIGHT_OPTIONS: WritingLineHeight[] = ["compact", "comfortable", "airy"];

const WRITING_WIDTH_VALUES: Record<WritingWidth, string> = {
  narrow: "620px",
  comfort: "780px",
  wide: "960px",
  full: "none",
};

const PROSE_WIDTH_VALUES: Record<WritingWidth, string> = {
  narrow: "620px",
  comfort: "720px",
  wide: "880px",
  full: "none",
};

const EDITOR_FONT_VALUES: Record<WritingFontSize, string> = {
  small: "13px",
  default: "14px",
  large: "16px",
  "x-large": "18px",
};

const PROSE_FONT_VALUES: Record<WritingFontSize, string> = {
  small: "14px",
  default: "15px",
  large: "17px",
  "x-large": "19px",
};

const EDITOR_LINE_HEIGHT_VALUES: Record<WritingLineHeight, string> = {
  compact: "1.45",
  comfortable: "1.55",
  airy: "1.75",
};

const PROSE_LINE_HEIGHT_VALUES: Record<WritingLineHeight, string> = {
  compact: "1.55",
  comfortable: "1.65",
  airy: "1.8",
};

function normalizeOption<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === "string" && options.includes(value as T) ? (value as T) : fallback;
}

export function normalizeWritingWidth(value: unknown): WritingWidth {
  return normalizeOption(value, WRITING_WIDTH_OPTIONS, DEFAULT_WRITING_DISPLAY.width);
}

export function normalizeWritingFontSize(value: unknown): WritingFontSize {
  return normalizeOption(value, WRITING_FONT_SIZE_OPTIONS, DEFAULT_WRITING_DISPLAY.fontSize);
}

export function normalizeWritingLineHeight(value: unknown): WritingLineHeight {
  return normalizeOption(value, WRITING_LINE_HEIGHT_OPTIONS, DEFAULT_WRITING_DISPLAY.lineHeight);
}

export function getWritingDisplayVars(display: WritingDisplay): Record<string, string> {
  return {
    "--mdv-writing-width": WRITING_WIDTH_VALUES[display.width],
    "--mdv-writing-font-size": EDITOR_FONT_VALUES[display.fontSize],
    "--mdv-writing-line-height": EDITOR_LINE_HEIGHT_VALUES[display.lineHeight],
    "--mdv-writing-margin-inline": display.centered ? "auto" : "0",
    "--mdv-prose-width": PROSE_WIDTH_VALUES[display.width],
    "--mdv-prose-font-size": PROSE_FONT_VALUES[display.fontSize],
    "--mdv-prose-line-height": PROSE_LINE_HEIGHT_VALUES[display.lineHeight],
  };
}
