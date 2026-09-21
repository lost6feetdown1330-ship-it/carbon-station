import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FileText, PhoneCall, Settings, Store, Wallet } from "lucide-react";
import { BuySheet } from "@/components/paywall";
import { FREE_SPEED_DIAL, owns } from "@/lib/catalog";
import { DialPad } from "@/components/dial-pad";
import { LcdPanel } from "@/components/lcd-panel";
import { Onboarding } from "@/components/onboarding";
import { Button } from "@/components/ui/button";
import { digitsOnly, displayNumber, formatFaxNumber, isDialable } from "@/lib/format";
import { useFaxStore } from "@/lib/store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const navigate = useNavigate();
  const settings = useFaxStore((s) => s.settings);
  const contacts = useFaxStore((s) => s.contacts);
  const lastDialed = useFaxStore((s) => s.lastDialed);
  const draft = useFaxStore((s) => s.draft);
  const setLastDialed = useFaxStore((s) => s.setLastDialed);
  const setDraft = useFaxStore((s) => s.setDraft);
  const entitlements = useFaxStore((s) => s.entitlements);
  const [number, setNumber] = useState("");
  const [buy, setBuy] = useState(false);
  const directoryPro = owns(entitlements, "directory");

  const speed = useMemo(
    () =>
      contacts
        .filter((c) => c.speedDial)
        .sort((a, b) => (a.speedDial ?? 9) - (b.speedDial ?? 9))
        .slice(0, 8),
    [contacts],
  );

  if (!settings.onboarded) return <Onboarding />;

  function pushDigit(d: string) {
    setNumber((n) => formatFaxNumber(n + d));
  }

  function goCompose(to: string, name = "") {
    setLastDialed(to);
    setDraft({ toNumber: to, toName: name });
    void navigate({ to: "/compose" });
  }

  const ready = isDialable(number);

  return (
    <main className="flex flex-1 flex-col px-5 pt-6 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-[0.3em] text-lcd">CARBON</p>
          <h1 className="mt-1 text-xl font-medium tracking-tight">Station</h1>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" aria-label="Wallet" onClick={() => void navigate({ to: "/wallet" })}>
            <Wallet className="size-5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Store" onClick={() => void navigate({ to: "/shop" })}>
            <Store className="size-5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Settings" onClick={() => void navigate({ to: "/settings" })}>
            <Settings className="size-5" />
          </Button>
        </div>
      </div>

      <LcdPanel
        className="mt-4"
        line1={number ? formatFaxNumber(number) : displayNumber(settings.ownNumber)}
        line2={number ? "DIAL NUMBER" : `${settings.stationId}  ·  READY`}
        status="ready"
      />

      {draft.pages.length > 0 && (
        <button
          type="button"
          onClick={() => void navigate({ to: "/compose" })}
          className="mt-3 flex items-center justify-between rounded-lg border border-border bg-bg-elevated px-3 py-2.5 text-left text-sm"
        >
          <span className="flex items-center gap-2 text-fg-muted">
            <FileText className="size-4" />
            Resume unsent fax
          </span>
          <span className="font-mono text-xs text-lcd">{draft.pages.length} pg</span>
        </button>
      )}

      <div className="mt-5">
        <p className="mb-2 font-mono text-[10px] tracking-[0.22em] text-fg-subtle">SPEED DIAL</p>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => {
            const slot = speed.find((c) => c.speedDial === i + 1);
            const gated = i + 1 > FREE_SPEED_DIAL && !directoryPro;
            return (
              <button
                key={i}
                type="button"
                disabled={!slot && !gated}
                onClick={() => {
                  if (gated && !slot) {
                    setBuy(true);
                    return;
                  }
                  if (slot) goCompose(slot.fax, slot.company || slot.name);
                }}
                className="keycap flex h-14 flex-col items-center justify-center rounded-lg border border-border bg-bg-elevated px-1 text-center disabled:opacity-35"
              >
                <span className="font-mono text-[10px] text-lcd">{i + 1}</span>
                <span className="mt-0.5 w-full truncate text-[10px] text-fg-muted">
                  {slot ? slot.company.split(" ")[0] : gated ? "PRO" : "—"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5">
        <DialPad
          onDigit={pushDigit}
          onBackspace={() => setNumber((n) => formatFaxNumber(digitsOnly(n).slice(0, -1)))}
          onLongZero={() => setNumber((n) => (n.startsWith("+") ? n : `+${n}`))}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          disabled={!lastDialed}
          onClick={() => lastDialed && goCompose(lastDialed)}
        >
          <PhoneCall />
          Redial
        </Button>
        <Button variant="outline" onClick={() => void navigate({ to: "/compose" })}>
          <FileText />
          Load
        </Button>
        <Button variant="start" disabled={!ready} onClick={() => goCompose(number)}>
          Start
        </Button>
      </div>
      <BuySheet sku="directory" open={buy} onOpenChange={setBuy} />
    </main>
  );
}
