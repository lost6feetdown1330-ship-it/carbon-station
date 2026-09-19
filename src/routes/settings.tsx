import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { displayNumber, formatFaxNumber } from "@/lib/format";
import { setSpeakerMuted } from "@/lib/tones";
import { outgoing, useFaxStore } from "@/lib/store";
import type { FaxResolution, PaperSize } from "@/lib/types";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const navigate = useNavigate();
  const settings = useFaxStore((s) => s.settings);
  const updateSettings = useFaxStore((s) => s.updateSettings);
  const faxes = useFaxStore((s) => s.faxes);
  const sent = outgoing(faxes);
  const pagesOut = sent.reduce((n, f) => n + (f.pages?.length ?? 0), 0);

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
                onClick={() => updateSettings({ resolution: r })}
                className={`rounded-lg border px-2 py-2 text-xs capitalize ${settings.resolution === r ? "border-lcd text-lcd" : "border-border text-fg-muted"}`}
              >
                {r}
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

        <div className="rounded-xl border border-border bg-bg-elevated p-4">
          <p className="font-mono text-[10px] tracking-[0.22em] text-lcd">HOW THE LINE WORKS</p>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            This station is live. After RESULT OK, Carbon files the facsimile PDF off the machine — Share
            when the phone allows it, otherwise the pages download. Receive pulls inbound paper onto
            the line. Everything stays on this device until you dispatch it.
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
      </section>
    </main>
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
