import { canvasGetAll, getCanvasConnection } from "@/lib/canvas/api";
import { mergeWithCanvas, timeInZone, toCanvasWeekItems } from "@/lib/canvas/planner";
import { parseList, plannerItemSchema } from "@/lib/canvas/schema";
import { addDaysToDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { CourseInfo, WeekItem } from "./this-week";

type Props = {
  userId: string;
  today: string;
  timeZone: string;
  /** This week's syllabus deadlines (already shown while Canvas loads). */
  items: (WeekItem & { course_id: string })[];
  /** Syllabus Sync courses linked to a Canvas course, keyed by the Canvas course id. */
  canvasCourses: Record<number, CourseInfo>;
};

const byDate = (a: WeekItem, b: WeekItem) => {
  const key = (i: WeekItem) => `${i.due_date} ${i.due_time ?? ""}`;
  return key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0;
};

/** Adds Canvas's view to This week: statuses on matching deadlines, plus Canvas-only work. */
export async function weekWithCanvas({ userId, today, timeZone, items, canvasCourses }: Props) {
  if (!Object.keys(canvasCourses).length) return { items };
  const conn = await getCanvasConnection(await createClient(), userId);
  if ("error" in conn) return { items };

  let planner;
  try {
    // A day either side, because Canvas counts days in UTC; filtered exactly below.
    const range = `start_date=${addDaysToDate(today, -1)}&end_date=${addDaysToDate(today, 8)}`;
    planner = parseList(plannerItemSchema, await canvasGetAll(conn, `/api/v1/planner/items?${range}&per_page=100`));
  } catch {
    return { items, note: "Couldn't reach Canvas right now" };
  }

  const last = addDaysToDate(today, 6);
  const canvas = toCanvasWeekItems(planner, conn.baseUrl, timeZone).flatMap((c) => {
    const course = canvasCourses[c.canvasCourseId];
    const inWeek = c.dueDate >= today && c.dueDate <= last && c.status !== "excused";
    return course && inWeek ? [{ ...c, courseId: course.id, course }] : [];
  });
  const { statuses, extras } = mergeWithCanvas(items, canvas);

  const merged: WeekItem[] = [
    ...items.map((item) => ({ ...item, canvasStatus: statuses[item.id] })),
    ...extras.map((c) => ({
      id: `canvas-${c.key}`,
      title: c.title,
      due_date: c.dueDate,
      due_time: timeInZone(c.dueAt, timeZone),
      weight_percent: null,
      course: c.course,
      canvasStatus: c.status,
      canvasUrl: c.url,
      fromCanvas: true,
    })),
  ];
  return { items: merged.sort(byDate), note: "Next 7 days, all courses and Canvas" };
}
