import { useMemo, useState } from "react";
import { FaxRow } from "@/components/fax-row";
import { Input } from "@/components/ui/input";
import { digitsOnly } from "@/lib/format";
import type { FaxJob } from "@/lib/types";

export function FaxTray({ jobs, empty }: { jobs: FaxJob[]; empty: React.ReactNode }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const num = digitsOnly(q);
    if (!needle) return jobs;
    return jobs.filter((job) => {
      const blob = `${job.toName} ${job.fromName} ${job.subject} ${job.toNumber} ${job.fromNumber} ${job.resultCode ?? ""}`.toLowerCase();
      return blob.includes(needle) || (num.length >= 3 && `${job.toNumber}${job.fromNumber}`.includes(num));
    });
  }, [jobs, q]);

  return (
    <>
      <div className="px-5 pb-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search names, numbers, subject"
          aria-label="Search tray"
        />
      </div>
      {jobs.length === 0 ? (
        empty
      ) : filtered.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-fg-muted">No pages match that search.</p>
      ) : (
        <div className="divide-y divide-border px-3 pb-8">
          {filtered.map((job) => (
            <FaxRow key={job.id} job={job} />
          ))}
        </div>
      )}
    </>
  );
}
