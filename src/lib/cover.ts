import { canvasToBlob, makeThumb, waitForFonts } from "@/lib/fax-image";
import { displayNumber } from "@/lib/format";
import type { PaperSize } from "@/lib/types";
import { PAPER_PX } from "@/lib/types";

export interface CoverInput {
  paperSize: PaperSize;
  header: string;
  toName: string;
  toFax: string;
  fromName: string;
  fromFax: string;
  subject: string;
  comments: string;
  pages: number;
  date: number;
  urgent?: boolean;
  confidential?: boolean;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number, maxLines = 8) {
  const words = text.split(/\s+/).filter(Boolean);
  let line = "";
  let used = 0;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxW && line) {
      ctx.fillText(line, x, y + used * lineH);
      line = word;
      used += 1;
      if (used >= maxLines) return used;
    } else {
      line = next;
    }
  }
  if (line && used < maxLines) {
    ctx.fillText(line, x, y + used * lineH);
    used += 1;
  }
  return used;
}

export async function renderCoverPage(input: CoverInput) {
  await waitForFonts();
  const paper = PAPER_PX[input.paperSize];
  const canvas = document.createElement("canvas");
  canvas.width = paper.w;
  canvas.height = paper.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable.");

  ctx.fillStyle = "#f3eee6";
  ctx.fillRect(0, 0, paper.w, paper.h);

  ctx.fillStyle = "#1c1917";
  ctx.font = "500 13px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.textBaseline = "middle";
  ctx.fillText(input.header, 28, 22);
  ctx.strokeStyle = "#1c1917";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(22, 36);
  ctx.lineTo(paper.w - 22, 36);
  ctx.stroke();

  const x = 56;
  let y = 88;

  ctx.font = "600 13px 'IBM Plex Sans', sans-serif";
  ctx.fillText("FACSIMILE TRANSMITTAL", x, y);
  y += 18;
  ctx.font = "500 42px 'IBM Plex Sans', sans-serif";
  ctx.fillText("FAX", x, y + 28);
  ctx.font = "400 14px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.fillStyle = "#5c564e";
  ctx.fillText("COVER SHEET", x + 118, y + 36);
  ctx.fillStyle = "#1c1917";

  y += 78;
  ctx.fillRect(x, y, paper.w - x * 2, 2);

  if (input.urgent || input.confidential) {
    y += 28;
    ctx.font = "600 14px 'IBM Plex Sans', sans-serif";
    const flags = [
      input.urgent ? "URGENT" : "",
      input.confidential ? "CONFIDENTIAL" : "",
    ].filter(Boolean);
    ctx.fillText(flags.join("   ·   "), x, y);
  }

  y += 42;
  const date = new Date(input.date).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const rows: [string, string][] = [
    ["DATE", date],
    ["PAGES", `${input.pages} (including cover)`],
    ["TO", input.toName || "—"],
    ["FAX", displayNumber(input.toFax)],
    ["FROM", input.fromName || "—"],
    ["FROM FAX", displayNumber(input.fromFax)],
    ["RE", input.subject || "—"],
  ];

  ctx.font = "500 13px 'IBM Plex Mono', ui-monospace, monospace";
  for (const [label, value] of rows) {
    ctx.fillStyle = "#5c564e";
    ctx.fillText(label, x, y);
    ctx.fillStyle = "#1c1917";
    ctx.font = "500 18px 'IBM Plex Sans', sans-serif";
    ctx.fillText(value, x + 148, y);
    ctx.font = "500 13px 'IBM Plex Mono', ui-monospace, monospace";
    y += 36;
    ctx.strokeStyle = "rgba(28,25,23,0.16)";
    ctx.beginPath();
    ctx.moveTo(x, y - 16);
    ctx.lineTo(paper.w - x, y - 16);
    ctx.stroke();
  }

  y += 8;
  ctx.fillStyle = "#5c564e";
  ctx.font = "500 13px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.fillText("COMMENTS", x, y);
  y += 28;
  ctx.fillStyle = "#1c1917";
  ctx.font = "400 16px 'IBM Plex Sans', sans-serif";
  wrap(
    ctx,
    input.comments || "Please see the attached pages.",
    x,
    y,
    paper.w - x * 2,
    24,
    8,
  );

  const noticeY = paper.h - 120;
  ctx.strokeStyle = "#1c1917";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, noticeY);
  ctx.lineTo(paper.w - x, noticeY);
  ctx.stroke();
  ctx.fillStyle = "#5c564e";
  ctx.font = "500 11px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.fillText("CONFIDENTIALITY NOTICE", x, noticeY + 22);
  ctx.font = "400 12px 'IBM Plex Sans', sans-serif";
  wrap(
    ctx,
    "This facsimile is intended only for the named recipient and may contain privileged information. If you received it in error, notify the sender and destroy the pages. To opt out of future facsimiles from this station, return a page marked STOP. Unauthorized review or distribution is prohibited.",
    x,
    noticeY + 44,
    paper.w - x * 2,
    16,
    4,
  );

  const blob = await canvasToBlob(canvas, "image/jpeg", 0.86);
  const thumb = await makeThumb(canvas);
  return { blob, thumb, width: paper.w, height: paper.h };
}

export async function renderReceiptPage(input: {
  paperSize: PaperSize;
  header: string;
  toName: string;
  toFax: string;
  pages: number;
  durationMs: number;
  baud: number;
  result: string;
  ecm: boolean;
  date: number;
  stationId: string;
}) {
  await waitForFonts();
  const paper = PAPER_PX[input.paperSize];
  const canvas = document.createElement("canvas");
  canvas.width = paper.w;
  canvas.height = Math.round(paper.h * 0.46);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable.");

  ctx.fillStyle = "#f3eee6";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#1c1917";
  ctx.font = "500 12px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.fillText(input.header, 28, 24);
  ctx.beginPath();
  ctx.moveTo(22, 36);
  ctx.lineTo(canvas.width - 22, 36);
  ctx.stroke();

  ctx.font = "600 13px 'IBM Plex Sans', sans-serif";
  ctx.fillText("TRANSMISSION CONFIRMATION", 48, 68);
  ctx.font = "500 36px 'IBM Plex Sans', sans-serif";
  ctx.fillText(input.result, 48, 112);

  const dur = Math.round(input.durationMs / 1000);
  const mm = String(Math.floor(dur / 60)).padStart(2, "0");
  const ss = String(dur % 60).padStart(2, "0");
  const rows: [string, string][] = [
    ["DESTINATION", input.toName || displayNumber(input.toFax)],
    ["NUMBER", displayNumber(input.toFax)],
    ["PAGES", String(input.pages)],
    ["TIME", `${mm}:${ss}`],
    ["SPEED", `V.17  ${input.baud} bps`],
    ["ECM", input.ecm ? "ON" : "OFF"],
    ["STATION", input.stationId],
    ["RESULT", input.result],
  ];
  let y = 156;
  ctx.font = "500 13px 'IBM Plex Mono', ui-monospace, monospace";
  for (const [k, v] of rows) {
    ctx.fillStyle = "#5c564e";
    ctx.fillText(k, 48, y);
    ctx.fillStyle = "#1c1917";
    ctx.fillText(v, 240, y);
    y += 28;
  }

  const blob = await canvasToBlob(canvas, "image/jpeg", 0.86);
  const thumb = await makeThumb(canvas);
  return { blob, thumb, width: canvas.width, height: canvas.height };
}
