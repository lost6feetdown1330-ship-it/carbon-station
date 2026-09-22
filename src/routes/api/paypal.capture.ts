import { createFileRoute } from "@tanstack/react-router";
import { capturePaypalOrder, paypalCredentials } from "@/lib/paypal.server";

export const Route = createFileRoute("/api/paypal/capture")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          if (!paypalCredentials()) {
            return Response.json({ error: "PayPal drawer is not armed." }, { status: 409 });
          }
          const body = (await request.json().catch(() => ({}))) as { orderId?: string };
          const orderId = String(body.orderId || "");
          const captured = await capturePaypalOrder(orderId);
          return Response.json(captured);
        } catch (err) {
          const message = err instanceof Error ? err.message : "PayPal capture failed.";
          return Response.json({ error: message }, { status: 502 });
        }
      },
    },
  },
});
