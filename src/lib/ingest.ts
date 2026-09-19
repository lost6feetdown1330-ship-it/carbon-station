import { loadImageFromFile, rasterizeToFax } from "@/lib/fax-image";
import type { PaperSize, ScanMode } from "@/lib/types";

export interface IngestPage {
  blob: Blob;
  thumb: string;
}

const MAX_PDF_PAGES = 20;

export async function ingestFile(
  file: File,
  opts: { paperSize: PaperSize; mode: ScanMode; header: string },
): Promise<IngestPage[]> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return ingestPdf(file, opts);
  }
  if (!file.type.startsWith("image/") && !/\.(png|jpe?g|webp|gif|heic)$/i.test(file.name)) {
    throw new Error("Use a photo or a PDF of the pages.");
  }
  const img = await loadImageFromFile(file);
  const page = await rasterizeToFax({
    source: img,
    paperSize: opts.paperSize,
    mode: opts.mode,
    header: opts.header,
  });
  return [{ blob: page.blob, thumb: page.thumb }];
}

async function ingestPdf(
  file: File,
  opts: { paperSize: PaperSize; mode: ScanMode; header: string },
) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const count = Math.min(doc.numPages, MAX_PDF_PAGES);
  const pages: IngestPage[] = [];
  for (let i = 1; i <= count; i++) {
    const pdfPage = await doc.getPage(i);
    const viewport = pdfPage.getViewport({ scale: 1.6 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable.");
    await pdfPage.render({ canvas, viewport }).promise;
    const header = opts.header.replace(/p\.\d+\/\d+/, `p.${i}/${count}`);
    const raster = await rasterizeToFax({
      source: canvas,
      paperSize: opts.paperSize,
      mode: opts.mode,
      header,
    });
    pages.push({ blob: raster.blob, thumb: raster.thumb });
  }
  return pages;
}
