// GET /api/health — a tiny "I'm alive" check for Docker's healthcheck and uptime monitors.
// Deliberately doesn't touch the database, so it only answers "is the app running?".
export function GET() {
  return Response.json({ ok: true });
}
