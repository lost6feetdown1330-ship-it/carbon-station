import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { type Sku, formatPrice, owns, productBySku } from "@/lib/catalog";
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
  const purchase = useFaxStore((s) => s.purchase);
  const entitlements = useFaxStore((s) => s.entitlements);
  const [busy, setBusy] = useState(false);
  if (!sku) return null;
  const product = productBySku(sku);
  const already = owns(entitlements, sku);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <p className="font-mono text-[10px] tracking-[0.22em] text-lcd">{product.kicker}</p>
          <SheetTitle>{product.name}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <p className="text-sm leading-relaxed text-fg-muted">{product.blurb}</p>
          <p className="font-mono text-2xl tracking-wide text-fg">{formatPrice(product.cents)}</p>
          <p className="text-xs text-fg-subtle">
            Sending a facsimile stays free. This unlock lives on this station. No card is taken here — the
            charge posts to the station ledger.
          </p>
          <Button
            className="w-full"
            variant="start"
            disabled={already || busy}
            onClick={() => {
              setBusy(true);
              purchase(sku);
              toast.success(`${product.name} is on the station.`);
              onOpenChange(false);
              setBusy(false);
            }}
          >
            {already ? "Already on this station" : `Charge ${formatPrice(product.cents)}`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function LockNote({ sku, label }: { sku: Sku; label: string }) {
  const navigate = useNavigate();
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
      <button
        type="button"
        className="sr-only"
        onClick={() => void navigate({ to: "/shop" })}
      >
        Open store
      </button>
    </>
  );
}
