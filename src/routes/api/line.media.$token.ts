import { createFileRoute } from "@tanstack/react-router";
import { getMedia } from "@/lib/media-store.server";

export const Route = createFileRoute("/api/line/media/$token")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const bytes = getMedia(params.token);
        if (!bytes) return new Response("Gone", { status: 404 });
        return new Response(Buffer.from(bytes), {
          headers: {
            "Content-Type": "application/pdf",
            "Cache-Control": "no-store",
            "Content-Disposition": "inline; filename=fax.pdf",
          },
        });
      },
    },
  },
});
