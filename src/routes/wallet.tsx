import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { LcdPanel } from "@/components/lcd-panel";
import { Button } from "@/components/ui/button";
import { LOAD_PACKS, formatPrice } from "@/lib/catalog";
import { displayNumber } from "@/lib/format";
import { useFaxStore } from "@/lib/store";

export const Route = createFileRoute("/wallet")({ component: WalletPage });

function WalletPage() {
  const navigate = useNavigate();
  const cents = useFaxStore((s) => s.walletCents);
  const ledger = useFaxStore((s) => s.ledger);
  const settings = useFaxStore((s) => s.settings);
  const loadWallet = useFaxStore((s) => s.loadWallet);

  return (
    <main className="pb-10">
      <header className="flex items-center gap-2 px-3 pt-4">
        <Button variant="ghost" size="icon" onClick={() => void navigate({ to: "/shop" })} aria-label="Back">
          <ChevronLeft />
        </Button>
        <div>
          <p className="font-mono text-[10px] tracking-[0.28em] text-lcd">CASH DRAWER</p>
          <h1 className="text-lg font-medium">Wallet</h1>
        </div>
      </header>

      <section className="mt-5 px-5">
        <LcdPanel
          line1={formatPrice(cents)}
          line2={`${settings.stationId}  ·  ${displayNumber(settings.ownNumber)}`}
          status={cents > 0 ? "ok" : "ready"}
        />
        <p className="mt-2 text-xs leading-relaxed text-fg-muted">
          Load the drawer, then pay for desk unlocks from this balance. Sending a facsimile never draws on it.
          No card is taken here — loads post to this station.
        </p>

        <p className="mt-6 mb-2 font-mono text-[10px] tracking-[0.22em] text-fg-subtle">LOAD</p>
        <div className="grid grid-cols-2 gap-2">
          {LOAD_PACKS.map((pack) => (
            <button
              key={pack.id}
              type="button"
              onClick={() => {
                loadWallet(pack.cents, `Load ${formatPrice(pack.cents)}`);
                toast.success(`${formatPrice(pack.cents)} on the drawer.`);
              }}
              className="rounded-xl border border-border bg-bg-elevated px-3 py-4 text-left"
            >
              <p className="font-mono text-lg text-fg">{formatPrice(pack.cents)}</p>
              <p className="mt-1 text-xs text-fg-muted">{pack.blurb}</p>
            </button>
          ))}
        </div>

        <p className="mt-8 mb-2 font-mono text-[10px] tracking-[0.22em] text-fg-subtle">LEDGER</p>
        {ledger.length === 0 ? (
          <p className="text-sm text-fg-muted">The drawer is empty. Load a pack to buy from the store.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {ledger.slice(0, 20).map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm">{row.label}</p>
                  <p className="font-mono text-[10px] text-fg-subtle">
                    {new Date(row.ts).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span className={`font-mono text-sm ${row.kind === "load" ? "text-lcd" : "text-fg"}`}>
                  {row.kind === "load" ? "+" : "−"}
                  {formatPrice(row.cents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
