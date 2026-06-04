import { expect, test } from "bun:test";
import { getWhatsNewToastMessage } from "../src/lib/release-notes";

test("calls out the latest v1.5 polish in the what's-new toast", () => {
  expect(getWhatsNewToastMessage("1.5.7")).toBe(
    "v1.5.7: multi-folder explorer, favorites, open-as-text, and Windows file opening fixes are here",
  );
});

test("falls back to a generic update message for other versions", () => {
  expect(getWhatsNewToastMessage("1.6.0")).toBe("updated to v1.6.0");
});
