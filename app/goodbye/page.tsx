import Link from "next/link";

export default function GoodbyePage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <h1 className="font-serif text-3xl font-medium tracking-tight">Your account has been deleted</h1>
      <p className="text-muted-foreground">
        Your PDFs, deadlines and marks are gone. You can remove the Syllabus Sync calendar from your calendar app.
        Thanks for trying it.
      </p>
      <Link href="/" className="underline">
        Back to the home page
      </Link>
    </div>
  );
}
