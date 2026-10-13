import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { canvasErrorMessage, canvasGet, canvasGetAll, getCanvasConnection } from "@/lib/canvas/api";
import { canvasAssignmentSchema, canvasCourseSchema, parseList, type CanvasCourse } from "@/lib/canvas/schema";
import { currentScore, matchCanvasCourse, summarizeAssignments } from "@/lib/canvas/summary";
import { createClient } from "@/lib/supabase/server";
import { ChangeCanvasCourseButton, ChooseCanvasCourse } from "./choose-canvas-course";
import { DueRow, GradedRow, MissingRow } from "./canvas-rows";

type Props = { userId: string; courseId: string; courseCode: string | null; canvasCourseId: number | null };
type Summary = ReturnType<typeof summarizeAssignments>;

type Loaded =
  | { kind: "hidden" }
  | { kind: "note"; text: React.ReactNode }
  | { kind: "choose"; courses: CanvasCourse[] }
  | { kind: "data"; courseUrl: string; course: CanvasCourse | null; summary: Summary };

/** Everything that talks to Canvas, kept apart from the rendering below. */
async function load({ userId, canvasCourseId }: Props): Promise<Loaded> {
  const supabase = await createClient();
  const conn = await getCanvasConnection(supabase, userId);
  if ("error" in conn) {
    if (conn.error === "no_key") return { kind: "hidden" }; // Canvas linking isn't set up on this server
    return {
      kind: "note",
      text:
        conn.error === "not_linked" ? (
          <>
            <Link href="/settings" className="underline underline-offset-4">
              Link Canvas in Settings
            </Link>{" "}
            to see your current grade, what&apos;s due soon and what&apos;s been graded.
          </>
        ) : (
          "Your Canvas link needs renewing: unlink and link Canvas again in Settings."
        ),
    };
  }
  try {
    if (!canvasCourseId) {
      const courses = parseList(
        canvasCourseSchema,
        await canvasGetAll(conn, "/api/v1/courses?enrollment_state=active&per_page=100"),
      );
      return courses.length
        ? { kind: "choose", courses }
        : { kind: "note", text: "No current courses found in Canvas." };
    }
    const base = `/api/v1/courses/${canvasCourseId}`;
    const [course, assignments] = await Promise.all([
      canvasGet(conn, `${base}?include[]=total_scores`),
      canvasGetAll(conn, `${base}/assignments?include[]=submission&order_by=due_at&per_page=100`),
    ]);
    const parsed = canvasCourseSchema.safeParse(course);
    return {
      kind: "data",
      courseUrl: `${conn.baseUrl}/courses/${canvasCourseId}`,
      course: parsed.success ? parsed.data : null,
      summary: summarizeAssignments(parseList(canvasAssignmentSchema, assignments), new Date()),
    };
  } catch (error) {
    return { kind: "note", text: canvasErrorMessage(error) };
  }
}

/** "From Canvas" on the course page: current grade, what's due soon, what's missing, what's graded. */
export async function CanvasPanel(props: Props & { timeZone: string }) {
  const loaded = await load(props);
  if (loaded.kind === "hidden") return null;

  return (
    <section aria-labelledby="from-canvas" className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-2.5">
        <h2 id="from-canvas" className="text-sm font-medium text-muted-foreground">
          From Canvas
        </h2>
        {loaded.kind === "data" && (
          <div className="flex items-center gap-1 text-sm">
            <a href={loaded.courseUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4">
              Open in Canvas
            </a>
            <ChangeCanvasCourseButton courseId={props.courseId} />
          </div>
        )}
      </div>
      <div className="px-5 py-4">
        {loaded.kind === "note" && <p className="text-sm text-muted-foreground">{loaded.text}</p>}
        {loaded.kind === "choose" && (
          <ChooseCanvasCourse
            courseId={props.courseId}
            suggested={matchCanvasCourse(props.courseCode, loaded.courses)}
            options={loaded.courses.map((c) => ({ id: c.id, label: c.name ?? c.course_code ?? `Course ${c.id}` }))}
          />
        )}
        {loaded.kind === "data" && <CanvasData {...loaded} timeZone={props.timeZone} />}
      </div>
    </section>
  );
}

function CanvasData({
  course,
  summary,
  timeZone,
}: {
  course: CanvasCourse | null;
  summary: Summary;
  timeZone: string;
}) {
  const { score, grade } = course ? currentScore(course) : { score: null, grade: null };
  const recent = summary.graded.slice(0, 5);
  const older = summary.graded.slice(5);
  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-3 gap-4 tabular-nums">
        <div>
          <dt className="text-sm text-muted-foreground">Current grade</dt>
          <dd className="font-serif text-2xl">
            {score === null ? "Hidden" : `${score}%`}
            {grade && score !== null && !grade.includes("%") && (
              <span className="ml-1.5 font-sans text-sm text-muted-foreground">{grade}</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Due in 2 weeks</dt>
          <dd className="font-serif text-2xl">{summary.dueSoon.length}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Missing</dt>
          <dd className={summary.missing.length ? "font-serif text-2xl text-destructive" : "font-serif text-2xl"}>
            {summary.missing.length}
          </dd>
        </div>
      </dl>

      <Block title="Due soon" empty="Nothing due in the next two weeks.">
        {summary.dueSoon.map((a) => (
          <DueRow key={a.id} assignment={a} timeZone={timeZone} />
        ))}
      </Block>
      {summary.missing.length > 0 && (
        <Block title="Missing">
          {summary.missing.map((a) => (
            <MissingRow key={a.id} assignment={a} timeZone={timeZone} />
          ))}
        </Block>
      )}
      <Block title="Recently graded" empty="Nothing graded yet.">
        {recent.map((a) => (
          <GradedRow key={a.id} assignment={a} />
        ))}
      </Block>
      {older.length > 0 && (
        <details className="group -mt-3">
          <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
            <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" aria-hidden="true" />
            Older grades ({older.length})
          </summary>
          <ul className="mt-2 divide-y rounded-md border">
            {older.map((a) => (
              <GradedRow key={a.id} assignment={a} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Block({ title, empty, children }: { title: string; empty?: string; children: React.ReactNode[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">{title}</h3>
      {children.length ? (
        <ul className="divide-y rounded-md border">{children}</ul>
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}
