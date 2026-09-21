import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, ChevronLeft } from "lucide-react";
import { BuySheet } from "@/components/paywall";
import { WalletCard } from "@/components/wallet-card";
import { Button } from "@/components/ui/button";
import { CATALOG, type Sku, formatPrice, owns } from "@/lib/catalog";
import { useFaxStore } from "@/lib/store";

export const Route = createFileRoute("/shop")({ component: ShopPage });

function ShopPage() {
  const navigate = useNavigate();
  const entitlements = useFaxStore((s) => s.entitlements);
  const purchases = useFaxStore((s) => s.purchases);
  const [sku, setSku] = useState<Sku | null>(null);

  return (
    <main className="pb-10">
      <header className="flex items-center gap-2 px-3 pt-4">
        <Button variant="ghost" size="icon" onClick={() => void navigate({ to: "/settings" })} aria-label="Back">
          <ChevronLeft />
        </Button>
        <div>
          <p className="font-mono text-[10px] tracking-[0.28em] text-lcd">STATION STORE</p>
          <h1 className="text-lg font-medium">On the machine</h1>
        </div>
      </header>

      <section className="mt-5 px-5">
        <WalletCard />
        <div className="mt-5 rounded-xl border border-border bg-bg-elevated p-4">
          <p className="font-mono text-[10px] tracking-[0.22em] text-lcd">FREE LINE</p>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            Scan, dial, and send a Group 3 facsimile at no charge. Desk unlocks draw from the wallet, never from a send.
          </p>
        </div>

        <ul className="mt-5 space-y-3">
          {CATALOG.map((product) => {
            const have = owns(entitlements, product.sku);
            return (
              <li key={product.sku}>
                <button
                  type="button"
                  onClick={() => setSku(product.sku)}
                  className="w-full rounded-xl border border-border bg-bg-elevated p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] tracking-[0.22em] text-fg-subtle">{product.kicker}</p>
                      <p className="mt-1 text-sm font-medium">{product.name}</p>
                    </div>
                    {have ? (
                      <span className="flex items-center gap-1 font-mono text-[11px] text-lcd">
                        <Check className="size-3.5" />
                        ON
                      </span>
                    ) : (
                      <span className="font-mono text-sm text-fg">{formatPrice(product.cents)}</span>
                    )}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-fg-muted">{product.blurb}</p>
                </button>
              </li>
            );
          })}
        </ul>

        {purchases.length > 0 && (
          <p className="mt-6 font-mono text-[11px] text-fg-subtle">
            {purchases.length} charge{purchases.length === 1 ? "" : "s"} on this station ledger.
          </p>
        )}
      </section>
      <BuySheet sku={sku} open={Boolean(sku)} onOpenChange={(v) => !v && setSku(null)} />
    </main>
  );
}
