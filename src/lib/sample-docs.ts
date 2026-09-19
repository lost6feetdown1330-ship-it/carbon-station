import { canvasToBlob, makeThumb, waitForFonts } from "@/lib/fax-image";
import { PAPER_PX } from "@/lib/types";

function letterhead(
  ctx: CanvasRenderingContext2D,
  w: number,
  firm: string,
  sub: string,
  rule = true,
) {
  ctx.fillStyle = "#1c1917";
  ctx.font = "600 22px 'IBM Plex Sans', sans-serif";
  ctx.fillText(firm, 56, 86);
  ctx.font = "400 13px 'IBM Plex Sans', sans-serif";
  ctx.fillStyle = "#5c564e";
  ctx.fillText(sub, 56, 108);
  if (rule) {
    ctx.strokeStyle = "#1c1917";
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(56, 124);
    ctx.lineTo(w - 56, 124);
    ctx.stroke();
  }
}

function header(ctx: CanvasRenderingContext2D, w: number, line: string) {
  ctx.fillStyle = "#1c1917";
  ctx.font = "500 12px 'IBM Plex Mono', ui-monospace, monospace";
  ctx.fillText(line, 24, 22);
  ctx.beginPath();
  ctx.moveTo(18, 34);
  ctx.lineTo(w - 18, 34);
  ctx.stroke();
}

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number,
) {
  const words = text.split(/\s+/);
  let line = "";
  let used = 0;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxW && line) {
      ctx.fillText(line, x, y + used * lineH);
      line = word;
      used += 1;
    } else line = next;
  }
  if (line) {
    ctx.fillText(line, x, y + used * lineH);
    used += 1;
  }
  return used;
}

async function paint(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  await waitForFonts();
  const { w, h } = PAPER_PX.letter;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable.");
  ctx.fillStyle = "#f3eee6";
  ctx.fillRect(0, 0, w, h);
  draw(ctx, w, h);
  const blob = await canvasToBlob(canvas, "image/jpeg", 0.84);
  const thumb = await makeThumb(canvas);
  return { blob, thumb };
}

export async function sampleTitleCover() {
  return paint((ctx, w) => {
    header(ctx, w, "Sep 17 2026  09:14  WESTFIELD TITLE       503-555-0114  p.1/1");
    letterhead(ctx, w, "WESTFIELD TITLE CO.", "Escrow  ·  Hillsboro, Oregon  ·  Fax (503) 555-0114");
    ctx.fillStyle = "#1c1917";
    ctx.font = "600 28px 'IBM Plex Sans', sans-serif";
    ctx.fillText("Closing Package", 56, 176);
    ctx.font = "400 16px 'IBM Plex Sans', sans-serif";
    const body = [
      "To: Carbon Station",
      "Re:  2140 SE Oak Street — escrow no. 26-4418",
      "",
      "Please find the signed settlement statement and wiring",
      "instructions for tomorrow’s 10:00 a.m. recording.",
      "",
      "Funds must be received as collected funds prior to recording.",
      "Do not accept any revised wiring instructions by email.",
      "Call the number on this letterhead to verify.",
      "",
      "Pages to follow under separate cover if requested.",
      "",
      "Regards,",
      "M. Ellison  ·  Escrow officer",
    ];
    let y = 220;
    for (const line of body) {
      ctx.fillText(line, 56, y);
      y += 28;
    }
    ctx.font = "500 12px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.fillStyle = "#5c564e";
    ctx.fillText("CONFIDENTIAL — REAL ESTATE TRANSACTION FILE", 56, 980);
  });
}

export async function sampleMedical() {
  return paint((ctx, w) => {
    header(ctx, w, "Sep 16 2026  16:02  RIVERBEND MEDICAL     503-555-0182  p.1/1");
    letterhead(ctx, w, "RIVERBEND MEDICAL GROUP", "Referrals  ·  Fax (503) 555-0182  ·  NPI 1841293771");
    ctx.fillStyle = "#1c1917";
    ctx.font = "600 22px 'IBM Plex Sans', sans-serif";
    ctx.fillText("Consultation request", 56, 172);
    ctx.font = "500 13px 'IBM Plex Mono', ui-monospace, monospace";
    const rows = [
      ["PATIENT", "A. SHUTE  DOB 04/12/1988"],
      ["MRN", "RB-209441"],
      ["REQUEST", "Cardiology consult — new"],
      ["REASON", "Abnormal ECG, exertional dyspnea"],
      ["PROVIDER", "J. Patel, MD"],
      ["NEED BY", "14 days"],
    ];
    let y = 220;
    for (const [k, v] of rows) {
      ctx.fillStyle = "#5c564e";
      ctx.fillText(k, 56, y);
      ctx.fillStyle = "#1c1917";
      ctx.font = "500 16px 'IBM Plex Sans', sans-serif";
      ctx.fillText(v, 220, y);
      ctx.font = "500 13px 'IBM Plex Mono', ui-monospace, monospace";
      y += 40;
      ctx.strokeStyle = "rgba(28,25,23,0.14)";
      ctx.beginPath();
      ctx.moveTo(56, y - 18);
      ctx.lineTo(w - 56, y - 18);
      ctx.stroke();
    }
    ctx.font = "400 15px 'IBM Plex Sans', sans-serif";
    ctx.fillStyle = "#1c1917";
    wrap(
      ctx,
      "Please schedule and fax the appointment confirmation to the originating office. Records attached as permitted under the referral order. Do not include this cover with the patient copy.",
      56,
      y + 12,
      w - 112,
      22,
    );
    ctx.font = "500 12px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.fillStyle = "#5c564e";
    ctx.fillText("PROTECTED HEALTH INFORMATION — HANDLE PER HIPAA", 56, 980);
  });
}

export async function sampleLegal() {
  return paint((ctx, w) => {
    header(ctx, w, "Sep 15 2026  11:41  HALE & ORTIZ LLP      212-555-0190  p.1/1");
    letterhead(ctx, w, "HALE & ORTIZ LLP", "Litigation  ·  One Liberty Plaza  ·  Fax (212) 555-0190");
    ctx.fillStyle = "#1c1917";
    ctx.font = "600 20px 'IBM Plex Sans', sans-serif";
    ctx.fillText("Notice of hearing", 56, 172);
    ctx.font = "400 16px 'IBM Plex Sans', sans-serif";
    let y = 214;
    const paras = [
      "Counsel:",
      "Please take notice that the motion previously served will be heard on Tuesday, October 6, 2026 at 9:30 a.m. before the Honorable L. Ward, Courtroom 14B.",
      "Kindly confirm receipt of this facsimile by return fax. Courtesy copies will not be filed unless the court so directs.",
      "Very truly yours,",
      "Hale & Ortiz LLP",
    ];
    for (const p of paras) {
      const used = wrap(ctx, p, 56, y, w - 112, 24);
      y += used * 24 + 16;
    }
    ctx.font = "500 13px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.fillText("cc:  File", 56, y + 12);
    ctx.font = "500 12px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.fillStyle = "#5c564e";
    ctx.fillText("ATTORNEY-CLIENT / WORK PRODUCT — FOR ADDRESSEE ONLY", 56, 980);
  });
}

export async function sampleOutgoingLetter(fromName: string, stationId: string, headerLine: string) {
  return paint((ctx, w) => {
    header(ctx, w, headerLine);
    letterhead(ctx, w, fromName.toUpperCase(), `${stationId}  ·  Carbon station`);
    ctx.fillStyle = "#1c1917";
    ctx.font = "400 16px 'IBM Plex Sans', sans-serif";
    let y = 176;
    const paras = [
      "To whom it may concern:",
      "This page was rasterized on a Carbon station and is ready for Group 3 facsimile. Replace it with a live capture from the camera or photo library when you send a real document.",
      "The header line carries station identification, date, and page number in the same format used by office machines on the public switched telephone network.",
      "Sincerely,",
      fromName,
    ];
    for (const p of paras) {
      const used = wrap(ctx, p, 56, y, w - 112, 24);
      y += used * 24 + 18;
    }
  });
}
