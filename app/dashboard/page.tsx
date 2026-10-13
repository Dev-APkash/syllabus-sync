import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { Button } from "@/components/ui/button";
import { CourseList, EmptyCourses, type NextDeadline } from "@/components/dashboard/course-list";
import { ExamPanel } from "@/components/dashboard/exam-panel";
import { ThisWeek, type CourseInfo } from "@/components/dashboard/this-week";
import { ThisWeekWithCanvas } from "@/components/dashboard/this-week-canvas";
import { TimezoneSync } from "@/components/dashboard/timezone-sync";
import { requireUser } from "@/lib/auth";
import { EXAM_KINDS } from "@/lib/constants";
import { todayInTimeZone } from "@/lib/dates";
import { dueWithin, isDone, lastDueDateByCourse, nextDeadlineByCourse, upcomingExamsByCourse } from "@/lib/deadlines";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Courses" };

// The shell renders instantly; the part that reads the login streams in
// behind <Suspense> (required with Cache Components).
export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Your courses"
        description="Each syllabus you upload becomes a course. Review new ones, then they appear in your calendar."
        actions={
          <Button asChild>
            <Link href="/upload">Upload a syllabus</Link>
          </Button>
        }
      />
      <Suspense fallback={<PageSkeleton withHeader={false} />}>
        <Dashboard />
      </Suspense>
    </>
  );
}

async function Dashboard() {
  const user = await requireUser();
  const supabase = await createClient();

  // RLS guarantees only this student's rows come back.
  const [{ data: courses, error }, { data: profile }, { data: confirmed }] = await Promise.all([
    supabase
      .from("courses")
      .select(
        "id, code, name, term, color, canvas_course_id, created_at, syllabi(id, original_filename, status, error_message, created_at)",
      )
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle(),
    supabase
      .from("assessments")
      .select("id, course_id, title, kind, due_date, due_time, weight_percent, completed_at")
      .eq("status", "confirmed"),
  ]);
  if (error) throw new Error(error.message);
  const timeZone = profile?.timezone ?? "UTC";
  if (!courses?.length) {
    return (
      <>
        <TimezoneSync savedTimeZone={timeZone} />
        <EmptyCourses />
      </>
    );
  }

  // Everything below counts from today where the student is (the server's clock is UTC).
  const today = todayInTimeZone(timeZone);
  const all = confirmed ?? [];
  const items = all.filter((i) => !isDone(i)); // ticked-off work leaves This week, Next and Exams
  const lastDueDates = lastDueDateByCourse(all); // to fold away terms that are over
  const byId = new Map(courses.map((c) => [c.id, { id: c.id, code: c.code, name: c.name, color: c.color }]));
  const canvasCourses: Record<number, CourseInfo> = {};
  for (const c of courses) if (c.canvas_course_id) canvasCourses[c.canvas_course_id] = byId.get(c.id)!;

  const nextDeadlines: Record<string, NextDeadline> = {};
  for (const [courseId, item] of nextDeadlineByCourse(items, today)) {
    nextDeadlines[courseId] = { title: item.title, due_date: item.due_date! };
  }
  const thisWeek = dueWithin(items, today, 7).flatMap((item) => {
    const course = byId.get(item.course_id);
    return course ? [{ ...item, course }] : [];
  });
  // Courses with the soonest exam first.
  const examGroups = upcomingExamsByCourse(items, today, EXAM_KINDS, [...byId.keys()])
    .sort((a, b) => ((a.exams[0].due_date ?? "~") < (b.exams[0].due_date ?? "~") ? -1 : 1))
    .flatMap((group) => {
      const course = byId.get(group.courseId);
      return course ? [{ course, exams: group.exams }] : [];
    });

  return (
    <>
      <TimezoneSync savedTimeZone={timeZone} />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="flex min-w-0 flex-col gap-8">
          {/* Syllabus deadlines show at once; Canvas statuses and Canvas-only work join when Canvas answers. */}
          <Suspense fallback={<ThisWeek items={thisWeek} today={today} />}>
            <ThisWeekWithCanvas
              userId={user.id}
              today={today}
              timeZone={timeZone}
              items={thisWeek}
              canvasCourses={canvasCourses}
            />
          </Suspense>
          <CourseList courses={courses} nextDeadlines={nextDeadlines} lastDueDates={lastDueDates} today={today} />
        </div>
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <ExamPanel groups={examGroups} today={today} />
        </aside>
      </div>
    </>
  );
}
