import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { LcdPanel } from "@/components/lcd-panel";
import { Button } from "@/components/ui/button";
import { LOAD_PACKS, formatPrice } from "@/lib/catalog";
import { type DeployEnvelope, getPayPalEnvelope } from "@/lib/envelope";
import { displayNumber } from "@/lib/format";
import { capturePaypalReturn, startPaypalLoad } from "@/lib/paypal-client";
import { useFaxStore } from "@/lib/store";

export const Route = createFileRoute("/wallet")({ component: WalletPage });

function WalletPage() {
  const navigate = useNavigate();
  const cents = useFaxStore((s) => s.walletCents);
  const ledger = useFaxStore((s) => s.ledger);
  const settings = useFaxStore((s) => s.settings);
  const loadWallet = useFaxStore((s) => s.loadWallet);
  const [paypal, setPaypal] = useState<DeployEnvelope | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getPayPalEnvelope()
      .then(setPaypal)
      .catch(() => setPaypal({ state: "local", missing: [] }));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get("paypal");
    const token = params.get("token");
    if (flag === "cancel") {
      toast.error("PayPal load cancelled.");
      window.history.replaceState({}, "", "/wallet");
      return;
    }
    if (flag !== "return" || !token) return;
    let cancelled = false;
    void (async () => {
      try {
        const captured = await capturePaypalReturn(token);
        if (cancelled) return;
        const added = loadWallet(captured.cents, captured.label, captured.orderId);
        if (added) toast.success(`${formatPrice(captured.cents)} from PayPal on the drawer.`);
        else toast.message("That PayPal load was already on this station.");
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : "PayPal capture failed.");
      } finally {
        window.history.replaceState({}, "", "/wallet");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadWallet]);

  async function loadPack(packCents: number) {
    if (busy) return;
    setBusy(true);
    try {
      await startPaypalLoad(packCents);
    } catch (err) {
      const code = (err as Error & { code?: string }).code;
      if (code === "PRACTICE") {
        const pack = LOAD_PACKS.find((p) => p.cents === packCents);
        loadWallet(packCents, `Practice · ${pack?.name ?? "load"}`);
        toast.success(`${formatPrice(packCents)} on the practice drawer.`);
      } else {
        toast.error(err instanceof Error ? err.message : "PayPal would not open.");
      }
    } finally {
      setBusy(false);
    }
  }

  const paypalTitle = paypal?.state === "live" ? "ARMED" : paypal?.state === "open" ? "OPEN" : "LOCAL";

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
        <div className="mt-3 rounded-xl border border-border bg-bg-elevated p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[10px] tracking-[0.22em] text-lcd">PAYPAL DRAWER</p>
            <span className={`font-mono text-[10px] tracking-[0.22em] ${paypal?.state === "live" ? "text-lcd" : "text-fg-subtle"}`}>
              {paypalTitle}
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-fg-muted">
            {paypal?.state === "live"
              ? "Loads settle to the PayPal account that owns this station. Sending a facsimile never draws on it."
              : paypal?.state === "open"
                ? "Waiting on PayPal Client ID and Secret. Money cannot move until those seals are on the published station."
                : "This device is practice. Published loads go through PayPal to your account — no card is taken in the app."}
          </p>
        </div>

        <p className="mt-6 mb-2 font-mono text-[10px] tracking-[0.22em] text-fg-subtle">LOAD</p>
        <div className="grid grid-cols-2 gap-2">
          {LOAD_PACKS.map((pack) => (
            <button
              key={pack.id}
              type="button"
              disabled={busy || paypal?.state === "open"}
              onClick={() => void loadPack(pack.cents)}
              className="rounded-xl border border-border bg-bg-elevated px-3 py-4 text-left disabled:opacity-50"
            >
              <p className="font-mono text-lg text-fg">{formatPrice(pack.cents)}</p>
              <p className="mt-1 text-xs text-fg-muted">
                {paypal?.state === "live" ? `PayPal · ${pack.blurb}` : pack.blurb}
              </p>
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
