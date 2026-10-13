// Written for the self-hosted edition (branch `selfhost`): every copy runs on its owner's own
// server. The hosted app (branch `main`) has its own wording; reconcile them when merging.
const sections: { heading: string; body: React.ReactNode }[] = [
  {
    heading: "What's stored",
    body: (
      <ul className="list-disc pl-5">
        <li>Your email address and password (the password is stored scrambled, never as plain text).</li>
        <li>Your time zone, detected from your browser, so deadlines land at the right time.</li>
        <li>The syllabus PDFs you upload.</li>
        <li>
          The deadlines, weights and notes taken from them, which ones you&apos;ve ticked off, and any marks you enter
          in the grade calculator.
        </li>
        <li>
          A record of each time a syllabus is read (how long it took and what it cost), to keep costs under control.
        </li>
        <li>If you link Canvas: your Canvas address and access token, encrypted.</li>
      </ul>
    ),
  },
  {
    heading: "Where it's stored",
    body: (
      <p>
        Syllabus Sync is self-hosted software: this copy runs on a server belonging to whoever set it up, and everything
        above is stored there. They control the server and its backups, and can see what&apos;s stored on it. There is
        no central Syllabus Sync service: the people who make the software never receive your data. No ads, and nothing
        is sold.
      </p>
    ),
  },
  {
    heading: "How your PDFs are read",
    body: (
      <p>
        To find your deadlines, your PDF is sent to Anthropic&apos;s Claude API, using the API key of whoever runs this
        copy. It&apos;s used only to extract dates and weights, and Anthropic doesn&apos;t use it to train its models.
        Anthropic may keep API data for a limited time for safety reasons; see{" "}
        <a
          className="underline"
          href="https://platform.claude.com/docs/en/manage-claude/api-and-data-retention"
          target="_blank"
          rel="noreferrer"
        >
          Anthropic&apos;s data retention policy
        </a>
        .
      </p>
    ),
  },
  {
    heading: "If you link Canvas",
    body: (
      <p>
        Your Canvas token is stored encrypted and used only on the server, only to read your own courses, assignments
        and grades, at the moment you open a page. Syllabus Sync never changes anything in Canvas, and doesn&apos;t
        store your Canvas grades unless you choose to save them as marks in the grade calculator. You can unlink Canvas
        in Settings at any time, and delete the token in Canvas itself.
      </p>
    ),
  },
  {
    heading: "Who can see what",
    body: (
      <p>
        Other students using this copy can&apos;t see your syllabi, deadlines, marks or Canvas link: the database itself
        enforces this, so even a bug in a page can&apos;t show your data to someone else. The person who runs the server
        can see the data stored on it.
      </p>
    ),
  },
  {
    heading: "Your calendar link",
    body: (
      <p>
        Your calendar feed has a long secret link. Anyone who has that link can see your deadlines (course codes, titles
        and dates, never your name or email), so don&apos;t share it. You can reset it any time on the Settings page,
        which makes the old link stop working.
      </p>
    ),
  },
  {
    heading: "Deleting your data",
    body: (
      <p>
        On a course page you can delete an uploaded PDF and keep its dates, or delete the whole course. On the Settings
        page, &ldquo;Delete my account&rdquo; permanently removes your account, your PDFs, your deadlines, your marks
        and your Canvas link. Copies may remain in the server&apos;s backups until those are replaced.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="font-serif text-4xl font-medium tracking-tight">Privacy, in plain language</h1>
      {sections.map((section) => (
        <section key={section.heading} className="flex flex-col gap-2">
          <h2 className="font-serif text-2xl font-medium">{section.heading}</h2>
          <div className="text-muted-foreground">{section.body}</div>
        </section>
      ))}
    </article>
  );
}
