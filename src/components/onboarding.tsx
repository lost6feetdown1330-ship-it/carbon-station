import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatFaxNumber } from "@/lib/format";
import { provisionCarbonLine } from "@/lib/line";
import { useFaxStore } from "@/lib/store";

export function Onboarding() {
  const settings = useFaxStore((s) => s.settings);
  const updateSettings = useFaxStore((s) => s.updateSettings);
  const [stationId, setStationId] = useState(settings.stationId);
  const [headerName, setHeaderName] = useState(settings.headerName);
  const [ownNumber, setOwnNumber] = useState(settings.ownNumber);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (settings.ownNumber) setOwnNumber((n) => n || settings.ownNumber);
  }, [settings.ownNumber]);

  function goLive() {
    updateSettings({
      stationId: stationId.trim().toUpperCase() || "CARBON",
      headerName: headerName.trim() || "Carbon Station",
      ownNumber: ownNumber || provisionCarbonLine(),
      onboarded: true,
      acceptedTermsAt: Date.now(),
    });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg px-6 pt-16 pb-24">
      <p className="font-mono text-[10px] tracking-[0.3em] text-lcd">CARBON STATION</p>
      <h1 className="mt-4 max-w-[14ch] text-4xl font-medium tracking-tight">
        Your phone is the fax machine.
      </h1>
      <p className="mt-4 max-w-sm text-sm leading-relaxed text-fg-muted">
        Scan or import pages, dial a number, and send a Group 3 facsimile. After the handshake, share
        the pages off this device. Your station ID prints on every header.
      </p>

      <form
        className="mt-10 flex flex-1 flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!accepted) return;
          goLive();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="csid">Station ID (CSID)</Label>
          <Input
            id="csid"
            value={stationId}
            maxLength={20}
            onChange={(e) => setStationId(e.target.value.toUpperCase())}
            className="font-mono tracking-wide"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="header">Header name</Label>
          <Input id="header" value={headerName} onChange={(e) => setHeaderName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="own">Your Carbon line</Label>
          <Input
            id="own"
            inputMode="tel"
            value={formatFaxNumber(ownNumber)}
            onChange={(e) => setOwnNumber(e.target.value)}
            className="font-mono"
          />
          <p className="text-xs text-fg-subtle">Provisioned in the reserved 555-01xx range. Printed on every page you send.</p>
        </div>
        <label className="flex items-start gap-3 text-sm leading-relaxed text-fg-muted">
          <input
            type="checkbox"
            className="mt-1 size-4 shrink-0 accent-lcd"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
          />
          <span>
            I will only send facsimiles I have permission to send, and I agree to the{" "}
            <Link to="/legal/terms" className="text-fg underline decoration-border underline-offset-4">
              Terms
            </Link>{" "}
            and{" "}
            <Link to="/legal/privacy" className="text-fg underline decoration-border underline-offset-4">
              Privacy policy
            </Link>
            .
          </span>
        </label>
        <div className="mt-auto space-y-3 pt-6">
          <Button type="submit" variant="start" className="w-full" size="lg" disabled={!accepted}>
            Put the station online
          </Button>
        </div>
      </form>
    </div>
  );
}
