import { describe, expect, it } from "vitest";
import { validatePdfFile } from "./validate-file";

const pdfHeader = new TextEncoder().encode("%PDF-1.7");
const docxHeader = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14]); // a .docx is a zip file: "PK.."

describe("validatePdfFile", () => {
  it("accepts a normal PDF", () => {
    expect(validatePdfFile({ name: "psyc.pdf", type: "application/pdf", size: 200_000 }, pdfHeader)).toBeNull();
  });

  it("rejects files that aren't PDFs", () => {
    expect(validatePdfFile({ name: "notes.docx", type: "application/msword", size: 100 }, docxHeader)).toMatch(
      /choose a PDF/,
    );
  });

  it("rejects a Word file renamed to .pdf", () => {
    expect(validatePdfFile({ name: "sneaky.pdf", type: "application/pdf", size: 100 }, docxHeader)).toMatch(
      /isn't a real PDF/,
    );
  });

  it("rejects files over 10 MB", () => {
    expect(validatePdfFile({ name: "big.pdf", type: "application/pdf", size: 11 * 1024 * 1024 }, pdfHeader)).toMatch(
      /10 MB/,
    );
  });

  it("rejects empty files", () => {
    expect(validatePdfFile({ name: "empty.pdf", type: "application/pdf", size: 0 }, new Uint8Array())).toMatch(/empty/);
  });
});
