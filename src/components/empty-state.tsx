import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="mx-5 mt-10 rounded-2xl border border-border bg-bg-elevated px-6 py-12 text-center">
      <Icon className="mx-auto size-6 text-fg-subtle" />
      <p className="mt-4 text-base font-medium">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{body}</p>
    </div>
  );
}
