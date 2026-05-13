export const STORAGE_KEYS = {
  themeMode: "mdview.theme",
  transparency: "mdview.transparency",
  splitterRatio: "mdview.split.ratio",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
