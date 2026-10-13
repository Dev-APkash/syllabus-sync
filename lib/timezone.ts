/** True when `name` is an IANA time zone this runtime knows, e.g. "America/Chicago". */
export function isValidTimeZone(name: string): boolean {
  if (!name || name.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: name });
    return true;
  } catch {
    return false;
  }
}
