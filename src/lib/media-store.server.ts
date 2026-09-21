import { mkdirSync, readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

type Slot = { bytes: Uint8Array; expires: number };

const memory = new Map<string, Slot>();
const dir = join(tmpdir(), "carbon-fax-media");
const TTL_MS = 15 * 60 * 1000;

function ensureDir() {
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    /* already there */
  }
}

function pathFor(token: string) {
  return join(dir, `${token}.pdf`);
}

function prune() {
  const now = Date.now();
  for (const [token, slot] of memory) {
    if (slot.expires < now) {
      memory.delete(token);
      try {
        unlinkSync(pathFor(token));
      } catch {
        /* gone */
      }
    }
  }
}

export function putMedia(bytes: Uint8Array) {
  prune();
  const token = randomBytes(24).toString("hex");
  const expires = Date.now() + TTL_MS;
  memory.set(token, { bytes, expires });
  ensureDir();
  try {
    writeFileSync(pathFor(token), bytes);
  } catch {
    /* memory still holds it on this instance */
  }
  return token;
}

export function getMedia(token: string): Uint8Array | undefined {
  if (!/^[a-f0-9]{48}$/.test(token)) return undefined;
  prune();
  const hit = memory.get(token);
  if (hit && hit.expires > Date.now()) return hit.bytes;
  const file = pathFor(token);
  if (!existsSync(file)) return undefined;
  try {
    const buf = readFileSync(file);
    const bytes = new Uint8Array(buf);
    memory.set(token, { bytes, expires: Date.now() + TTL_MS });
    return bytes;
  } catch {
    return undefined;
  }
}
