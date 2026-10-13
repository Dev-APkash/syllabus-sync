import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type Props = {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
};

/** The same title block at the top of every signed-in page. */
export function PageHeader({ title, description, actions, back }: Props) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        {back && (
          <Link
            href={back.href}
            className="-ml-1 mb-1 inline-flex w-fit items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            {back.label}
          </Link>
        )}
        <h1 className="font-serif text-3xl font-medium tracking-tight">{title}</h1>
        {description && <p className="max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
