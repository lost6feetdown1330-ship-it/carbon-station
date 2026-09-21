import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/line/status")({
  server: {
    handlers: {
      POST: async () => new Response("OK", { status: 200 }),
      GET: async () => new Response("OK", { status: 200 }),
    },
  },
});
