/** One row of the settings page: explanation on the left, controls on the right. */
export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 border-b py-8 first:pt-0 last:border-0 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-10">
      <div>
        <h2 className="font-medium">{title}</h2>
        <div className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</div>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
