import { del, get, set } from "idb-keyval";

const memory = new Map<string, Blob>();

function keyFor(pageId: string) {
  return `carbon-page:${pageId}`;
}

export async function savePageBlob(pageId: string, blob: Blob) {
  memory.set(pageId, blob);
  try {
    await set(keyFor(pageId), blob);
  } catch {
    /* private mode / quota — memory still holds it this session */
  }
}

export async function loadPageBlob(pageId: string): Promise<Blob | undefined> {
  const cached = memory.get(pageId);
  if (cached) return cached;
  try {
    const blob = await get<Blob>(keyFor(pageId));
    if (blob) memory.set(pageId, blob);
    return blob;
  } catch {
    return undefined;
  }
}

export async function deletePageBlob(pageId: string) {
  memory.delete(pageId);
  try {
    await del(keyFor(pageId));
  } catch {
    /* ignore */
  }
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(",");
  const mime = /data:(.*?);/.exec(meta ?? "")?.[1] ?? "image/jpeg";
  const binary = atob(b64 ?? "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
