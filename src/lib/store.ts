import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createId } from "@/lib/utils";
import { deletePageBlob, savePageBlob } from "@/lib/idb";
import type { ComposeDraft, Contact, FaxJob, FaxPage, Purchase, StationSettings, WalletEntry } from "@/lib/types";
import { SKUS, type Sku, owns, productBySku } from "@/lib/catalog";
import { sampleLegal, sampleMedical, sampleTitleCover } from "@/lib/sample-docs";

const defaultSettings: StationSettings = {
  stationId: "CARBON",
  headerName: "Carbon Station",
  ownNumber: "",
  paperSize: "letter",
  resolution: "fine",
  ecm: true,
  speaker: true,
  defaultCover: true,
  confirmationPage: true,
  onboarded: false,
  seeded: false,
};

const defaultDraft = (settings: StationSettings): ComposeDraft => ({
  toNumber: "",
  toName: "",
  subject: "",
  comments: "",
  includeCover: settings.defaultCover,
  urgent: false,
  confidential: false,
  resolution: settings.resolution,
  ecm: settings.ecm,
  scanMode: "text",
  pages: [],
  consented: false,
});

interface FaxState {
  hydrated: boolean;
  settings: StationSettings;
  contacts: Contact[];
  faxes: FaxJob[];
  lastDialed: string;
  draft: ComposeDraft;
  entitlements: Partial<Record<Sku, boolean>>;
  purchases: Purchase[];
  walletCents: number;
  ledger: WalletEntry[];
  paypalCaptures: string[];
  markHydrated: () => void;
  updateSettings: (patch: Partial<StationSettings>) => void;
  setLastDialed: (n: string) => void;
  setDraft: (patch: Partial<ComposeDraft>) => void;
  resetDraft: () => void;
  addDraftPage: (page: FaxPage, blob: Blob) => Promise<void>;
  removeDraftPage: (id: string) => Promise<void>;
  addContact: (c: Omit<Contact, "id">) => string;
  updateContact: (id: string, patch: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  upsertFax: (job: FaxJob) => void;
  patchFax: (id: string, patch: Partial<FaxJob>) => void;
  deleteFax: (id: string) => Promise<void>;
  markRead: (id: string) => void;
  seedIfNeeded: () => Promise<void>;
  purchase: (sku: Sku) => boolean;
  loadWallet: (cents: number, label: string, orderId?: string) => boolean;
}

const seedContacts: Contact[] = [
  {
    id: "c-westfield",
    name: "M. Ellison",
    company: "Westfield Title Co.",
    fax: "15035550114",
    phone: "15035550110",
    favorite: true,
    notes: "Escrow — Hillsboro",
    speedDial: 1,
  },
  {
    id: "c-riverbend",
    name: "Referrals desk",
    company: "Riverbend Medical",
    fax: "15035550182",
    phone: "15035550180",
    favorite: true,
    notes: "HIPAA line",
    speedDial: 2,
  },
  {
    id: "c-hale",
    name: "Docketing",
    company: "Hale & Ortiz LLP",
    fax: "12125550190",
    phone: "12125550100",
    favorite: true,
    notes: "NY litigation",
    speedDial: 3,
  },
  {
    id: "c-oakridge",
    name: "Leasing office",
    company: "Oakridge Property",
    fax: "15035550140",
    phone: "15035550140",
    favorite: false,
    notes: "Applications",
    speedDial: 4,
  },
];

export const useFaxStore = create<FaxState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      settings: defaultSettings,
      contacts: [],
      faxes: [],
      lastDialed: "",
      draft: defaultDraft(defaultSettings),
      entitlements: {},
      purchases: [],
      walletCents: 0,
      ledger: [],
      paypalCaptures: [],
      markHydrated: () => set({ hydrated: true }),
      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
      setLastDialed: (n) => set({ lastDialed: n }),
      setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
      resetDraft: () => set((s) => ({ draft: defaultDraft(s.settings) })),
      addDraftPage: async (page, blob) => {
        await savePageBlob(page.id, blob);
        set((s) => ({ draft: { ...s.draft, pages: [...s.draft.pages, page] } }));
      },
      removeDraftPage: async (id) => {
        await deletePageBlob(id);
        set((s) => ({
          draft: { ...s.draft, pages: s.draft.pages.filter((p) => p.id !== id) },
        }));
      },
      addContact: (c) => {
        const id = createId();
        set((s) => ({ contacts: [...s.contacts, { ...c, id }] }));
        return id;
      },
      updateContact: (id, patch) =>
        set((s) => ({
          contacts: s.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      deleteContact: (id) =>
        set((s) => ({ contacts: s.contacts.filter((c) => c.id !== id) })),
      upsertFax: (job) =>
        set((s) => {
          const i = s.faxes.findIndex((f) => f.id === job.id);
          if (i === -1) return { faxes: [job, ...s.faxes] };
          const next = s.faxes.slice();
          next[i] = job;
          return { faxes: next };
        }),
      patchFax: (id, patch) =>
        set((s) => ({
          faxes: s.faxes.map((f) => (f.id === id ? { ...f, ...patch } : f)),
        })),
      deleteFax: async (id) => {
        const job = get().faxes.find((f) => f.id === id);
        if (job) {
          await Promise.all(job.pages.map((p) => deletePageBlob(p.id)));
        }
        set((s) => ({ faxes: s.faxes.filter((f) => f.id !== id) }));
      },
      markRead: (id) =>
        set((s) => ({
          faxes: s.faxes.map((f) => (f.id === id ? { ...f, unread: false } : f)),
        })),
      seedIfNeeded: async () => {
        const { faxes, contacts, settings } = get();
        if (contacts.length === 0) set({ contacts: seedContacts });
        if (settings.seeded) return;
        const hasIncoming = faxes.some((f) => f.direction === "in");
        if (hasIncoming) {
          set({ settings: { ...get().settings, seeded: true } });
          return;
        }

        const samples = await Promise.all([
          sampleTitleCover(),
          sampleMedical(),
          sampleLegal(),
        ]);
        const now = Date.now();
        const jobs: FaxJob[] = [
          {
            id: "in-westfield",
            direction: "in",
            status: "received",
            toNumber: "",
            toName: "Carbon Station",
            fromNumber: "15035550114",
            fromName: "Westfield Title Co.",
            subject: "Closing package — 2140 SE Oak Street",
            pages: [{ id: "pg-westfield", thumb: samples[0].thumb, kind: "document" }],
            cover: false,
            resolution: "fine",
            ecm: true,
            createdAt: now - 1000 * 60 * 60 * 26,
            completedAt: now - 1000 * 60 * 60 * 26,
            durationMs: 41000,
            baud: 14400,
            resultCode: "OK",
            unread: true,
          },
          {
            id: "in-riverbend",
            direction: "in",
            status: "received",
            toNumber: "",
            toName: "Carbon Station",
            fromNumber: "15035550182",
            fromName: "Riverbend Medical",
            subject: "Consultation request",
            pages: [{ id: "pg-riverbend", thumb: samples[1].thumb, kind: "document" }],
            cover: false,
            resolution: "fine",
            ecm: true,
            createdAt: now - 1000 * 60 * 60 * 46,
            completedAt: now - 1000 * 60 * 60 * 46,
            durationMs: 38000,
            baud: 14400,
            resultCode: "OK",
            unread: true,
          },
          {
            id: "in-hale",
            direction: "in",
            status: "received",
            toNumber: "",
            toName: "Carbon Station",
            fromNumber: "12125550190",
            fromName: "Hale & Ortiz LLP",
            subject: "Notice of hearing",
            pages: [{ id: "pg-hale", thumb: samples[2].thumb, kind: "document" }],
            cover: false,
            resolution: "fine",
            ecm: true,
            createdAt: now - 1000 * 60 * 60 * 80,
            completedAt: now - 1000 * 60 * 60 * 80,
            durationMs: 29000,
            baud: 9600,
            resultCode: "OK",
            unread: false,
          },
        ];
        await Promise.all([
          savePageBlob("pg-westfield", samples[0].blob),
          savePageBlob("pg-riverbend", samples[1].blob),
          savePageBlob("pg-hale", samples[2].blob),
        ]);
        set({
          faxes: [...jobs, ...get().faxes.filter((f) => f.direction !== "in" || !["in-westfield", "in-riverbend", "in-hale"].includes(f.id))],
          settings: { ...get().settings, seeded: true },
        });
      },
      purchase: (sku) => {
        const product = productBySku(sku);
        const state = get();
        if (owns(state.entitlements, sku)) return false;
        if (state.walletCents < product.cents) return false;
        set((s) => {
          const entitlements = { ...s.entitlements, [sku]: true };
          if (sku === "bundle") {
            for (const key of SKUS) entitlements[key] = true;
          }
          for (const extra of product.includes ?? []) entitlements[extra] = true;
          const row: Purchase = { id: createId(), sku, cents: product.cents, ts: Date.now() };
          const entry: WalletEntry = {
            id: createId(),
            kind: "spend",
            cents: product.cents,
            label: product.name,
            ts: Date.now(),
            sku,
          };
          return {
            entitlements,
            purchases: [row, ...s.purchases],
            walletCents: s.walletCents - product.cents,
            ledger: [entry, ...s.ledger],
          };
        });
        return true;
      },
      loadWallet: (cents, label, orderId) => {
        if (cents <= 0) return false;
        const state = get();
        if (orderId && state.paypalCaptures.includes(orderId)) return false;
        set((s) => {
          const entry: WalletEntry = {
            id: createId(),
            kind: "load",
            cents,
            label,
            ts: Date.now(),
          };
          return {
            walletCents: s.walletCents + cents,
            ledger: [entry, ...s.ledger],
            paypalCaptures: orderId ? [orderId, ...s.paypalCaptures] : s.paypalCaptures,
          };
        });
        return true;
      },
    }),
    {
      name: "carbon-station",
      skipHydration: true,
      partialize: (s) => ({
        settings: s.settings,
        contacts: s.contacts,
        faxes: s.faxes,
        lastDialed: s.lastDialed,
        draft: s.draft,
        entitlements: s.entitlements,
        purchases: s.purchases,
        walletCents: s.walletCents,
        ledger: s.ledger,
        paypalCaptures: s.paypalCaptures,
      }),
    },
  ),
);

export function unreadCount(faxes: FaxJob[]) {
  return (faxes ?? []).filter((f) => f.direction === "in" && f.unread).length;
}

export function incoming(faxes: FaxJob[]) {
  return (faxes ?? [])
    .filter((f) => f.direction === "in")
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function outgoing(faxes: FaxJob[]) {
  return (faxes ?? [])
    .filter((f) => f.direction === "out")
    .sort((a, b) => b.createdAt - a.createdAt);
}
