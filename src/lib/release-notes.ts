export const CHANGELOG_URL = "https://github.com/your-repo/azedit/releases";

export function getWhatsNewToastMessage(_version: string): string {
  return `AZedit updated to v${_version}`;
}
