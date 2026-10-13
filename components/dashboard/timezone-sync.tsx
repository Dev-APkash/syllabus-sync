"use client";

import { useEffect } from "react";
import { saveTimezone } from "@/app/dashboard/actions";

/** Invisible helper: saves the browser's time zone if it differs from the profile's. */
export function TimezoneSync({ savedTimeZone }: { savedTimeZone: string }) {
  useEffect(() => {
    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (browserTimeZone && browserTimeZone !== savedTimeZone) {
      void saveTimezone(browserTimeZone);
    }
  }, [savedTimeZone]);

  return null;
}
