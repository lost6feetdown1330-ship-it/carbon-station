import nodeProcess from "node:process";

/**
 * Read server env at runtime. Static bindings keep the SignalWire seals
 * attached to the published function; node:process avoids build-time inlining
 * of the token (sensitive keys are runtime-only).
 */
const SIGNALWIRE_SPACE_URL = nodeProcess.env.SIGNALWIRE_SPACE_URL;
const SIGNALWIRE_PROJECT_ID = nodeProcess.env.SIGNALWIRE_PROJECT_ID;
const SIGNALWIRE_API_TOKEN = nodeProcess.env.SIGNALWIRE_API_TOKEN;
const SIGNALWIRE_FROM_NUMBER = nodeProcess.env.SIGNALWIRE_FROM_NUMBER;
const VERCEL = nodeProcess.env.VERCEL;
const GROK_PROJECT_ID = nodeProcess.env.GROK_PROJECT_ID;

const TABLE: Record<string, string | undefined> = {
  SIGNALWIRE_SPACE_URL,
  SIGNALWIRE_PROJECT_ID,
  SIGNALWIRE_API_TOKEN,
  SIGNALWIRE_FROM_NUMBER,
  VERCEL,
  GROK_PROJECT_ID,
};

export function env(key: string): string | undefined {
  const v = (TABLE[key] ?? nodeProcess.env[key])?.trim();
  return v || undefined;
}

/**
 * Workspace preview vs deployed app. The deployer writes GROK_PROJECT_ID on
 * every publish; the sandbox preview never has it. Single source of truth for
 * the split — gate audience, gate endpoints and connector-token semantics all
 * key off this predicate.
 */
export function isWorkspacePreview(): boolean {
  return !env("GROK_PROJECT_ID");
}
