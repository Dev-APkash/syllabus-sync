"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { startExtraction } from "@/components/extraction/start-extraction";
import { FilePicker } from "./file-picker";
import { SYLLABI_BUCKET } from "@/lib/constants";
import { friendlyMessage } from "@/lib/friendly-error";
import { createClient } from "@/lib/supabase/client";
import { uploadFieldsSchema } from "@/lib/upload/schema";
import { validatePdfFile } from "@/lib/upload/validate-file";

type Stage =
  | { name: "idle" }
  | { name: "uploading" }
  | { name: "reading" }
  | { name: "failed"; message: string; syllabusId?: string };

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function UploadForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>({ name: "idle" });

  async function read(syllabusId: string) {
    setStage({ name: "reading" });
    const result = await startExtraction(syllabusId);
    if (result.ok) {
      router.push(`/syllabi/${syllabusId}/review`);
    } else {
      setStage({ name: "failed", message: result.message, syllabusId });
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fields = uploadFieldsSchema.safeParse({
      courseCode: form.get("courseCode") ?? "",
      term: form.get("term") ?? "",
      termStartDate: form.get("termStartDate") ?? "",
    });
    if (!fields.success) {
      setStage({ name: "failed", message: fields.error.issues[0].message });
      return;
    }
    if (!file) {
      setStage({ name: "failed", message: "Choose your syllabus PDF first." });
      return;
    }
    const firstBytes = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    const fileError = validatePdfFile(file, firstBytes);
    if (fileError) {
      setStage({ name: "failed", message: fileError });
      return;
    }

    setStage({ name: "uploading" });
    const supabase = createClient();
    const syllabusId = crypto.randomUUID();
    const filePath = `${userId}/${syllabusId}.pdf`;

    try {
      const sha256 = await sha256Hex(file);

      // 1. The file goes straight from the browser to private storage
      //    (never through our server: Vercel rejects bodies over 4.5 MB).
      const upload = await supabase.storage
        .from(SYLLABI_BUCKET)
        .upload(filePath, file, { contentType: "application/pdf", upsert: false });
      if (upload.error) throw new Error(upload.error.message);

      // 2. A course row, then the syllabus row that points at the file.
      const course = await supabase
        .from("courses")
        .insert({
          code: fields.data.courseCode || null,
          term: fields.data.term,
          term_start_date: fields.data.termStartDate || null,
        })
        .select("id")
        .single();
      if (course.error) {
        await supabase.storage.from(SYLLABI_BUCKET).remove([filePath]);
        throw new Error(course.error.message);
      }

      const syllabus = await supabase.from("syllabi").insert({
        id: syllabusId,
        course_id: course.data.id,
        file_path: filePath,
        original_filename: file.name,
        file_sha256: sha256,
        status: "uploaded",
      });
      if (syllabus.error) {
        // Don't leave an orphaned file or course behind.
        await supabase.storage.from(SYLLABI_BUCKET).remove([filePath]);
        await supabase.from("courses").delete().eq("id", course.data.id);
        throw new Error(syllabus.error.message);
      }
    } catch (error) {
      setStage({
        name: "failed",
        message: friendlyMessage(
          error instanceof Error ? error.message : null,
          "The upload didn't work. Please try again.",
        ),
      });
      return;
    }

    // 3. Ask Claude to read it.
    await read(syllabusId);
  }

  const busy = stage.name === "uploading" || stage.name === "reading";

  if (stage.name === "reading") {
    return (
      <div className="flex flex-col items-start gap-4 rounded-lg border bg-card p-8" role="status">
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-[reading_1.6s_ease-in-out_infinite] rounded-full bg-primary" />
        </div>
        <div>
          <p className="font-serif text-2xl font-medium">Reading your syllabus</p>
          <p className="mt-1 text-muted-foreground">
            This usually takes one to three minutes. Keep this page open; you&apos;ll go straight to the review screen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* min-w-0: without it a long file name stretches this grid cell past the form's edge. */}
      <div className="grid min-w-0 gap-2">
        <Label htmlFor="file">Syllabus PDF</Label>
        <FilePicker
          file={file}
          onFile={(next) => {
            setFile(next);
            // A different file after a failed reading (e.g. just the schedule pages) is a fresh upload.
            if (stage.name === "failed") setStage({ name: "idle" });
          }}
          disabled={busy}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="courseCode">
            Course code <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input id="courseCode" name="courseCode" placeholder="PSYC 1010" disabled={busy} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="term">Term</Label>
          <Input id="term" name="term" placeholder="Winter 2027" required disabled={busy} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="termStartDate">First day of classes</Label>
        <Input id="termStartDate" name="termStartDate" type="date" className="sm:max-w-[14rem]" disabled={busy} />
        <p className="text-sm text-muted-foreground">
          Used to turn &ldquo;Week 5, Friday&rdquo; into a real date. Without it, those items stay undated for you to
          fill in.
        </p>
      </div>

      {stage.name === "failed" && (
        <div className="flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p>{stage.message}</p>
          {stage.syllabusId && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="self-start"
              onClick={() => read(stage.syllabusId!)}
            >
              Try again
            </Button>
          )}
        </div>
      )}

      {/* After a failed read, "Try again" re-reads the stored file instead of uploading it twice. */}
      <div className="border-t pt-5">
        <Button type="submit" size="lg" disabled={busy || (stage.name === "failed" && !!stage.syllabusId)}>
          {stage.name === "uploading" ? "Uploading…" : "Upload and read"}
        </Button>
      </div>
    </form>
  );
}
