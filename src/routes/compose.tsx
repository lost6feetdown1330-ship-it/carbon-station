import { useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Camera, ChevronLeft, FileUp, FileText, Lock, Plus, Siren, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Scanner } from "@/components/scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { renderCoverPage } from "@/lib/cover";
import { buildHeaderLine } from "@/lib/fax-image";
import { displayNumber, estimateTransmitMs, formatDuration, formatFaxNumber, isDialable } from "@/lib/format";
import { savePageBlob } from "@/lib/idb";
import { ingestFile } from "@/lib/ingest";
import { sampleOutgoingLetter } from "@/lib/sample-docs";
import { useFaxStore } from "@/lib/store";
import { owns } from "@/lib/catalog";
import { BuySheet } from "@/components/paywall";
import type { Sku } from "@/lib/catalog";
import { BAUD_BY_RESOLUTION, type FaxJob } from "@/lib/types";
import { createId } from "@/lib/utils";

export const Route = createFileRoute("/compose")({ component: Compose });

function Compose() {
  const navigate = useNavigate();
  const settings = useFaxStore((s) => s.settings);
  const draft = useFaxStore((s) => s.draft);
  const contacts = useFaxStore((s) => s.contacts);
  const setDraft = useFaxStore((s) => s.setDraft);
  const addDraftPage = useFaxStore((s) => s.addDraftPage);
  const removeDraftPage = useFaxStore((s) => s.removeDraftPage);
  const resetDraft = useFaxStore((s) => s.resetDraft);
  const upsertFax = useFaxStore((s) => s.upsertFax);
  const setLastDialed = useFaxStore((s) => s.setLastDialed);
  const entitlements = useFaxStore((s) => s.entitlements);
  const [paySku, setPaySku] = useState<Sku | null>(null);
  const [scanning, setScanning] = useState(false);
  const [sending, setSending] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const pageTotal = draft.pages.length + (draft.includeCover ? 1 : 0);
  const eta = estimateTransmitMs(Math.max(1, pageTotal), draft.resolution);
  const matches = useMemo(() => {
    const q = draft.toNumber.replace(/\D/g, "");
    if (q.length < 3) return [];
    return contacts
      .filter(
        (c) =>
          c.fax.includes(q) ||
          c.name.toLowerCase().includes(draft.toName.toLowerCase()) ||
          c.company.toLowerCase().includes(draft.toName.toLowerCase()),
      )
      .slice(0, 4);
  }, [contacts, draft.toName, draft.toNumber]);

  async function addPages(pages: { blob: Blob; thumb: string }[]) {
    for (const page of pages) {
      await addDraftPage({ id: createId(), thumb: page.thumb, kind: "document" }, page.blob);
    }
    toast.success(pages.length === 1 ? "Page in the feeder." : `${pages.length} pages in the feeder.`);
  }

  async function insertSample() {
    const header = buildHeaderLine(settings, draft.pages.length + 1, draft.pages.length + 1);
    const page = await sampleOutgoingLetter(settings.headerName, settings.stationId, header);
    await addPages([page]);
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    setImporting(true);
    try {
      const pages = await ingestFile(file, {
        paperSize: settings.paperSize,
        mode: draft.scanMode,
        header: buildHeaderLine(settings, draft.pages.length + 1, draft.pages.length + 1),
      });
      await addPages(pages);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not import that file.");
    } finally {
      setImporting(false);
    }
  }

  async function handleSend() {
    if (!isDialable(draft.toNumber)) {
      toast.error("Enter a complete fax number.");
      return;
    }
    if (!draft.includeCover && draft.pages.length === 0) {
      toast.error("Load at least one page, or send a cover sheet.");
      return;
    }
    if (!draft.consented) {
      toast.error("Confirm you have permission to send this facsimile.");
      return;
    }
    setSending(true);
    try {
      const id = createId();
      const pages = [...draft.pages];
      const total = pages.length + (draft.includeCover ? 1 : 0);
      if (draft.includeCover) {
        const header = buildHeaderLine(settings, 1, Math.max(1, total));
        const cover = await renderCoverPage({
          paperSize: settings.paperSize,
          header,
          toName: draft.toName,
          toFax: draft.toNumber,
          fromName: settings.headerName,
          fromFax: settings.ownNumber,
          subject: draft.subject,
          comments: draft.comments,
          pages: Math.max(1, total),
          date: Date.now(),
          urgent: draft.urgent,
          confidential: draft.confidential,
          style: owns(entitlements, "press") ? draft.coverStyle : "plain",
        });
        const coverId = createId();
        await savePageBlob(coverId, cover.blob);
        pages.unshift({ id: coverId, thumb: cover.thumb, kind: "cover" });
      }
      const job: FaxJob = {
        id,
        direction: "out",
        status: "sending",
        toNumber: draft.toNumber,
        toName: draft.toName,
        fromNumber: settings.ownNumber,
        fromName: settings.headerName,
        subject: draft.subject || (draft.includeCover ? "Cover sheet" : "Document"),
        pages,
        cover: draft.includeCover,
        resolution: draft.resolution,
        ecm: draft.ecm,
        createdAt: Date.now(),
        baud: BAUD_BY_RESOLUTION[draft.resolution],
        comments: draft.comments,
        urgent: draft.urgent,
        confidential: draft.confidential,
      };
      upsertFax(job);
      setLastDialed(draft.toNumber);
      if (draft.ccNumber && owns(entitlements, "broadcast") && isDialable(draft.ccNumber)) {
        const ccId = createId();
        upsertFax({
          ...job,
          id: ccId,
          status: "queued",
          toNumber: draft.ccNumber,
          toName: draft.ccName || draft.toName,
          createdAt: Date.now(),
        });
        toast.success("Second destination queued in Sent.");
      }
      resetDraft();
      toast.dismiss();
      await navigate({ to: "/send/$jobId", params: { jobId: id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not queue the fax.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col pb-8">
      <header className="flex items-center gap-2 px-3 pt-4">
        <Button variant="ghost" size="icon" onClick={() => void navigate({ to: "/" })} aria-label="Back">
          <ChevronLeft />
        </Button>
        <div>
          <p className="font-mono text-[10px] tracking-[0.28em] text-fg-subtle">DOCUMENT FEED</p>
          <h1 className="text-lg font-medium">New facsimile</h1>
        </div>
      </header>

      <section className="mt-4 space-y-4 px-5">
        <div className="space-y-2">
          <Label htmlFor="to">Destination</Label>
          <Input
            id="to"
            inputMode="tel"
            placeholder="(503) 555-0100"
            value={formatFaxNumber(draft.toNumber)}
            onChange={(e) => setDraft({ toNumber: e.target.value })}
            className="font-mono"
          />
          <Input
            placeholder="Recipient or firm"
            value={draft.toName}
            onChange={(e) => setDraft({ toName: e.target.value })}
          />
          {matches.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {matches.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="rounded-full border border-border px-3 py-1 text-xs text-fg-muted hover:bg-bg-subtle"
                  onClick={() => setDraft({ toNumber: c.fax, toName: c.company || c.name })}
                >
                  {c.company || c.name}
                </button>
              ))}
            </div>
          )}
          {owns(entitlements, "broadcast") ? (
            <div className="space-y-2 pt-1">
              <Label htmlFor="cc">Broadcast to</Label>
              <Input
                id="cc"
                inputMode="tel"
                placeholder="Second destination (optional)"
                value={formatFaxNumber(draft.ccNumber ?? "")}
                onChange={(e) => setDraft({ ccNumber: e.target.value })}
                className="font-mono"
              />
              <Input
                placeholder="Second recipient"
                value={draft.ccName ?? ""}
                onChange={(e) => setDraft({ ccName: e.target.value })}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPaySku("broadcast")}
              className="flex w-full items-center justify-between rounded-lg border border-dashed border-border px-3 py-2 text-left text-xs text-fg-muted"
            >
              <span>Add a second destination</span>
              <span className="font-mono text-lcd">$4.99</span>
            </button>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label>Pages</Label>
            <span className="font-mono text-[11px] text-fg-subtle">{draft.pages.length} loaded</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {draft.pages.map((page, i) => (
              <div key={page.id} className="relative w-20 shrink-0">
                <img
                  src={page.thumb}
                  alt={`Page ${i + 1}`}
                  className="aspect-[8.5/11] w-full rounded-sm object-cover shadow-[var(--shadow-paper)]"
                />
                <button
                  type="button"
                  className="absolute -top-1 -right-1 rounded-full bg-bg p-1 text-fg-muted"
                  onClick={() => void removeDraftPage(page.id)}
                  aria-label="Remove page"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setScanning(true)}
              className="flex aspect-[8.5/11] w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-border text-fg-subtle hover:bg-bg-subtle"
            >
              <Plus className="size-4" />
              <span className="text-[10px]">Add</span>
            </button>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <Button variant="outline" onClick={() => setScanning(true)}>
              <Camera />
              Scan
            </Button>
            <Button variant="outline" disabled={importing} onClick={() => fileRef.current?.click()}>
              <FileUp />
              PDF
            </Button>
            <Button variant="outline" onClick={() => void insertSample()}>
              <FileText />
              Sample
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf,.pdf"
            className="hidden"
            onChange={(e) => void importFile(e.target.files?.[0])}
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(["text", "photo"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  if (mode === "photo" && !owns(entitlements, "photolab")) {
                    setPaySku("photolab");
                    return;
                  }
                  setDraft({ scanMode: mode });
                }}
                className={`rounded-lg border px-2 py-2 text-xs capitalize ${draft.scanMode === mode ? "border-lcd text-lcd" : "border-border text-fg-muted"}`}
              >
                {mode === "photo" && !owns(entitlements, "photolab") ? "photo · $1.99" : `${mode} mode`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border bg-bg-elevated px-4 py-3">
          <div>
            <p className="text-sm font-medium">Cover sheet</p>
            <p className="text-xs text-fg-subtle">Station letterhead, to/from, comments, opt-out</p>
          </div>
          <Switch checked={draft.includeCover} onCheckedChange={(v) => setDraft({ includeCover: v })} />
        </div>

        {draft.includeCover && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="re">Regarding</Label>
              <Input id="re" value={draft.subject} onChange={(e) => setDraft({ subject: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comments">Comments</Label>
              <Textarea
                id="comments"
                rows={3}
                value={draft.comments}
                onChange={(e) => setDraft({ comments: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={draft.urgent ? "start" : "outline"}
                className="flex-1"
                onClick={() => setDraft({ urgent: !draft.urgent })}
              >
                <Siren />
                Urgent
              </Button>
              <Button
                type="button"
                variant={draft.confidential ? "start" : "outline"}
                className="flex-1"
                onClick={() => setDraft({ confidential: !draft.confidential })}
              >
                <Lock />
                Confidential
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["plain", "legal", "medical", "realty", "invoice"] as const).map((style) => {
                const locked = style !== "plain" && !owns(entitlements, "press");
                return (
                  <button
                    key={style}
                    type="button"
                    onClick={() => (locked ? setPaySku("press") : setDraft({ coverStyle: style }))}
                    className={`rounded-lg border px-2 py-2 text-xs capitalize ${
                      (draft.coverStyle ?? "plain") === style ? "border-lcd text-lcd" : "border-border text-fg-muted"
                    }`}
                  >
                    {locked ? `${style} · $3.99` : style}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {(["standard", "fine", "superfine"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                if (r === "superfine" && !owns(entitlements, "photolab")) {
                  setPaySku("photolab");
                  return;
                }
                setDraft({ resolution: r });
              }}
              className={`rounded-lg border px-2 py-2 text-xs capitalize ${draft.resolution === r ? "border-lcd text-lcd" : "border-border text-fg-muted"}`}
            >
              {r === "superfine" && !owns(entitlements, "photolab") ? "superfine · $1.99" : r}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border bg-bg-elevated px-4 py-3">
          <div>
            <p className="text-sm font-medium">Error correction</p>
            <p className="text-xs text-fg-subtle">ECM retries damaged scan lines</p>
          </div>
          <Switch checked={draft.ecm} onCheckedChange={(v) => setDraft({ ecm: v })} />
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-border bg-bg-elevated px-4 py-3 text-sm leading-relaxed text-fg-muted">
          <input
            type="checkbox"
            className="mt-1 size-4 shrink-0 accent-lcd"
            checked={draft.consented}
            onChange={(e) => setDraft({ consented: e.target.checked })}
          />
          <span>
            I have permission to send this facsimile to this number. Unsolicited advertising faxes are unlawful.
          </span>
        </label>
      </section>

      <div className="mt-8 px-5">
        <p className="mb-3 font-mono text-[11px] text-fg-subtle">
          {pageTotal} page{pageTotal === 1 ? "" : "s"} · {formatDuration(eta)} · {displayNumber(draft.toNumber) || "no number"}
        </p>
        <Button
          variant="start"
          size="lg"
          className="w-full"
          disabled={sending || !draft.consented}
          onClick={() => void handleSend()}
        >
          {sending ? "Rasterizing…" : "Send fax"}
        </Button>
      </div>

      {scanning && (
        <Scanner
          settings={settings}
          mode={owns(entitlements, "photolab") ? draft.scanMode : "text"}
          header={buildHeaderLine(
            settings,
            draft.pages.length + (draft.includeCover ? 2 : 1),
            draft.pages.length + 1,
          )}
          onClose={() => setScanning(false)}
          onPages={async (pages) => {
            await addPages(pages);
            setScanning(false);
          }}
        />
      )}
      <BuySheet sku={paySku} open={Boolean(paySku)} onOpenChange={(v) => !v && setPaySku(null)} />
    </main>
  );
}
