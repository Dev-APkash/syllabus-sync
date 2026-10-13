import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { inspectPdf } from "./inspect-pdf";

describe("inspectPdf", () => {
  it("counts pages", async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    doc.addPage();
    doc.addPage();
    expect(await inspectPdf(await doc.save())).toEqual({ ok: true, pageCount: 3 });
  });

  it("reports files that aren't PDFs as unreadable", async () => {
    expect(await inspectPdf(new TextEncoder().encode("not a pdf at all"))).toEqual({
      ok: false,
      reason: "unreadable",
    });
  });
});
