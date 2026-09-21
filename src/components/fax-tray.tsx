import { useMemo, useState } from "react";
import { FaxRow } from "@/components/fax-row";
import { BuySheet } from "@/components/paywall";
import { Input } from "@/components/ui/input";
import { owns } from "@/lib/catalog";
import { digitsOnly } from "@/lib/format";
import { useFaxStore } from "@/lib/store";
import type { FaxJob } from "@/lib/types";

export function FaxTray({ jobs, empty }: { jobs: FaxJob[]; empty: React.ReactNode }) {
  const [q, setQ] = useState("");
  const [buy, setBuy] = useState(false);
  const entitlements = useFaxStore((s) => s.entitlements);
  const canSearch = owns(entitlements, "vault");
  const filtered = useMemo(() => {
    if (!canSearch) return jobs;
    const needle = q.trim().toLowerCase();
    const num = digitsOnly(q);
    if (!needle) return jobs;
    return jobs.filter((job) => {
      const blob = `${job.toName} ${job.fromName} ${job.subject} ${job.toNumber} ${job.fromNumber} ${job.resultCode ?? ""}`.toLowerCase();
      return blob.includes(needle) || (num.length >= 3 && `${job.toNumber}${job.fromNumber}`.includes(num));
    });
  }, [canSearch, jobs, q]);

  return (
    <>
      <div className="px-5 pb-2">
        {canSearch ? (
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search names, numbers, subject"
            aria-label="Search tray"
          />
        ) : (
          <button
            type="button"
            onClick={() => setBuy(true)}
            className="flex h-10 w-full items-center justify-between rounded-lg border border-border bg-bg-elevated px-3 text-sm text-fg-muted"
          >
            <span>Search the vault</span>
            <span className="font-mono text-[11px] text-lcd">$4.99</span>
          </button>
        )}
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
      <BuySheet sku="vault" open={buy} onOpenChange={setBuy} />
    </>
  );
}
