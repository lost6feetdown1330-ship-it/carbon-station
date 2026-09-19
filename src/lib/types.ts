export type PaperSize = "letter" | "a4" | "legal";
export type FaxResolution = "standard" | "fine" | "superfine";
export type FaxDirection = "in" | "out";
export type FaxStatus = "draft" | "queued" | "sending" | "sent" | "received" | "failed";
export type PageKind = "cover" | "document" | "receipt";
export type ScanMode = "text" | "photo";

export interface FaxPage {
  id: string;
  thumb: string;
  kind: PageKind;
}

export interface FaxJob {
  id: string;
  direction: FaxDirection;
  status: FaxStatus;
  toNumber: string;
  toName: string;
  fromNumber: string;
  fromName: string;
  subject: string;
  pages: FaxPage[];
  cover: boolean;
  resolution: FaxResolution;
  ecm: boolean;
  createdAt: number;
  completedAt?: number;
  durationMs?: number;
  baud?: number;
  resultCode?: string;
  unread?: boolean;
  error?: string;
  comments?: string;
  urgent?: boolean;
  confidential?: boolean;
}

export interface Contact {
  id: string;
  name: string;
  company: string;
  fax: string;
  phone: string;
  favorite: boolean;
  notes: string;
  speedDial?: number;
}

export interface StationSettings {
  stationId: string;
  headerName: string;
  ownNumber: string;
  paperSize: PaperSize;
  resolution: FaxResolution;
  ecm: boolean;
  speaker: boolean;
  defaultCover: boolean;
  confirmationPage: boolean;
  onboarded: boolean;
  seeded: boolean;
  acceptedTermsAt?: number;
}

export interface ComposeDraft {
  toNumber: string;
  toName: string;
  subject: string;
  comments: string;
  includeCover: boolean;
  urgent: boolean;
  confidential: boolean;
  resolution: FaxResolution;
  ecm: boolean;
  scanMode: ScanMode;
  pages: FaxPage[];
  consented: boolean;
}

export const PAPER_PX: Record<PaperSize, { w: number; h: number }> = {
  letter: { w: 816, h: 1056 },
  a4: { w: 794, h: 1123 },
  legal: { w: 816, h: 1344 },
};

export const RESOLUTION_LABEL: Record<FaxResolution, string> = {
  standard: "Standard 204×98",
  fine: "Fine 204×196",
  superfine: "Superfine 204×391",
};

export const BAUD_BY_RESOLUTION: Record<FaxResolution, number> = {
  standard: 9600,
  fine: 14400,
  superfine: 14400,
};
