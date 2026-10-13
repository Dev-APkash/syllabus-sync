import { MAX_PDF_BYTES } from "@/lib/constants";

type FileInfo = { name: string; type: string; size: number };

/**
 * Checks a chosen file before uploading. `firstBytes` are the file's first
 * few bytes: every real PDF starts with "%PDF-", which catches e.g. a Word
 * document renamed to .pdf. Returns a friendly error message, or null if OK.
 */
export function validatePdfFile(file: FileInfo, firstBytes: Uint8Array): string | null {
  const looksLikePdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!looksLikePdf) return "Please choose a PDF file.";
  if (file.size === 0) return "That file is empty.";
  if (file.size > MAX_PDF_BYTES) {
    return "That PDF is bigger than 10 MB. Try uploading just the syllabus pages, or use Print → Save as PDF to make a smaller copy.";
  }
  const header = String.fromCharCode(...firstBytes.slice(0, 5));
  if (header !== "%PDF-") {
    return "That file isn't a real PDF (it may be a renamed Word or image file). Open it and use Print → Save as PDF.";
  }
  return null;
}
