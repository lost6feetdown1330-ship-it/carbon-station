import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, Share2, X } from "lucide-react";
import { LcdPanel } from "@/components/lcd-panel";
import { Button } from "@/components/ui/button";
import { PaperSheet } from "@/components/paper-sheet";
import { renderReceiptPage } from "@/lib/cover";
import { buildHeaderLine } from "@/lib/fax-image";
import { displayNumber, formatDuration } from "@/lib/format";
import { savePageBlob } from "@/lib/idb";
import { shareFax } from "@/lib/pdf-export";
import { playCed, playCng, playError, playModemBurst, playSuccess, setSpeakerMuted, unlockAudio } from "@/lib/tones";
import { BAUD_BY_RESOLUTION, type FaxJob } from "@/lib/types";
import { useFaxStore } from "@/lib/store";
import { createId } from "@/lib/utils";

type Stage =
  | "offhook"
  | "dialing"
  | "cng"
  | "ced"
  | "handshake"
  | "training"
  | "page"
  | "confirm"
  | "done"
  | "abort";

const STAGE_COPY: Record<Stage, [string, string]> = {
  offhook: ["OFF HOOK", "SEIZING LINE"],
  dialing: ["DIALING", ""],
  cng: ["CNG 1100 Hz", "CALLING TONE"],
  ced: ["CED 2100 Hz", "ANSWER TONE"],
  handshake: ["T.30 HANDSHAKE", "DIS / DCS"],
  training: ["MODEM TRAIN", "V.17"],
  page: ["SENDING PAGE", ""],
  confirm: ["MCF RECEIVED", "PAGE OK"],
  done: ["RESULT OK", "ON HOOK"],
  abort: ["USER ABORT", "LINE DROPPED"],
};

export function TransmitTheater({ job }: { job: FaxJob }) {
  const navigate = useNavigate();
  const patchFax = useFaxStore((s) => s.patchFax);
  const settings = useFaxStore((s) => s.settings);
  const [stage, setStage] = useState<Stage>(
    job.status === "sent" ? "done" : job.status === "failed" ? "abort" : "offhook",
  );
  const [pageIndex, setPageIndex] = useState(0);
  const [progress, setProgress] = useState(job.status === "sent" ? 100 : 0);
  const abortRef = useRef(false);
  const startRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState(job.durationMs ?? 0);

  const pageCount = job.pages.length || 1;
  const baud = job.baud ?? BAUD_BY_RESOLUTION[job.resolution];

  useEffect(() => {
    setSpeakerMuted(!settings.speaker);
    void unlockAudio();
  }, [settings.speaker]);

  useEffect(() => {
    if (job.status === "sent" || job.status === "failed") return;
    const t = window.setInterval(() => setElapsed(Date.now() - startRef.current), 250);
    return () => window.clearInterval(t);
  }, [job.status]);

  useEffect(() => {
    if (job.status === "sent" || job.status === "failed") return;
    abortRef.current = false;
    let cancelled = false;

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = window.setTimeout(resolve, ms);
        const i = window.setInterval(() => {
          if (abortRef.current || cancelled) {
            window.clearTimeout(t);
            window.clearInterval(i);
            resolve();
          }
        }, 80);
      });

    void (async () => {
      const steps: Array<{ stage: Stage; ms: number; sound?: () => void }> = [
        { stage: "offhook", ms: 500 },
        { stage: "dialing", ms: Math.min(2200, 280 * displayNumber(job.toNumber).length) },
        { stage: "cng", ms: 900, sound: playCng },
        { stage: "ced", ms: 800, sound: playCed },
        { stage: "handshake", ms: 1100, sound: playModemBurst },
        { stage: "training", ms: 700, sound: playModemBurst },
      ];
      for (const step of steps) {
        if (abortRef.current || cancelled) break;
        setStage(step.stage);
        step.sound?.();
        await wait(step.ms);
      }
      for (let i = 0; i < pageCount; i++) {
        if (abortRef.current || cancelled) break;
        setPageIndex(i);
        setStage("page");
        setProgress(0);
        const duration = job.resolution === "standard" ? 2200 : job.resolution === "fine" ? 2800 : 3400;
        const started = Date.now();
        while (Date.now() - started < duration) {
          if (abortRef.current || cancelled) break;
          setProgress(Math.min(100, ((Date.now() - started) / duration) * 100));
          await wait(80);
        }
        setProgress(100);
        setStage("confirm");
        await wait(400);
      }
      if (cancelled) return;
      if (abortRef.current) {
        setStage("abort");
        playError();
        patchFax(job.id, {
          status: "failed",
          resultCode: "ABORT",
          error: "Transmission cancelled",
          completedAt: Date.now(),
          durationMs: Date.now() - startRef.current,
        });
        return;
      }
      const durationMs = Date.now() - startRef.current;
      let pages = job.pages;
      if (settings.confirmationPage) {
        try {
          const header = buildHeaderLine(settings, pages.length + 1, pages.length + 1);
          const receipt = await renderReceiptPage({
            paperSize: settings.paperSize,
            header,
            toName: job.toName,
            toFax: job.toNumber,
            pages: pageCount,
            durationMs,
            baud,
            result: "OK",
            ecm: job.ecm,
            date: Date.now(),
            stationId: settings.stationId,
          });
          const id = createId();
          await savePageBlob(id, receipt.blob);
          pages = [...pages, { id, thumb: receipt.thumb, kind: "receipt" }];
        } catch {
          /* keep the session even if the slip fails */
        }
      }
      setStage("done");
      playSuccess();
      patchFax(job.id, {
        status: "sent",
        resultCode: "OK",
        completedAt: Date.now(),
        durationMs,
        baud,
        pages,
      });
      const filed: FaxJob = {
        ...job,
        pages,
        status: "sent",
        resultCode: "OK",
        completedAt: Date.now(),
        durationMs,
        baud,
      };
      void shareFax(filed).catch(() => undefined);
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally not depending on the whole job object — patching status/pages
    // must not restart the handshake.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id, job.status]);

  const copy = useMemo(() => {
    const [a, b] = STAGE_COPY[stage];
    if (stage === "dialing") return [a, displayNumber(job.toNumber)] as const;
    if (stage === "page") return [a, `PAGE ${pageIndex + 1} OF ${pageCount}`] as const;
    return [a, b] as const;
  }, [job.toNumber, pageCount, pageIndex, stage]);

  const currentThumb = job.pages[Math.min(pageIndex, Math.max(0, job.pages.length - 1))]?.thumb;
  const finished = stage === "done" || stage === "abort";

  return (
    <div className="flex min-h-dvh flex-col bg-bg px-5 pt-6 pb-8">
      <p className="font-mono text-[10px] tracking-[0.28em] text-fg-subtle">T.30 SESSION</p>
      <LcdPanel
        className="mt-3"
        line1={copy[0]}
        line2={copy[1]}
        status={stage === "abort" ? "error" : finished ? "ok" : "busy"}
      />

      <div className="mt-5 flex items-center justify-between font-mono text-[11px] text-fg-subtle tabular-nums">
        <span>{formatDuration(elapsed)}</span>
        <span>V.17 {baud} BPS</span>
        <span>ECM {job.ecm ? "ON" : "OFF"}</span>
      </div>

      <div className="relative mx-auto mt-6 w-full max-w-xs">
        {currentThumb && (
          <div className="relative overflow-hidden rounded-sm">
            <PaperSheet src={currentThumb} alt="Transmitting page" />
            {stage === "page" && (
              <div
                className="scanline pointer-events-none absolute inset-x-0 h-10"
                style={{ top: `${progress}%`, transform: "translateY(-50%)" }}
              />
            )}
          </div>
        )}
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-bg-subtle">
          <div
            className="h-full bg-lcd transition-[width] duration-150"
            style={{ width: `${stage === "done" ? 100 : progress}%` }}
          />
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 pt-8">
        {!finished ? (
          <Button
            variant="outline"
            onClick={() => {
              abortRef.current = true;
            }}
          >
            <X />
            Drop line
          </Button>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm">
              {stage === "done" ? (
                <Check className="size-4 text-lcd" />
              ) : (
                <X className="size-4 text-danger" />
              )}
              <span>
                {stage === "done"
                  ? "RESULT OK. Pages dispatched from this station."
                  : "Line dropped."}
              </span>
            </div>
            {stage === "done" && (
              <Button
                variant="start"
                onClick={() => {
                  void shareFax(job)
                    .then((mode) => {
                      if (mode === "downloaded") {
                        /* share sheet unavailable — file still saved */
                      }
                    })
                    .catch(() => undefined);
                }}
              >
                <Share2 />
                Share fax
              </Button>
            )}
            <Button
              variant={stage === "done" ? "outline" : "start"}
              onClick={() => void navigate({ to: "/fax/$id", params: { id: job.id } })}
            >
              View confirmation
            </Button>
            <Button variant="ghost" onClick={() => void navigate({ to: "/sent" })}>
              Sent tray
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
