import { getPayPalEnvelope } from "@/lib/envelope";

export async function startPaypalLoad(cents: number) {
  const envelope = await getPayPalEnvelope();
  if (envelope.state !== "live") {
    const err = new Error(
      envelope.state === "local"
        ? "PRACTICE"
        : "PayPal drawer is not armed on the published station.",
    );
    (err as Error & { code?: string }).code = envelope.state === "local" ? "PRACTICE" : "OPEN";
    throw err;
  }
  const res = await fetch("/api/paypal/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cents }),
  });
  const json = (await res.json().catch(() => ({}))) as { approve?: string; error?: string };
  if (!res.ok || !json.approve) throw new Error(json.error || "PayPal would not open a checkout.");
  window.location.assign(json.approve);
}

export async function capturePaypalReturn(orderId: string) {
  const res = await fetch("/api/paypal/capture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    cents?: number;
    label?: string;
    orderId?: string;
    error?: string;
  };
  if (!res.ok || !json.cents || !json.orderId) throw new Error(json.error || "PayPal capture failed.");
  return { cents: json.cents, label: json.label || "PayPal load", orderId: json.orderId };
}
