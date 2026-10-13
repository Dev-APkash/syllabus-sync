import Link from "next/link";
import { GradePreview } from "@/components/landing/grade-preview";
import { ReviewPreview } from "@/components/landing/review-preview";
import { Button } from "@/components/ui/button";

const steps = [
  {
    title: "Upload the outline",
    text: "Add the PDF your instructor posted and the first day of classes. Dates written as “Week 5, Friday” are worked out for you.",
  },
  {
    title: "Check it against the PDF",
    text: "Every row shows the sentence it came from. Anything unclear is highlighted, and weights are totalled so gaps stand out.",
  },
  {
    title: "Subscribe once",
    text: "Add one link to Google, Apple or Outlook Calendar. When you change a date later, the event moves with it.",
  },
];

// Public landing page. Logged-in visitors are sent to /dashboard by proxy.ts.
export default function Home() {
  return (
    <div className="flex flex-col gap-24 pb-8">
      <section className="grid items-center gap-12 pt-4 lg:grid-cols-[5fr_6fr] lg:gap-16 lg:pt-10">
        <div className="flex flex-col gap-6">
          <h1 className="font-serif text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.5rem]">
            Every deadline in your syllabus, on your calendar.
          </h1>
          <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
            Upload a course outline. Syllabus Sync finds each assignment, test and exam with its date and grade weight,
            shows you where it found them, and adds them to your calendar once you&apos;ve checked them.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <Button asChild size="lg">
              <Link href="/auth/sign-up">Create a free account</Link>
            </Button>
            <Link
              href="/auth/login"
              className="text-sm underline decoration-border underline-offset-4 hover:decoration-foreground"
            >
              I already have an account
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            Works with Google, Apple and Outlook Calendar. No calendar permissions needed.
          </p>
        </div>
        <ReviewPreview />
      </section>

      <section className="flex flex-col gap-8">
        <h2 className="font-serif text-3xl font-medium tracking-tight">How it works</h2>
        <ol className="grid gap-8 sm:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title} className="border-t pt-5">
              <p className="text-sm tabular-nums text-muted-foreground">Step {i + 1}</p>
              <h3 className="mt-1 font-medium">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-4">
          <h2 className="font-serif text-3xl font-medium tracking-tight">What do I need on the final?</h2>
          <p className="leading-relaxed text-muted-foreground">
            Enter the marks you have so far. Syllabus Sync uses the real weights from your syllabus to tell you what you
            need on the final exam to reach your target, and warns you when the weights don&apos;t add up.
          </p>
        </div>
        <GradePreview />
      </section>

      <section className="grid gap-8 border-t pt-10 sm:grid-cols-3">
        <div>
          <h3 className="font-medium">You stay in control</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Nothing reaches your calendar until you confirm it. The AI suggests; you decide.
          </p>
        </div>
        <div>
          <h3 className="font-medium">Private by default</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Only you can see your syllabi and marks. Files are never used to train AI models.
          </p>
        </div>
        <div>
          <h3 className="font-medium">Easy to leave</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Delete a PDF or your whole account at any time.{" "}
            <Link href="/privacy" className="underline underline-offset-4">
              Read the privacy page
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
