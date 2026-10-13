"use client";

import { friendlyMessage } from "@/lib/friendly-error";

export type ExtractionResult = { ok: true } | { ok: false; message: string };

/** Asks the server to read a stored syllabus with Claude (POST /api/extract). */
export async function startExtraction(syllabusId: string): Promise<ExtractionResult> {
  try {
    const response = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ syllabusId }),
    });
    const body: unknown = await response.json().catch(() => null);
    const message =
      body && typeof body === "object" && "message" in body && typeof body.message === "string"
        ? body.message
        : "Something went wrong reading your syllabus. Please try again.";
    return response.ok ? { ok: true } : { ok: false, message };
  } catch (error) {
    return {
      ok: false,
      message: friendlyMessage(
        error instanceof Error ? error.message : null,
        "We lost the connection while reading your syllabus. Please try again.",
      ),
    };
  }
}
