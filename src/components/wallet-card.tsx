import { useNavigate } from "@tanstack/react-router";
import { LcdPanel } from "@/components/lcd-panel";
import { formatPrice } from "@/lib/catalog";
import { displayNumber } from "@/lib/format";
import { useFaxStore } from "@/lib/store";

export function WalletCard({ onOpen }: { onOpen?: () => void }) {
  const navigate = useNavigate();
  const cents = useFaxStore((s) => s.walletCents);
  const settings = useFaxStore((s) => s.settings);

  return (
    <button
      type="button"
      onClick={() => (onOpen ? onOpen() : void navigate({ to: "/wallet" }))}
      className="w-full text-left"
    >
      <LcdPanel
        line1={formatPrice(cents)}
        line2={`${settings.stationId}  ·  ${displayNumber(settings.ownNumber)}`}
        status={cents > 0 ? "ok" : "ready"}
      />
      <p className="mt-2 font-mono text-[10px] tracking-[0.22em] text-fg-subtle">STATION WALLET</p>
    </button>
  );
}
