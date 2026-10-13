import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { UploadForm } from "@/components/upload/upload-form";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Upload a syllabus" };

const nextSteps = [
  "We read the PDF and list every graded item with its date and weight.",
  "You check each row beside the original document and fix anything that's off.",
  "When you confirm, the deadlines appear in your calendar feed.",
];

export default function UploadPage() {
  return (
    <>
      <PageHeader
        back={{ href: "/dashboard", label: "Courses" }}
        title="Upload a syllabus"
        description="One PDF per course. The course outline your instructor posted works best."
      />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 rounded-lg border bg-card p-6 sm:p-8">
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>
            <UploadFormForUser />
          </Suspense>
        </div>
        <aside className="flex flex-col gap-6 text-sm">
          <div>
            <h2 className="font-medium">What happens next</h2>
            <ol className="mt-3 flex flex-col gap-3">
              {nextSteps.map((step, i) => (
                <li key={step} className="flex gap-3 text-muted-foreground">
                  <span className="tabular-nums text-foreground">{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          <div className="border-t pt-6">
            <h2 className="font-medium">Tips</h2>
            <ul className="mt-3 flex flex-col gap-2 text-muted-foreground">
              <li>Upload just the outline, not a whole course pack.</li>
              <li>Clear scans work. Blurry photos of pages usually don&apos;t.</li>
              <li>Locked PDF? Open it and use Print → Save as PDF first.</li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}

async function UploadFormForUser() {
  const user = await requireUser();
  return <UploadForm userId={user.id} />;
}
