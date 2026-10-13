// The worked example from PLAN.md, drawn like a worked answer.

const lines = [
  { item: "Assignments", weight: "30%", mark: "85%" },
  { item: "Midterm", weight: "30%", mark: "70%" },
  { item: "Final exam", weight: "40%", mark: "?" },
];

export function GradePreview() {
  return (
    <div className="rounded-lg border bg-card p-5 text-sm tabular-nums">
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="pb-2 font-medium">Item</th>
            <th className="pb-2 text-right font-medium">Weight</th>
            <th className="pb-2 text-right font-medium">Your mark</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.item} className="border-t">
              <td className="py-2">{line.item}</td>
              <td className="py-2 text-right text-muted-foreground">{line.weight}</td>
              <td className="py-2 text-right">{line.mark}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-baseline justify-between border-t border-foreground/80 pt-3">
        <span className="text-muted-foreground">Target for the course</span>
        <span>80%</span>
      </div>
      <p className="mt-4 font-serif text-2xl leading-tight">
        You need <span className="text-primary">83.8%</span> on the final exam.
      </p>
    </div>
  );
}
