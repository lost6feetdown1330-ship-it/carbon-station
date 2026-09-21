import { createFileRoute } from "@tanstack/react-router";

function present(value: string | undefined) {
  if (!value) return false;
  const n = value.trim().toLowerCase();
  return n.length > 0 && n !== "unset" && n !== "pending";
}

export const Route = createFileRoute("/api/line/health")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          space: present(process.env.SIGNALWIRE_SPACE_URL),
          project: present(process.env.SIGNALWIRE_PROJECT_ID),
          token: present(process.env.SIGNALWIRE_API_TOKEN),
          from: present(process.env.SIGNALWIRE_FROM_NUMBER),
          vercel: present(process.env.VERCEL),
        }),
    },
  },
});
