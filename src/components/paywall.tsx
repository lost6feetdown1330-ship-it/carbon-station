import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LOAD_PACKS, type Sku, formatPrice, owns, productBySku } from "@/lib/catalog";
import { startPaypalLoad } from "@/lib/paypal-client";
import { useFaxStore } from "@/lib/store";

export function useOwns(sku: Sku) {
  return useFaxStore((s) => owns(s.entitlements, sku));
}

export function BuySheet({
  sku,
  open,
  onOpenChange,
}: {
  sku: Sku | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const purchase = useFaxStore((s) => s.purchase);
  const entitlements = useFaxStore((s) => s.entitlements);
  const walletCents = useFaxStore((s) => s.walletCents);
  const [busy, setBusy] = useState(false);
  if (!sku) return null;
  const product = productBySku(sku);
  const already = owns(entitlements, sku);
  const short = !already && walletCents < product.cents;
  const remainder = product.cents - walletCents;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <p className="font-mono text-[10px] tracking-[0.22em] text-lcd">{product.kicker}</p>
          <SheetTitle>{product.name}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <p className="text-sm leading-relaxed text-fg-muted">{product.blurb}</p>
          <div className="flex items-end justify-between gap-3">
            <p className="font-mono text-2xl tracking-wide text-fg">{formatPrice(product.cents)}</p>
            <p className="font-mono text-[11px] text-fg-subtle">Drawer {formatPrice(walletCents)}</p>
          </div>
          {short && (
            <div className="space-y-2">
              <p className="text-xs text-fg-muted">
                Short {formatPrice(remainder)}. Load the drawer, then pay from it.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(LOAD_PACKS.filter((p) => p.cents >= remainder).slice(0, 2).length
                  ? LOAD_PACKS.filter((p) => p.cents >= remainder).slice(0, 2)
                  : [LOAD_PACKS[LOAD_PACKS.length - 1]!]
                ).map((pack) => (
                  <button
                    key={pack.id}
                    type="button"
                    className="rounded-lg border border-border px-3 py-2 text-left"
                    onClick={() => {
                      setBusy(true);
                      void startPaypalLoad(pack.cents)
                        .catch((err) => {
                          const code = (err as Error & { code?: string }).code;
                          if (code === "PRACTICE") {
                            useFaxStore.getState().loadWallet(pack.cents, `Practice · ${formatPrice(pack.cents)}`);
                            toast.success(`${formatPrice(pack.cents)} on the practice drawer.`);
                            return;
                          }
                          toast.error(err instanceof Error ? err.message : "PayPal would not open.");
                        })
                        .finally(() => setBusy(false));
                    }}
                  >
                    <p className="font-mono text-sm">{formatPrice(pack.cents)}</p>
                    <p className="text-[10px] text-fg-subtle">Load</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          <Button
            className="w-full"
            variant="start"
            disabled={already || busy || short}
            onClick={() => {
              setBusy(true);
              const ok = purchase(sku);
              setBusy(false);
              if (!ok) {
                toast.error("Drawer is short.");
                return;
              }
              toast.success(`${product.name} is on the station.`);
              onOpenChange(false);
            }}
          >
            {already
              ? "Already on this station"
              : short
                ? `Need ${formatPrice(remainder)} more`
                : `Pay ${formatPrice(product.cents)} from wallet`}
          </Button>
          <button
            type="button"
            className="w-full text-center font-mono text-[11px] tracking-wide text-fg-subtle"
            onClick={() => {
              onOpenChange(false);
              void navigate({ to: "/wallet" });
            }}
          >
            Open wallet
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function LockNote({ sku, label }: { sku: Sku; label: string }) {
  const owned = useOwns(sku);
  const [open, setOpen] = useState(false);
  if (owned) return null;
  const product = productBySku(sku);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-bg-elevated px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm text-fg-muted">
          <Lock className="size-4 text-lcd" />
          {label}
        </span>
        <span className="font-mono text-[11px] text-lcd">{formatPrice(product.cents)}</span>
      </button>
      <BuySheet sku={sku} open={open} onOpenChange={setOpen} />
    </>
  );
}
