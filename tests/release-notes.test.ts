import { expect, test } from "bun:test";
import { getWhatsNewToastMessage } from "../src/lib/release-notes";

test("calls out the context tray in the v1.5 what's-new toast", () => {
  expect(getWhatsNewToastMessage("1.5.0")).toBe(
    "v1.5.0: context tray is here - stage files, copy one AI-ready bundle",
  );
});

test("falls back to a generic update message for other versions", () => {
  expect(getWhatsNewToastMessage("1.6.0")).toBe("updated to v1.6.0");
});
