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
import { getDeployEnvelope } from "@/lib/envelope";
import { faxToPdf, shareFax } from "@/lib/pdf-export";
import { carrierResult, dispatchLine, pollLine } from "@/lib/line-client";
import { owns } from "@/lib/catalog";

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
  | "pstn"
  | "t38"
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
  pstn: ["PSTN QUEUE", "CARRIER"],
  t38: ["T.38 SEND", ""],
  confirm: ["MCF RECEIVED", "PAGE OK"],
  done: ["RESULT OK", "ON HOOK"],
  abort: ["USER ABORT", "LINE DROPPED"],
};

export function TransmitTheater({ job }: { job: FaxJob }) {
  const navigate = useNavigate();
  const patchFax = useFaxStore((s) => s.patchFax);
  const settings = useFaxStore((s) => s.settings);
  const entitlements = useFaxStore((s) => s.entitlements);
  const [stage, setStage] = useState<Stage>(
    job.status === "sent" ? "done" : job.status === "failed" ? "abort" : "offhook",
  );
  const [pageIndex, setPageIndex] = useState(0);
  const [progress, setProgress] = useState(job.status === "sent" ? 100 : 0);
  const abortRef = useRef(false);
  const startRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState(job.durationMs ?? 0);
  const [carrierLine, setCarrierLine] = useState("");
  const pstnRef = useRef(false);

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

      let resultCode = "OK";
      let resultError: string | undefined;
      let carrier: FaxJob["carrier"] = "local";
      let carrierSid: string | undefined;
      let usedPstn = false;

      try {
        const envelope = await getDeployEnvelope();
        if (envelope.state === "live" && !abortRef.current) {
          usedPstn = true;
          pstnRef.current = true;
          setStage("pstn");
          setCarrierLine("SEIZING CARRIER");
          const pdf = await faxToPdf(job);
          const attempts = owns(entitlements, "watchdog") ? 3 : 1;
          let dispatched: { sid: string; from: string; status: string } | null = null;
          let snapStatus = "queued";
          for (let attempt = 0; attempt < attempts && !abortRef.current && !cancelled; attempt++) {
            if (attempt > 0) {
              setCarrierLine(`REDIAL ${attempt + 1} OF ${attempts}`);
              await wait(1200);
            }
            dispatched = await dispatchLine(job, pdf);
            carrier = "pstn";
            carrierSid = dispatched.sid;
            patchFax(job.id, { carrier: "pstn", carrierSid: dispatched.sid, fromNumber: dispatched.from || job.fromNumber });
            setStage("t38");
            setCarrierLine(dispatched.status.toUpperCase());
            const deadline = Date.now() + 5 * 60 * 1000;
            snapStatus = dispatched.status;
            while (Date.now() < deadline && !abortRef.current && !cancelled) {
              const snap = await pollLine(dispatched.sid);
              snapStatus = snap.status;
              setCarrierLine(snap.status.replace(/-/g, " ").toUpperCase());
              if (snap.numPages) setProgress(Math.min(100, (snap.numPages / pageCount) * 100));
              if (["delivered", "no-answer", "busy", "failed", "canceled"].includes(snap.status)) break;
              await wait(2000);
            }
            if (snapStatus === "delivered" || snapStatus === "canceled") break;
            if (!["busy", "no-answer", "failed"].includes(snapStatus)) break;
          }
          const outcome = carrierResult(snapStatus);
          resultCode = outcome.code;
          resultError = outcome.error;
          if (!outcome.ok) {
            setStage("abort");
            playError();
            patchFax(job.id, {
              status: "failed",
              resultCode,
              error: resultError,
              carrier,
              carrierSid,
              completedAt: Date.now(),
              durationMs: Date.now() - startRef.current,
            });
            return;
          }
        }
      } catch (err) {
        if (usedPstn) {
          const message = err instanceof Error ? err.message : "Carrier failed";
          setStage("abort");
          playError();
          patchFax(job.id, {
            status: "failed",
            resultCode: "FAILED",
            error: message,
            carrier: "pstn",
            carrierSid,
            completedAt: Date.now(),
            durationMs: Date.now() - startRef.current,
          });
          return;
        }
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
            result: resultCode,
            ecm: job.ecm,
            date: Date.now(),
            stationId: settings.stationId,
            certified: owns(entitlements, "certified"),
            certId: (carrierSid || job.id).slice(0, 10).toUpperCase(),
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
        resultCode,
        error: resultError,
        carrier,
        carrierSid,
        completedAt: Date.now(),
        durationMs,
        baud,
        pages,
      });
      const filed: FaxJob = {
        ...job,
        pages,
        status: "sent",
        resultCode,
        carrier,
        carrierSid,
        completedAt: Date.now(),
        durationMs,
        baud,
      };
      if (carrier !== "pstn") {
        void shareFax(filed).catch(() => undefined);
      }
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
    if (stage === "pstn" || stage === "t38") return [a, carrierLine || b] as const;
    return [a, b] as const;
  }, [carrierLine, job.toNumber, pageCount, pageIndex, stage]);

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
                  ? job.carrier === "pstn" || pstnRef.current
                    ? "RESULT OK. Pages on the PSTN."
                    : "RESULT OK. Pages dispatched from this station."
                  : job.error || "Line dropped."}
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
