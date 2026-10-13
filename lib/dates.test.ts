import { describe, expect, it } from "vitest";
import {
  addMonthsToDate,
  daysBetween,
  formatDateOnly,
  formatShortDate,
  formatTimeOnly,
  relativeDays,
  todayInTimeZone,
} from "./dates";

describe("date helpers", () => {
  it("formats a date-only value without shifting the day", () => {
    expect(formatDateOnly("2027-02-05")).toBe("Fri, Feb 5, 2027");
    expect(formatDateOnly("2027-01-01")).toBe("Fri, Jan 1, 2027");
    expect(formatShortDate("2026-10-20")).toBe("Tue, Oct 20");
  });

  it("formats times in 12-hour form", () => {
    expect(formatTimeOnly("23:59")).toBe("11:59 PM");
    expect(formatTimeOnly("00:05:00")).toBe("12:05 AM");
    expect(formatTimeOnly("12:00")).toBe("12:00 PM");
  });

  it("adds months, clamping to the end of shorter months", () => {
    expect(addMonthsToDate("2027-01-04", 5)).toBe("2027-06-04");
    expect(addMonthsToDate("2027-01-31", 1)).toBe("2027-02-28");
    expect(addMonthsToDate("2026-09-08", 5)).toBe("2027-02-08");
  });

  it("finds today's date in the student's time zone, not the server's", () => {
    const lateEvening = new Date("2026-10-10T02:30:00Z"); // 10:30 PM on Oct 9 in Toronto
    expect(todayInTimeZone("America/Toronto", lateEvening)).toBe("2026-10-09");
    expect(todayInTimeZone("UTC", lateEvening)).toBe("2026-10-10");
    expect(todayInTimeZone("Not/AZone", lateEvening)).toBe("2026-10-10");
  });

  it("counts days between dates, across months and daylight saving changes", () => {
    expect(daysBetween("2026-10-09", "2026-10-09")).toBe(0);
    expect(daysBetween("2026-10-09", "2026-11-03")).toBe(25);
    expect(daysBetween("2026-11-03", "2026-10-09")).toBe(-25);
  });

  it("describes a number of days in words", () => {
    expect(relativeDays(0)).toBe("Today");
    expect(relativeDays(1)).toBe("Tomorrow");
    expect(relativeDays(5)).toBe("In 5 days");
    expect(relativeDays(25)).toBe("In 3 weeks");
    expect(relativeDays(-1)).toBe("Yesterday");
    expect(relativeDays(-9)).toBe("9 days ago");
  });
});
