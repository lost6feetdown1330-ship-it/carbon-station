import type { FaxJob } from "@/lib/types";

export type LineSendResult = { sid: string; from: string; status: string };
export type LineSnap = {
  sid: string;
  status: string;
  to: string;
  from: string;
  numPages?: number;
  error?: string;
};

export async function dispatchLine(job: FaxJob, pdf: Blob): Promise<LineSendResult> {
  const form = new FormData();
  form.append("file", pdf, "fax.pdf");
  form.append("to", job.toNumber);
  form.append("quality", job.resolution);
  const res = await fetch("/api/line/send", { method: "POST", body: form });
  const json = (await res.json().catch(() => ({}))) as { sid?: string; from?: string; status?: string; error?: string };
  if (!res.ok || !json.sid) throw new Error(json.error || `Line refused (${res.status})`);
  return { sid: json.sid, from: json.from || "", status: json.status || "queued" };
}

export async function pollLine(sid: string): Promise<LineSnap> {
  const res = await fetch(`/api/line/fax/${encodeURIComponent(sid)}`);
  const json = (await res.json().catch(() => ({}))) as LineSnap & { error?: string };
  if (!res.ok) throw new Error(json.error || `Line lookup failed (${res.status})`);
  return json;
}

export function carrierResult(status: string) {
  if (status === "delivered") return { ok: true, code: "OK", error: undefined };
  if (status === "busy") return { ok: false, code: "BUSY", error: "Remote busy" };
  if (status === "no-answer") return { ok: false, code: "NO ANSWER", error: "No answer" };
  if (status === "canceled") return { ok: false, code: "ABORT", error: "Transmission cancelled" };
  return { ok: false, code: "FAILED", error: "Carrier failed" };
}
