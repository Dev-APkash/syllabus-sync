// A static picture of the review screen for the landing page (not interactive).

const rows = [
  { date: "Fri, Jan 22", time: "11:59 PM", title: "Research Summary 1", weight: "10%" },
  { date: "Wed, Feb 3", time: "", title: "Quiz 1", weight: "5%" },
  { date: "Mon, Feb 22", time: "", title: "Midterm Exam", weight: "25%" },
  { date: "Fri, Mar 12", time: "11:59 PM", title: "Research Summary 2", weight: "10%" },
  { date: "Wed, Mar 24", time: "", title: "Quiz 2", weight: "5%" },
];

export function ReviewPreview() {
  return (
    <div className="overflow-hidden rounded-lg border bg-card text-sm shadow-[0_1px_0_hsl(var(--border)),0_24px_48px_-24px_hsl(var(--foreground)/0.18)]">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="font-medium">PSYC 1010 · Introduction to Psychology</p>
          <p className="text-xs text-muted-foreground">Winter 2027 · psyc1010-outline.pdf</p>
        </div>
        <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">Needs review</span>
      </div>

      <table className="w-full tabular-nums">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-4 py-2 font-medium">Due</th>
            <th className="px-2 py-2 font-medium">Item</th>
            <th className="px-4 py-2 text-right font-medium">Weight</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.title} className="border-b last:border-0">
              <td className="whitespace-nowrap px-4 py-2.5">
                {row.date}
                {row.time && <span className="hidden text-muted-foreground sm:inline"> · {row.time}</span>}
              </td>
              <td className="px-2 py-2.5">{row.title}</td>
              <td className="px-4 py-2.5 text-right">{row.weight}</td>
            </tr>
          ))}
          <tr className="border-l-2 border-l-warning bg-highlight/50">
            <td className="px-4 py-2.5 text-highlight-foreground">No date</td>
            <td className="px-2 py-2.5">
              Final Exam
              <span className="block text-xs text-highlight-foreground">Set by the Registrar. Check later.</span>
            </td>
            <td className="px-4 py-2.5 text-right">45%</td>
          </tr>
        </tbody>
      </table>

      <div className="border-t bg-muted/60 px-4 py-3">
        <p className="text-xs text-muted-foreground">What the syllabus said</p>
        <p className="mt-1 font-serif text-[15px] leading-snug">
          &ldquo;<mark className="rounded-sm bg-highlight px-0.5 text-foreground">Research Summary 1 (10%)</mark> is due
          Friday of Week 3 by 11:59 pm.&rdquo;
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
          Weights add up to 100%
        </p>
        <span className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
          Confirm and add to calendar
        </span>
      </div>
    </div>
  );
}
