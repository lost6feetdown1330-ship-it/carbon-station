import { createServerFn } from "@tanstack/react-start";

export type EnvelopeState = "local" | "open" | "live";

export type DeployEnvelope = {
  state: EnvelopeState;
  space?: string;
  fromNumber?: string;
  missing: string[];
};

const SEALS = [
  "SIGNALWIRE_SPACE_URL",
  "SIGNALWIRE_PROJECT_ID",
  "SIGNALWIRE_API_TOKEN",
  "SIGNALWIRE_FROM_NUMBER",
] as const;

function isSet(value: string | undefined) {
  if (!value) return false;
  const n = value.trim().toLowerCase();
  return n.length > 0 && n !== "unset" && n !== "pending";
}

function spaceHost(raw: string) {
  try {
    const withProto = raw.includes("://") ? raw : `https://${raw}`;
    return new URL(withProto).hostname.replace(/\.signalwire\.com$/i, "") || raw;
  } catch {
    return raw.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  }
}

export const getDeployEnvelope = createServerFn({ method: "POST" }).handler(
  async (): Promise<DeployEnvelope> => {
    const { env } = await import("./env.server");
    const space = env("SIGNALWIRE_SPACE_URL");
    const project = env("SIGNALWIRE_PROJECT_ID");
    const token = env("SIGNALWIRE_API_TOKEN");
    const from = env("SIGNALWIRE_FROM_NUMBER");
    const values: Record<(typeof SEALS)[number], string | undefined> = {
      SIGNALWIRE_SPACE_URL: space,
      SIGNALWIRE_PROJECT_ID: project,
      SIGNALWIRE_API_TOKEN: token,
      SIGNALWIRE_FROM_NUMBER: from,
    };
    const missing = SEALS.filter((key) => !isSet(values[key]));
    const host = isSet(space) ? spaceHost(space!) : undefined;
    const fromNumber = isSet(from) ? from : undefined;
    if (missing.length === 0) return { state: "live", space: host, fromNumber, missing: [] };
    const published = Boolean(env("VERCEL"));
    if (published) return { state: "open", space: host, fromNumber, missing };
    return { state: "local", missing };
  },
);

export const getPayPalEnvelope = createServerFn({ method: "POST" }).handler(
  async (): Promise<DeployEnvelope> => {
    const { env } = await import("./env.server");
    const client = env("PAYPAL_CLIENT_ID");
    const secret = env("PAYPAL_CLIENT_SECRET");
    const missing = [
      ...(!isSet(client) ? ["PAYPAL_CLIENT_ID"] : []),
      ...(!isSet(secret) ? ["PAYPAL_CLIENT_SECRET"] : []),
    ];
    const published = Boolean(env("VERCEL"));
    if (missing.length === 0) return { state: "live", missing: [] };
    if (published) return { state: "open", missing };
    return { state: "local", missing };
  },
);
