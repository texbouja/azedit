import { expect, test } from "bun:test";
import { PRINT_STYLES } from "../src/lib/pdf-export";

test("suppresses browser print header and footer space", () => {
  expect(PRINT_STYLES).toContain("@page { margin: 0; size: auto; }");
  expect(PRINT_STYLES).not.toContain("@page { margin: 18mm");
});

test("keeps visible document margins without a print helper note", () => {
  expect(PRINT_STYLES).toContain(".doc { max-width: none; padding: 16mm 20mm 34mm; }");
  expect(PRINT_STYLES).not.toContain(".print-note");
  expect(PRINT_STYLES).not.toContain("headers and footers");
});

test("clones document padding across printed page fragments", () => {
  expect(PRINT_STYLES).toContain("-webkit-box-decoration-break: clone;");
  expect(PRINT_STYLES).toContain("box-decoration-break: clone;");
  expect(PRINT_STYLES).toContain("body { margin: 0; padding: 0; }");
});
