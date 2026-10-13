import { describe, expect, it } from "vitest";
import { buildIcs, type FeedItem } from "./build-ics";

const base: FeedItem = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Research Summary 1",
  course_id: "22222222-2222-4222-8222-222222222222",
  course_code: "PSYC 1010",
  due_date: "2027-02-05",
  due_time: null,
  weight_percent: 10,
  date_text: "Friday of Week 5",
  include_in_calendar: true,
};
const options = { timeZone: "America/New_York", siteUrl: "https://example.com" };

// iCalendar folds long lines at 75 characters; unfold them before searching.
const unfold = (ics: string) => ics.replace(/\r?\n[ \t]/g, "");

describe("buildIcs", () => {
  it("makes an all-day event for items without a time", () => {
    const ics = unfold(buildIcs([base], options));
    expect(ics).toContain("DTSTART;VALUE=DATE:20270205");
    expect(ics).toContain("DTEND;VALUE=DATE:20270206");
    expect(ics).toContain("SUMMARY:PSYC 1010 · Research Summary 1 (10%)");
    expect(ics).toContain("X-WR-CALNAME:Syllabus Sync");
  });

  it("converts a 23:59 deadline in New York to UTC before the clocks change", () => {
    const ics = unfold(buildIcs([{ ...base, due_date: "2026-10-30", due_time: "23:59:00" }], options));
    expect(ics).toContain("DTEND:20261031T035900Z"); // EDT is UTC-4
    expect(ics).toContain("DTSTART:20261031T032900Z"); // starts 30 minutes earlier
  });

  it("converts a 23:59 deadline in New York to UTC after the clocks change", () => {
    const ics = unfold(buildIcs([{ ...base, due_date: "2026-11-02", due_time: "23:59" }], options));
    expect(ics).toContain("DTEND:20261103T045900Z"); // EST is UTC-5
  });

  it("skips items without a date or hidden from the calendar", () => {
    const ics = buildIcs(
      [
        { ...base, id: "a", due_date: null },
        { ...base, id: "b", include_in_calendar: false },
      ],
      options,
    );
    expect(ics).not.toContain("BEGIN:VEVENT");
  });

  it("uses a stable uid so edits move the event instead of duplicating it", () => {
    const first = unfold(buildIcs([base], options));
    const edited = unfold(buildIcs([{ ...base, due_date: "2027-02-12" }], options));
    const uid = `UID:${base.id}@syllabussync`;
    expect(first).toContain(uid);
    expect(edited).toContain(uid);
  });

  it("leaves out an unknown weight and links back to the course", () => {
    const ics = unfold(buildIcs([{ ...base, weight_percent: null }], options));
    expect(ics).toContain("SUMMARY:PSYC 1010 · Research Summary 1\r\n");
    expect(ics).toContain(`https://example.com/courses/${base.course_id}`);
  });
});
