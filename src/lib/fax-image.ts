import { blobToDataUrl } from "@/lib/idb";
import { formatHeaderStamp, padStation } from "@/lib/format";
import type { PaperSize, ScanMode, StationSettings } from "@/lib/types";
import { PAPER_PX } from "@/lib/types";

export function buildHeaderLine(
  settings: StationSettings,
  page: number,
  total: number,
  ts = Date.now(),
) {
  const stamp = formatHeaderStamp(ts);
  const id = padStation(settings.stationId || settings.headerName || "CARBON", 14);
  const num = (settings.ownNumber || "").replace(/\s+/g, " ").slice(0, 16);
  return `${stamp}  ${id}  ${num}  p.${page}/${total}`;
}

export function loadImageFromUrl(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image."));
    img.src = url;
  });
}

export async function loadImageFromFile(file: File | Blob) {
  const url = URL.createObjectURL(file);
  try {
    return await loadImageFromUrl(url);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
}

function applyThreshold(data: ImageData, cutoff: number) {
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!;
    const v = g > cutoff ? 243 : 28;
    const paper = v > 100;
    d[i] = paper ? 243 : 28;
    d[i + 1] = paper ? 238 : 25;
    d[i + 2] = paper ? 230 : 23;
    d[i + 3] = 255;
  }
}

function applyDither(data: ImageData) {
  const { width, height } = data;
  const d = data.data;
  const gray = new Float32Array(width * height);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    gray[p] = 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!;
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const old = gray[i]!;
      const nu = old < 128 ? 0 : 255;
      const err = old - nu;
      gray[i] = nu;
      if (x + 1 < width) gray[i + 1] += (err * 7) / 16;
      if (y + 1 < height && x > 0) gray[i + width - 1] += (err * 3) / 16;
      if (y + 1 < height) gray[i + width] += (err * 5) / 16;
      if (y + 1 < height && x + 1 < width) gray[i + width + 1] += err / 16;
    }
  }
  for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
    const paper = gray[p]! > 128;
    d[i] = paper ? 243 : 28;
    d[i + 1] = paper ? 238 : 25;
    d[i + 2] = paper ? 230 : 23;
    d[i + 3] = 255;
  }
}

export async function rasterizeToFax(options: {
  source: HTMLImageElement | HTMLCanvasElement;
  paperSize: PaperSize;
  mode: ScanMode;
  contrast?: number;
  rotation?: 0 | 90 | 180 | 270;
  header?: string;
}): Promise<{ blob: Blob; thumb: string; width: number; height: number }> {
  const paper = PAPER_PX[options.paperSize];
  const canvas = document.createElement("canvas");
  canvas.width = paper.w;
  canvas.height = paper.h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is unavailable.");

  ctx.fillStyle = "#f3eee6";
  ctx.fillRect(0, 0, paper.w, paper.h);

  const headerH = options.header ? 36 : 12;
  const margin = 28;
  const destW = paper.w - margin * 2;
  const destH = paper.h - headerH - margin;
  const rotation = options.rotation ?? 0;

  const srcW =
    rotation === 90 || rotation === 270 ? options.source.height : options.source.width;
  const srcH =
    rotation === 90 || rotation === 270 ? options.source.width : options.source.height;
  const scale = Math.min(destW / srcW, destH / srcH);
  const dw = srcW * scale;
  const dh = srcH * scale;
  const dx = margin + (destW - dw) / 2;
  const dy = headerH + (destH - dh) / 2;

  ctx.save();
  ctx.translate(dx + dw / 2, dy + dh / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  const drawW = rotation === 90 || rotation === 270 ? dh : dw;
  const drawH = rotation === 90 || rotation === 270 ? dw : dh;
  ctx.drawImage(options.source, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  const img = ctx.getImageData(0, headerH, paper.w, paper.h - headerH);
  const contrast = options.contrast ?? 0;
  if (contrast !== 0) {
    const d = img.data;
    const f = (259 * (contrast + 255)) / (255 * (259 - contrast));
    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.min(255, Math.max(0, f * (d[i]! - 128) + 128));
      d[i + 1] = Math.min(255, Math.max(0, f * (d[i + 1]! - 128) + 128));
      d[i + 2] = Math.min(255, Math.max(0, f * (d[i + 2]! - 128) + 128));
    }
  }
  if (options.mode === "photo") applyDither(img);
  else applyThreshold(img, 168);
  ctx.putImageData(img, 0, headerH);

  if (options.header) {
    ctx.fillStyle = "#f3eee6";
    ctx.fillRect(0, 0, paper.w, headerH);
    ctx.fillStyle = "#1c1917";
    ctx.font = "500 13px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.textBaseline = "middle";
    ctx.fillText(options.header, 18, headerH / 2 + 1);
    ctx.strokeStyle = "#1c1917";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(14, headerH - 1);
    ctx.lineTo(paper.w - 14, headerH - 1);
    ctx.stroke();
  }

  const blob = await canvasToBlob(canvas, "image/jpeg", 0.84);
  const thumb = await makeThumb(canvas);
  return { blob, thumb, width: paper.w, height: paper.h };
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = "image/jpeg", quality = 0.84) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("Could not encode the page."));
      else resolve(blob);
    }, type, quality);
  });
}

export async function makeThumb(source: HTMLCanvasElement | HTMLImageElement) {
  const w = 220;
  const h = Math.round((w * 11) / 8.5);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#f3eee6";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, w, h);
  return c.toDataURL("image/jpeg", 0.72);
}

export async function waitForFonts() {
  if (typeof document === "undefined") return;
  try {
    await Promise.race([
      document.fonts.ready,
      new Promise<void>((resolve) => setTimeout(resolve, 900)),
    ]);
  } catch {
    /* ignore */
  }
}

export { blobToDataUrl };
