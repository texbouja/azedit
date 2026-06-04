export const CHANGELOG_URL = "https://markamd.vercel.app/changelog";

const WHATS_NEW_TOAST_BY_MINOR: Record<string, string> = {
  "1.5": "multi-folder explorer, favorites, open-as-text, and Windows file opening fixes are here",
};

export function getWhatsNewToastMessage(version: string): string {
  const minor = version.split(".").slice(0, 2).join(".");
  const message = WHATS_NEW_TOAST_BY_MINOR[minor];

  if (message) {
    return `v${version}: ${message}`;
  }

  return `updated to v${version}`;
}
