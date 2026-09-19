import { Link } from "@tanstack/react-router";
import { displayNumber, formatClock, formatShortDate } from "@/lib/format";
import type { FaxJob } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function FaxRow({ job }: { job: FaxJob }) {
  const pages = job.pages ?? [];
  const name =
    job.direction === "in"
      ? job.fromName || displayNumber(job.fromNumber)
      : job.toName || displayNumber(job.toNumber);
  const number = job.direction === "in" ? job.fromNumber : job.toNumber;
  const status =
    job.status === "sent"
      ? "ok"
      : job.status === "received"
        ? "ok"
        : job.status === "failed"
          ? "fail"
          : job.status === "sending"
            ? "live"
            : "wait";

  return (
    <Link
      to="/fax/$id"
      params={{ id: job.id }}
      className="flex gap-3 rounded-xl px-2 py-3 transition-colors duration-150 hover:bg-bg-subtle"
    >
      <div className="paper-grain h-[72px] w-[56px] shrink-0 overflow-hidden rounded-sm shadow-[var(--shadow-paper)]">
        {pages[0]?.thumb ? (
          <img src={pages[0].thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-paper" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("truncate font-medium", job.unread && "text-fg")}>{name}</p>
          <time className="shrink-0 font-mono text-[11px] text-fg-subtle tabular-nums">
            {formatShortDate(job.createdAt)} {formatClock(job.createdAt)}
          </time>
        </div>
        <p className="mt-0.5 truncate font-mono text-xs text-fg-muted">{displayNumber(number)}</p>
        <p className="mt-1 truncate text-sm text-fg-subtle">{job.subject || `${pages.length} page${pages.length === 1 ? "" : "s"}`}</p>
        <div className="mt-2 flex items-center gap-2">
          {job.unread && <Badge variant="lcd">New</Badge>}
          <Badge variant={status === "fail" ? "danger" : status === "live" ? "warn" : "default"}>
            {job.resultCode || job.status}
          </Badge>
          <span className="font-mono text-[10px] text-fg-subtle">{pages.length} pg</span>
        </div>
      </div>
    </Link>
  );
}
