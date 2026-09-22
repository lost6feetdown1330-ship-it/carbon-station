import { createFileRoute } from "@tanstack/react-router";
import { createPaypalOrder, paypalCredentials } from "@/lib/paypal.server";

export const Route = createFileRoute("/api/paypal/order")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          if (!paypalCredentials()) {
            return Response.json({ error: "PayPal drawer is not armed." }, { status: 409 });
          }
          const body = (await request.json().catch(() => ({}))) as { cents?: number };
          const cents = Number(body.cents);
          const order = await createPaypalOrder(cents);
          return Response.json(order);
        } catch (err) {
          const message = err instanceof Error ? err.message : "PayPal failed.";
          return Response.json({ error: message }, { status: 502 });
        }
      },
    },
  },
});
