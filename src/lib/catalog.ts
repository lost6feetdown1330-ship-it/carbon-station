export const SKUS = [
  "inbound",
  "broadcast",
  "press",
  "directory",
  "studio",
  "vault",
  "watchdog",
  "photolab",
  "certified",
  "bundle",
] as const;

export type Sku = (typeof SKUS)[number];

export type Product = {
  sku: Sku;
  name: string;
  kicker: string;
  blurb: string;
  cents: number;
  includes?: Sku[];
};

export const CATALOG: Product[] = [
  {
    sku: "bundle",
    name: "Station bundle",
    kicker: "BEST ON THE MACHINE",
    blurb: "Every paid desk: inbound, broadcast, press, directory, studio, vault, watchdog, photo lab, certified MCF.",
    cents: 1499,
    includes: ["inbound", "broadcast", "press", "directory", "studio", "vault", "watchdog", "photolab", "certified"],
  },
  {
    sku: "inbound",
    name: "Answer the line",
    kicker: "INBOUND",
    blurb: "Receive. Pull paper onto this station from the camera or a PDF — the desk fax that answers.",
    cents: 899,
  },
  {
    sku: "broadcast",
    name: "Broadcast",
    kicker: "FAN-OUT",
    blurb: "One send, extra destinations. The first number is always free.",
    cents: 499,
  },
  {
    sku: "press",
    name: "Letterhead press",
    kicker: "COVERS",
    blurb: "Legal, medical, realty, and invoice transmittal plates.",
    cents: 399,
  },
  {
    sku: "vault",
    name: "Vault",
    kicker: "ARCHIVE",
    blurb: "Search the trays by name, number, or subject. Keep the paper findable.",
    cents: 499,
  },
  {
    sku: "directory",
    name: "Directory Pro",
    kicker: "SPEED DIAL",
    blurb: "Unlimited stations and speed-dial slots 5–8. Four favorites stay free.",
    cents: 299,
  },
  {
    sku: "studio",
    name: "Studio",
    kicker: "LOOK",
    blurb: "Amber and ice LCDs, white stock, greenbar paper.",
    cents: 299,
  },
  {
    sku: "photolab",
    name: "Photo lab",
    kicker: "SCAN",
    blurb: "Photo dithering and superfine resolution on the feeder.",
    cents: 199,
  },
  {
    sku: "certified",
    name: "Certified MCF",
    kicker: "PROOF",
    blurb: "A hashed confirmation slip with a certified stamp on RESULT OK.",
    cents: 299,
  },
  {
    sku: "watchdog",
    name: "Watchdog",
    kicker: "RETRY",
    blurb: "Busy or no-answer: the station redials the carrier three times.",
    cents: 199,
  },
];

export const FREE_CONTACT_CAP = 8;
export const FREE_SPEED_DIAL = 4;

export function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function productBySku(sku: Sku) {
  return CATALOG.find((p) => p.sku === sku)!;
}

export function owns(entitlements: Partial<Record<Sku, boolean>> | undefined, sku: Sku) {
  if (!entitlements) return false;
  if (entitlements.bundle) return true;
  if (entitlements[sku]) return true;
  return false;
}
