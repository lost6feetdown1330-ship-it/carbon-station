import { env } from "@/lib/env.server";
import { toE164 } from "@/lib/format";

export type CarrierStatus =
  | "queued"
  | "processing"
  | "sending"
  | "delivered"
  | "receiving"
  | "received"
  | "no-answer"
  | "busy"
  | "failed"
  | "canceled";

export type CarrierSnap = {
  sid: string;
  status: CarrierStatus;
  to: string;
  from: string;
  numPages?: number;
  error?: string;
};

function present(value: string | undefined) {
  if (!value) return false;
  const n = value.trim().toLowerCase();
  return n.length > 0 && n !== "unset" && n !== "pending";
}

export function lineCredentials() {
  const space = env("SIGNALWIRE_SPACE_URL");
  const project = env("SIGNALWIRE_PROJECT_ID");
  const token = env("SIGNALWIRE_API_TOKEN");
  const from = env("SIGNALWIRE_FROM_NUMBER");
  if (!present(space) || !present(project) || !present(token) || !present(from)) return null;
  const withProto = space!.includes("://") ? space! : `https://${space}`;
  return {
    space: withProto.replace(/\/$/, ""),
    project: project!,
    token: token!,
    from: toE164(from!),
  };
}

export function publicOrigin() {
  return "https://carbon-station.vercel.app";
}

function authHeader(project: string, token: string) {
  return `Basic ${Buffer.from(`${project}:${token}`).toString("base64")}`;
}

function qualityFor(resolution: string) {
  if (resolution === "superfine") return "superfine";
  if (resolution === "fine") return "fine";
  return "standard";
}

export async function sendCarrierFax(opts: {
  to: string;
  mediaUrl: string;
  quality: string;
  statusCallback?: string;
}) {
  const creds = lineCredentials();
  if (!creds) throw new Error("PSTN envelope is not armed.");
  const url = `${creds.space}/api/laml/2010-04-01/Accounts/${creds.project}/Faxes`;
  const body = new URLSearchParams();
  body.set("To", toE164(opts.to));
  body.set("From", creds.from);
  body.set("MediaUrl", opts.mediaUrl);
  body.set("Quality", qualityFor(opts.quality));
  body.set("StoreMedia", "false");
  if (opts.statusCallback) body.set("StatusCallback", opts.statusCallback);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader(creds.project, creds.token),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      (typeof json.message === "string" && json.message) ||
      (typeof json.error === "string" && json.error) ||
      `Carrier refused (${res.status})`;
    throw new Error(msg);
  }
  const sid = String(json.sid || json.Sid || "");
  if (!sid) throw new Error("Carrier did not return a session id.");
  return { sid, from: creds.from, status: String(json.status || "queued") as CarrierStatus };
}

export async function fetchCarrierFax(sid: string): Promise<CarrierSnap> {
  const creds = lineCredentials();
  if (!creds) throw new Error("PSTN envelope is not armed.");
  const url = `${creds.space}/api/laml/2010-04-01/Accounts/${creds.project}/Faxes/${encodeURIComponent(sid)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: authHeader(creds.project, creds.token),
      Accept: "application/json",
    },
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error((typeof json.message === "string" && json.message) || `Carrier lookup failed (${res.status})`);
  }
  const pages = json.num_pages ?? json.numPages;
  return {
    sid: String(json.sid || sid),
    status: String(json.status || "queued") as CarrierStatus,
    to: String(json.to || ""),
    from: String(json.from || creds.from),
    numPages: typeof pages === "number" ? pages : pages ? Number(pages) : undefined,
    error: typeof json.error_message === "string" ? json.error_message : undefined,
  };
}

export function isTerminal(status: CarrierStatus) {
  return status === "delivered" || status === "no-answer" || status === "busy" || status === "failed" || status === "canceled";
}
