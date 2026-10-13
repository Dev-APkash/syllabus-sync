// Turns low-level errors into messages a student can act on.

// Covers both causes of a network error: this device being offline (or off the VPN)
// and the server being down, so it doesn't send people looking in the wrong place.
export const MAINTENANCE_MESSAGE =
  "We can't reach Syllabus Sync right now. Check your internet connection, or try again in a few minutes. Deadlines already in your calendar are still there.";

/** True for errors that mean "the server couldn't be reached at all". */
export function isNetworkError(message: string | undefined | null): boolean {
  if (!message) return false;
  return /failed to fetch|fetch failed|networkerror|load failed|econnrefused|enotfound|etimedout|network request failed/i.test(
    message,
  );
}

export function friendlyMessage(message: string | undefined | null, fallback: string): string {
  return isNetworkError(message) ? MAINTENANCE_MESSAGE : fallback;
}
