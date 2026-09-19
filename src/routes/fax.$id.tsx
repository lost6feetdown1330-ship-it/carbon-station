import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Download, Printer, RotateCcw, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PaperSheet } from "@/components/paper-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { displayNumber, formatDuration, formatLongDate } from "@/lib/format";
import { blobToDataUrl, loadPageBlob } from "@/lib/idb";
import { downloadBlob, faxToPdf, shareFax } from "@/lib/pdf-export";
import { useFaxStore } from "@/lib/store";

export const Route = createFileRoute("/fax/$id")({ component: FaxDetail });

function FaxDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const job = useFaxStore((s) => s.faxes.find((f) => f.id === id));
  const markRead = useFaxStore((s) => s.markRead);
  const deleteFax = useFaxStore((s) => s.deleteFax);
  const setDraft = useFaxStore((s) => s.setDraft);
  const [pages, setPages] = useState<string[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!job) return;
    if (job.unread) markRead(job.id);
    let cancelled = false;
    void (async () => {
      const urls: string[] = [];
      for (const page of job.pages ?? []) {
        const blob = await loadPageBlob(page.id);
        urls.push(blob ? await blobToDataUrl(blob) : page.thumb);
      }
      if (!cancelled) setPages(urls);
    })();
    return () => {
      cancelled = true;
    };
  }, [job, markRead]);

  if (!job) {
    return (
      <main className="px-6 py-16 text-center text-fg-muted">
        This facsimile is no longer on the machine.
      </main>
    );
  }

  const peerName = job.direction === "in" ? job.fromName : job.toName;
  const peerNumber = job.direction === "in" ? job.fromNumber : job.toNumber;

  async function onShare() {
    if (!job) return;
    setSharing(true);
    try {
      const mode = await shareFax(job);
      if (mode === "downloaded") toast.success("PDF saved. Attach it from Files or Mail.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not share the fax.");
    } finally {
      setSharing(false);
    }
  }

  async function onDownload() {
    if (!job) return;
    setDownloading(true);
    try {
      const pdf = await faxToPdf(job);
      downloadBlob(pdf, `${job.subject || "fax"}-${job.id.slice(0, 6)}.pdf`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build the PDF.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main className="pb-10">
      <header className="flex items-center gap-2 px-3 pt-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void navigate({ to: job.direction === "in" ? "/inbox" : "/sent" })}
          aria-label="Back"
        >
          <ChevronLeft />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] tracking-[0.28em] text-fg-subtle">
            {job.direction === "in" ? "RECEIVED" : "TRANSMITTED"}
          </p>
          <h1 className="truncate text-lg font-medium">{peerName || displayNumber(peerNumber)}</h1>
        </div>
        <Badge variant={job.status === "failed" ? "danger" : "lcd"}>{job.resultCode || job.status}</Badge>
      </header>

      <section className="mt-4 grid grid-cols-2 gap-3 px-5 font-mono text-xs text-fg-muted">
        <Meta label="Number" value={displayNumber(peerNumber)} />
        <Meta label="When" value={formatLongDate(job.createdAt)} />
        <Meta label="Pages" value={String(job.pages.length)} />
        <Meta label="Time" value={job.durationMs ? formatDuration(job.durationMs) : "—"} />
        <Meta label="Speed" value={job.baud ? `V.17 ${job.baud}` : "—"} />
        <Meta label="ECM" value={job.ecm ? "On" : "Off"} />
      </section>

      {job.subject && <p className="mt-4 px-5 text-sm text-fg">{job.subject}</p>}

      <div className="mt-5 space-y-6 px-8">
        {(pages.length ? pages : (job.pages ?? []).map((p) => p.thumb)).map((src, i) => (
          <PaperSheet key={job.pages?.[i]?.id ?? i} src={src} alt={`Page ${i + 1}`} />
        ))}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-2 px-5">
        <Button variant="start" className="col-span-2" disabled={sharing} onClick={() => void onShare()}>
          <Share2 />
          Share fax
        </Button>
        <Button variant="outline" disabled={downloading} onClick={() => void onDownload()}>
          <Download />
          PDF
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer />
          Print
        </Button>
        <Button
          variant="start"
          className="col-span-2"
          onClick={() => {
            if (job.direction === "in") {
              setDraft({
                toNumber: job.fromNumber,
                toName: job.fromName,
                subject: job.subject ? `Re: ${job.subject}` : "",
              });
            } else {
              setDraft({
                toNumber: job.toNumber,
                toName: job.toName,
                subject: job.subject,
              });
            }
            void navigate({ to: "/compose" });
          }}
        >
          {job.direction === "in" ? "Reply" : (
            <>
              <RotateCcw />
              Resend
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          className="col-span-2 text-danger"
          onClick={async () => {
            await deleteFax(job.id);
            toast.success("Removed from the tray.");
            void navigate({ to: job.direction === "in" ? "/inbox" : "/sent" });
          }}
        >
          <Trash2 />
          Delete
        </Button>
      </div>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] tracking-[0.18em] text-fg-subtle uppercase">{label}</p>
      <p className="mt-1 text-fg">{value}</p>
    </div>
  );
}
