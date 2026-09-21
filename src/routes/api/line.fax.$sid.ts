import { createFileRoute } from "@tanstack/react-router";
import { fetchCarrierFax } from "@/lib/signalwire.server";

export const Route = createFileRoute("/api/line/fax/$sid")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const snap = await fetchCarrierFax(params.sid);
          return Response.json(snap);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Carrier lookup failed.";
          return Response.json({ error: message }, { status: 502 });
        }
      },
    },
  },
});
