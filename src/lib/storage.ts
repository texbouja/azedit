export const STORAGE_KEYS = {
  themeMode: "az.theme",
  transparency: "az.transparency",
  splitterRatio: "az.split.ratio",
  sidebarOpen: "az.sidebar.open",
  sidebarWidth: "az.sidebar.width",
  lastFolder: "az.lastFolder",
  lastFile: "az.lastFile",
  welcomed: "az.welcomed",
  lastSeenVersion: "az.lastSeenVersion",
  recentFiles: "az.recent.files",
  vimMode: "az.vim",
  titlebarVisible: "az.titlebar.visible",
  folders: "az.folders",
  favorites: "az.favorites",
  writingFontSize: "az.writing.fontSize",
  writingLineHeight: "az.writing.lineHeight",
  pinnedFiles: "az.pinnedFiles",
  viewMode: "az.viewMode",
  latexMacros: "az.latex.macros",
  latexMacrosConfig: "az.latex.macros.config",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
