"use client";

import { useState } from "react";
import { FileText, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

/** A drop area around a normal file input (still keyboard- and screen-reader-friendly). */
export function FilePicker({
  file,
  onFile,
  disabled,
}: {
  file: File | null;
  onFile: (file: File | null) => void;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <label
      htmlFor="file"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) onFile(e.dataTransfer.files?.[0] ?? null);
      }}
      className={cn(
        "flex w-full min-w-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-card px-6 py-8 text-center transition-colors hover:border-foreground/40 has-[:focus-visible]:border-ring has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/20",
        dragging && "border-primary bg-primary/5",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <input
        id="file"
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      {file ? (
        <>
          <FileText className="h-6 w-6 text-primary" aria-hidden="true" />
          {/* Long names are cut off with "…"; the full name shows on hover. */}
          <span className="block w-full truncate font-medium" title={file.name}>
            {file.name}
          </span>
          <span className="text-sm text-muted-foreground">
            {(file.size / 1024 / 1024).toFixed(1)} MB · click to choose a different file
          </span>
        </>
      ) : (
        <>
          <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <span className="font-medium">Choose a PDF or drop it here</span>
          <span className="text-sm text-muted-foreground">Up to 10 MB and 30 pages</span>
        </>
      )}
    </label>
  );
}
