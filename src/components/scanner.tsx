import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, LoaderCircle, RefreshCw, RotateCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ingestFile, type IngestPage } from "@/lib/ingest";
import { rasterizeToFax } from "@/lib/fax-image";
import type { ScanMode, StationSettings } from "@/lib/types";

interface ScannerProps {
  settings: StationSettings;
  mode: ScanMode;
  header: string;
  onClose: () => void;
  onPages: (pages: IngestPage[]) => void;
}

export function Scanner({ settings, mode, header, onClose, onPages }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<HTMLImageElement | null>(null);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } },
          audio: false,
        });
        if (!active) {
          media.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(media);
        if (videoRef.current) videoRef.current.srcObject = media;
      } catch {
        setError("Camera is blocked. Use the library for photos and PDFs.");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  async function processSource(img: HTMLImageElement) {
    setBusy(true);
    try {
      const result = await rasterizeToFax({
        source: img,
        paperSize: settings.paperSize,
        mode,
        rotation,
        header,
      });
      onPages([{ blob: result.blob, thumb: result.thumb }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process that page.");
    } finally {
      setBusy(false);
    }
  }

  async function snap() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const img = new Image();
    img.src = canvas.toDataURL("image/jpeg", 0.92);
    await new Promise((res) => {
      img.onload = () => res(null);
    });
    setPreview(img);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const pages = await ingestFile(file, {
        paperSize: settings.paperSize,
        mode,
        header,
      });
      onPages(pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      <header className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <p className="font-mono text-[10px] tracking-[0.28em] text-fg-subtle">DOCUMENT FEED</p>
        <button type="button" className="rounded-md p-2 text-fg-muted hover:bg-bg-subtle" onClick={onClose}>
          <X className="size-5" />
        </button>
      </header>

      <div className="relative mx-4 min-h-0 flex-1 overflow-hidden rounded-xl bg-lcd-deep">
        {preview ? (
          <img
            src={preview.src}
            alt="Captured page"
            className="h-full w-full object-contain"
            style={{ transform: `rotate(${rotation}deg)` }}
          />
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            <div className="pointer-events-none absolute inset-8 border border-lcd/40">
              <span className="absolute top-0 left-0 size-4 border-t-2 border-l-2 border-lcd" />
              <span className="absolute top-0 right-0 size-4 border-t-2 border-r-2 border-lcd" />
              <span className="absolute bottom-0 left-0 size-4 border-b-2 border-l-2 border-lcd" />
              <span className="absolute bottom-0 right-0 size-4 border-b-2 border-r-2 border-lcd" />
            </div>
          </>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg/60">
            <LoaderCircle className="size-8 animate-spin text-lcd" />
          </div>
        )}
      </div>

      {error && <p className="px-5 pt-3 text-sm text-danger">{error}</p>}

      <div className="flex flex-col gap-3 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {preview ? (
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" onClick={() => setPreview(null)}>
              <RefreshCw />
              Retake
            </Button>
            <Button
              variant="outline"
              onClick={() => setRotation((r) => ((r + 90) % 360) as 0 | 90 | 180 | 270)}
            >
              <RotateCw />
              Rotate
            </Button>
            <Button variant="start" disabled={busy} onClick={() => void processSource(preview)}>
              Use page
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Button variant="outline" className="flex-1" onClick={() => fileRef.current?.click()}>
              <ImagePlus />
              Files
            </Button>
            <button
              type="button"
              onClick={() => void snap()}
              className="flex size-16 items-center justify-center rounded-full border-4 border-paper bg-lcd text-lcd-deep shadow-machine"
              aria-label="Capture page"
            >
              <Camera className="size-6" />
            </button>
            <Button
              variant="outline"
              className={cn("flex-1", !stream && "opacity-50")}
              disabled={!stream}
              onClick={() => void snap()}
            >
              Snap
            </Button>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf,.pdf"
          className="hidden"
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
      </div>
    </div>
  );
}
