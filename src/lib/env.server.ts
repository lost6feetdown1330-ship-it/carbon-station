export function env(key: string): string | undefined {
  let v: string | undefined;
  switch (key) {
    case "SIGNALWIRE_SPACE_URL":
      v = process.env.SIGNALWIRE_SPACE_URL;
      break;
    case "SIGNALWIRE_PROJECT_ID":
      v = process.env.SIGNALWIRE_PROJECT_ID;
      break;
    case "SIGNALWIRE_API_TOKEN":
      v = process.env.SIGNALWIRE_API_TOKEN;
      break;
    case "SIGNALWIRE_FROM_NUMBER":
      v = process.env.SIGNALWIRE_FROM_NUMBER;
      break;
    case "VERCEL":
      v = process.env.VERCEL;
      break;
    case "GROK_PROJECT_ID":
      v = process.env.GROK_PROJECT_ID;
      break;
    default:
      v = process.env[key];
  }
  const t = v?.trim();
  return t || undefined;
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
