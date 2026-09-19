import { PDFDocument } from "pdf-lib";
import { loadPageBlob } from "@/lib/idb";
import type { FaxJob } from "@/lib/types";

export async function faxToPdf(job: FaxJob) {
  const pdf = await PDFDocument.create();
  for (const page of job.pages ?? []) {
    const blob = await loadPageBlob(page.id);
    if (!blob) continue;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const jpg = await pdf.embedJpg(bytes).catch(async () => pdf.embedPng(bytes));
    const width = 612;
    const height = Math.round((width * jpg.height) / jpg.width);
    const p = pdf.addPage([width, height]);
    p.drawImage(jpg, { x: 0, y: 0, width, height });
  }
  if (pdf.getPageCount() === 0) throw new Error("No pages were on file to export.");
  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: "application/pdf" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function fileNameFor(job: FaxJob) {
  const base = (job.subject || "facsimile").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return `${base || "facsimile"}-${job.id.slice(0, 6)}.pdf`;
}

export async function shareFax(job: FaxJob): Promise<"shared" | "downloaded"> {
  const pdf = await faxToPdf(job);
  const name = fileNameFor(job);
  const file = new File([pdf], name, { type: "application/pdf" });
  const payload = { title: job.subject || "Facsimile", text: `Facsimile · ${job.pages.length} page(s)`, files: [file] };
  try {
    if (typeof navigator.share === "function" && navigator.canShare?.(payload)) {
      await navigator.share(payload);
      return "shared";
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return "shared";
  }
  downloadBlob(pdf, name);
  return "downloaded";
}
