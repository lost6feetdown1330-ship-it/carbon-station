import { createFileRoute } from "@tanstack/react-router";
import { putMedia } from "@/lib/media-store.server";
import { lineCredentials, publicOrigin, sendCarrierFax } from "@/lib/signalwire.server";

const hits = new Map<string, number[]>();
const HOUR = 60 * 60 * 1000;
const MAX_PER_HOUR = 8;

function clientIp(request: Request) {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") || "unknown";
}

function allow(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < HOUR);
  if (recent.length >= MAX_PER_HOUR) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

export const Route = createFileRoute("/api/line/send")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          if (!lineCredentials()) {
            return Response.json({ error: "PSTN envelope is not armed." }, { status: 409 });
          }
          if (!allow(clientIp(request))) {
            return Response.json({ error: "Line is busy. Try again later." }, { status: 429 });
          }
          const form = await request.formData();
          const file = form.get("file");
          const to = String(form.get("to") || "");
          const quality = String(form.get("quality") || "fine");
          if (!(file instanceof Blob) || file.size < 20) {
            return Response.json({ error: "No pages on the line." }, { status: 400 });
          }
          if (file.size > 4_500_000) {
            return Response.json({ error: "Document is too large for the line." }, { status: 413 });
          }
          const bytes = new Uint8Array(await file.arrayBuffer());
          const token = putMedia(bytes);
          const origin = publicOrigin();
          const mediaUrl = `${origin}/api/line/media/${token}`;
          const sent = await sendCarrierFax({
            to,
            mediaUrl,
            quality,
            statusCallback: `${origin}/api/line/status`,
          });
          return Response.json(sent);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Carrier failed.";
          return Response.json({ error: message }, { status: 502 });
        }
      },
    },
  },
});
