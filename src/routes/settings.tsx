import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { type DeployEnvelope, getDeployEnvelope } from "@/lib/envelope";
import { formatPrice, owns } from "@/lib/catalog";
import { BuySheet } from "@/components/paywall";
import type { Sku } from "@/lib/catalog";
import { displayNumber, formatFaxNumber } from "@/lib/format";
import { setSpeakerMuted } from "@/lib/tones";
import { outgoing, useFaxStore } from "@/lib/store";
import type { FaxResolution, PaperSize } from "@/lib/types";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

const SEAL_LABEL: Record<string, string> = {
  SIGNALWIRE_SPACE_URL: "Space",
  SIGNALWIRE_PROJECT_ID: "Project",
  SIGNALWIRE_API_TOKEN: "Token",
  SIGNALWIRE_FROM_NUMBER: "DID",
};

function SettingsPage() {
  const navigate = useNavigate();
  const settings = useFaxStore((s) => s.settings);
  const updateSettings = useFaxStore((s) => s.updateSettings);
  const faxes = useFaxStore((s) => s.faxes);
  const sent = outgoing(faxes);
  const pagesOut = sent.reduce((n, f) => n + (f.pages?.length ?? 0), 0);
  const [envelope, setEnvelope] = useState<DeployEnvelope | null>(null);
  const entitlements = useFaxStore((s) => s.entitlements);
  const walletCents = useFaxStore((s) => s.walletCents);
  const [paySku, setPaySku] = useState<Sku | null>(null);

  useEffect(() => {
    void getDeployEnvelope()
      .then(setEnvelope)
      .catch(() => setEnvelope({ state: "local", missing: [] }));
  }, []);

  return (
    <main className="pb-10">
      <header className="flex items-center gap-2 px-3 pt-4">
        <Button variant="ghost" size="icon" onClick={() => void navigate({ to: "/" })} aria-label="Back">
          <ChevronLeft />
        </Button>
        <div>
          <p className="font-mono text-[10px] tracking-[0.28em] text-fg-subtle">STATION</p>
          <h1 className="text-lg font-medium">Settings</h1>
        </div>
      </header>

      <section className="mt-6 space-y-6 px-5">
        <div className="rounded-xl border border-border bg-bg-elevated p-4">
          <p className="font-mono text-[10px] tracking-[0.22em] text-lcd">YOUR LINE</p>
          <p className="mt-2 font-mono text-xl tracking-wide text-fg">{displayNumber(settings.ownNumber)}</p>
          <p className="mt-1 text-xs text-fg-subtle">
            {sent.length} session{sent.length === 1 ? "" : "s"} · {pagesOut} page{pagesOut === 1 ? "" : "s"} out
          </p>
        </div>

        <EnvelopeCard envelope={envelope} />

        <button
          type="button"
          onClick={() => void navigate({ to: "/wallet" })}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-bg-elevated px-4 py-3 text-left"
        >
          <div>
            <p className="font-mono text-[10px] tracking-[0.22em] text-lcd">WALLET</p>
            <p className="mt-1 text-sm">Station drawer</p>
          </div>
          <span className="font-mono text-sm text-fg">{formatPrice(walletCents)}</span>
        </button>

        <button
          type="button"
          onClick={() => void navigate({ to: "/shop" })}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-bg-elevated px-4 py-3 text-left"
        >
          <div>
            <p className="font-mono text-[10px] tracking-[0.22em] text-lcd">STATION STORE</p>
            <p className="mt-1 text-sm">Sending is free. Buy the rest of the desk.</p>
          </div>
          <span className="font-mono text-[11px] text-fg-subtle">OPEN</span>
        </button>

        <div className="space-y-2">
          <Label htmlFor="csid">Station ID (CSID)</Label>
          <Input
            id="csid"
            value={settings.stationId}
            maxLength={20}
            className="font-mono tracking-wide"
            onChange={(e) => updateSettings({ stationId: e.target.value.toUpperCase() })}
          />
          <p className="text-xs text-fg-subtle">Printed on the header of every page you send.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="header">Header name</Label>
          <Input
            id="header"
            value={settings.headerName}
            onChange={(e) => updateSettings({ headerName: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="own">Your fax number</Label>
          <Input
            id="own"
            inputMode="tel"
            className="font-mono"
            value={formatFaxNumber(settings.ownNumber)}
            onChange={(e) => updateSettings({ ownNumber: e.target.value })}
          />
        </div>

        <fieldset>
          <Label>Paper</Label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(["letter", "a4", "legal"] as PaperSize[]).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => updateSettings({ paperSize: size })}
                className={`rounded-lg border px-2 py-2 text-xs uppercase ${settings.paperSize === size ? "border-lcd text-lcd" : "border-border text-fg-muted"}`}
              >
                {size}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <Label>Default resolution</Label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(["standard", "fine", "superfine"] as FaxResolution[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  if (r === "superfine" && !owns(entitlements, "photolab")) {
                    setPaySku("photolab");
                    return;
                  }
                  updateSettings({ resolution: r });
                }}
                className={`rounded-lg border px-2 py-2 text-xs capitalize ${settings.resolution === r ? "border-lcd text-lcd" : "border-border text-fg-muted"}`}
              >
                {r === "superfine" && !owns(entitlements, "photolab") ? "superfine · $1.99" : r}
              </button>
            ))}
          </div>
        </fieldset>

        <Toggle
          title="Error correction (ECM)"
          body="Retransmit damaged scan lines during handshake."
          checked={settings.ecm}
          onChange={(v) => updateSettings({ ecm: v })}
        />
        <Toggle
          title="Speaker"
          body="Play CNG, CED, and DTMF through the handset speaker."
          checked={settings.speaker}
          onChange={(v) => {
            updateSettings({ speaker: v });
            setSpeakerMuted(!v);
          }}
        />
        <Toggle
          title="Cover sheet by default"
          body="Include a transmittal page unless you turn it off."
          checked={settings.defaultCover}
          onChange={(v) => updateSettings({ defaultCover: v })}
        />
        <Toggle
          title="Confirmation page"
          body="Keep a T.30 result slip with baud, pages, and time."
          checked={settings.confirmationPage}
          onChange={(v) => updateSettings({ confirmationPage: v })}
        />

        {owns(entitlements, "studio") ? (
          <>
            <fieldset>
              <Label>LCD phosphor</Label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(["green", "amber", "ice"] as const).map((lcd) => (
                  <button
                    key={lcd}
                    type="button"
                    onClick={() => updateSettings({ lcd })}
                    className={`rounded-lg border px-2 py-2 text-xs capitalize ${(settings.lcd ?? "green") === lcd ? "border-lcd text-lcd" : "border-border text-fg-muted"}`}
                  >
                    {lcd}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <Label>Paper stock</Label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(["cream", "white", "greenbar"] as const).map((paperStock) => (
                  <button
                    key={paperStock}
                    type="button"
                    onClick={() => updateSettings({ paperStock })}
                    className={`rounded-lg border px-2 py-2 text-xs capitalize ${(settings.paperStock ?? "cream") === paperStock ? "border-lcd text-lcd" : "border-border text-fg-muted"}`}
                  >
                    {paperStock}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setPaySku("studio")}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-bg-elevated px-4 py-3 text-left"
          >
            <div>
              <p className="text-sm font-medium">Studio</p>
              <p className="text-xs text-fg-muted">Amber and ice LCDs, white stock, greenbar.</p>
            </div>
            <span className="font-mono text-[11px] text-lcd">$2.99</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => !owns(entitlements, "watchdog") && setPaySku("watchdog")}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-bg-elevated px-4 py-3 text-left"
        >
          <div>
            <p className="text-sm font-medium">Watchdog</p>
            <p className="text-xs text-fg-muted">
              {owns(entitlements, "watchdog")
                ? "On. Busy and no-answer redial three times."
                : "Auto-redial busy and no-answer on the carrier."}
            </p>
          </div>
          <span className="font-mono text-[11px] text-lcd">
            {owns(entitlements, "watchdog") ? "ON" : "$1.99"}
          </span>
        </button>

        <div className="rounded-xl border border-border bg-bg-elevated p-4">
          <p className="font-mono text-[10px] tracking-[0.22em] text-lcd">HOW THE LINE WORKS</p>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            {envelope?.state === "live"
              ? "The PSTN envelope is armed. After RESULT OK, Carbon hands the pages to SignalWire for T.38 delivery and files a confirmation on this device."
              : "This station is live on the device. After RESULT OK, Carbon files the facsimile PDF off the machine — Share when the phone allows it, otherwise the pages download. The PSTN envelope on the published station is open and waiting for four seals."}
          </p>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <Link to="/legal/privacy" className="rounded-xl border border-border px-4 py-3 text-fg-muted hover:bg-bg-subtle">
            Privacy policy
          </Link>
          <Link to="/legal/terms" className="rounded-xl border border-border px-4 py-3 text-fg-muted hover:bg-bg-subtle">
            Terms of use
          </Link>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            updateSettings({ onboarded: false });
            toast.success("Station setup will run again.");
            void navigate({ to: "/" });
          }}
        >
          Run setup again
        </Button>
        <BuySheet sku={paySku} open={Boolean(paySku)} onOpenChange={(v) => !v && setPaySku(null)} />
      </section>
    </main>
  );
}

function EnvelopeCard({ envelope }: { envelope: DeployEnvelope | null }) {
  const state = envelope?.state ?? "local";
  const title = state === "live" ? "ARMED" : state === "open" ? "OPEN" : "LOCAL";
  const body =
    state === "live"
      ? `PSTN line live${envelope?.fromNumber ? ` · ${displayNumber(envelope.fromNumber)}` : ""}${envelope?.space ? ` · ${envelope.space}` : ""}.`
      : state === "open"
        ? `Waiting on ${envelope!.missing.map((k) => SEAL_LABEL[k] ?? k).join(", ")}. Replace UNSET on the published station.`
        : "Device line only. The four SignalWire seals sit on the published station — Space, Project, Token, DID.";

  return (
    <div className="rounded-xl border border-border bg-bg-elevated p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] tracking-[0.22em] text-lcd">DEPLOY ENVELOPE</p>
        <span className={`font-mono text-[10px] tracking-[0.22em] ${state === "live" ? "text-lcd" : "text-fg-subtle"}`}>
          {title}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-fg-muted">{body}</p>
    </div>
  );
}

function Toggle({
  title,
  body,
  checked,
  onChange,
}: {
  title: string;
  body: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-bg-elevated px-4 py-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-fg-muted">{body}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
