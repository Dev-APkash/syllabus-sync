import { EncryptedPDFError, PDFDocument } from "pdf-lib";

export type PdfInspection = { ok: true; pageCount: number } | { ok: false; reason: "locked" | "unreadable" };

/**
 * Opens a PDF locally (no AI call, no cost) to count its pages and spot
 * password-protected or broken files before we pay to send them to Claude.
 */
export async function inspectPdf(bytes: Uint8Array): Promise<PdfInspection> {
  try {
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    return { ok: true, pageCount: pdf.getPageCount() };
  } catch (error) {
    if (error instanceof EncryptedPDFError) return { ok: false, reason: "locked" };
    return { ok: false, reason: "unreadable" };
  }
}
