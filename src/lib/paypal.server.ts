import { env } from "@/lib/env.server";
import { LOAD_PACKS } from "@/lib/catalog";

function present(value: string | undefined) {
  if (!value) return false;
  const n = value.trim().toLowerCase();
  return n.length > 0 && n !== "unset" && n !== "pending";
}

export function paypalCredentials() {
  const clientId = env("PAYPAL_CLIENT_ID");
  const secret = env("PAYPAL_CLIENT_SECRET");
  if (!present(clientId) || !present(secret)) return null;
  const mode = (env("PAYPAL_ENV") || "live").trim().toLowerCase() === "sandbox" ? "sandbox" : "live";
  return {
    clientId: clientId!,
    secret: secret!,
    mode,
    base: mode === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com",
  };
}

export function publicOrigin() {
  return "https://carbon-station.vercel.app";
}

export function packForCents(cents: number) {
  return LOAD_PACKS.find((p) => p.cents === cents) ?? null;
}

async function accessToken() {
  const creds = paypalCredentials();
  if (!creds) throw new Error("PayPal drawer is not armed.");
  const res = await fetch(`${creds.base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${creds.clientId}:${creds.secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || "PayPal would not issue a session.");
  }
  return { token: json.access_token, base: creds.base };
}

export async function createPaypalOrder(cents: number) {
  const pack = packForCents(cents);
  if (!pack) throw new Error("Unknown load pack.");
  const { token, base } = await accessToken();
  const origin = publicOrigin();
  const value = (cents / 100).toFixed(2);
  const res = await fetch(`${base}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: pack.id,
          description: `Carbon station wallet · ${pack.name}`,
          amount: { currency_code: "USD", value },
        },
      ],
      application_context: {
        brand_name: "Carbon Station",
        landing_page: "NO_PREFERENCE",
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
        return_url: `${origin}/wallet?paypal=return`,
        cancel_url: `${origin}/wallet?paypal=cancel`,
      },
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    id?: string;
    links?: Array<{ href?: string; rel?: string }>;
    message?: string;
    details?: Array<{ description?: string }>;
  };
  if (!res.ok || !json.id) {
    const detail = json.details?.[0]?.description || json.message || `PayPal refused (${res.status})`;
    throw new Error(detail);
  }
  const approve =
    json.links?.find((l) => l.rel === "approve" || l.rel === "payer-action")?.href;
  if (!approve) throw new Error("PayPal did not return an approval link.");
  return { id: json.id, approve };
}

export async function capturePaypalOrder(orderId: string) {
  if (!/^[A-Z0-9-]+$/i.test(orderId) || orderId.length > 64) {
    throw new Error("Bad PayPal order.");
  }
  const { token, base } = await accessToken();
  const res = await fetch(`${base}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const json = (await res.json().catch(() => ({}))) as {
    id?: string;
    status?: string;
    purchase_units?: Array<{
      custom_id?: string;
      payments?: { captures?: Array<{ status?: string; amount?: { value?: string } }> };
    }>;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(json.message || `PayPal capture failed (${res.status})`);
  }
  const unit = json.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];
  const ok = json.status === "COMPLETED" || capture?.status === "COMPLETED";
  if (!ok) throw new Error("PayPal did not complete the capture.");
  const value = capture?.amount?.value;
  const cents = value ? Math.round(Number(value) * 100) : 0;
  const pack = packForCents(cents);
  if (!pack) throw new Error("Captured amount is not a station pack.");
  return { orderId: json.id || orderId, cents: pack.cents, label: `PayPal · ${pack.name}` };
}
