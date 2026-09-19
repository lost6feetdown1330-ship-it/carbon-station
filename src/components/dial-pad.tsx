import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";
import { playDtmf, unlockAudio } from "@/lib/tones";

const KEYS = [
  ["1", ""],
  ["2", "ABC"],
  ["3", "DEF"],
  ["4", "GHI"],
  ["5", "JKL"],
  ["6", "MNO"],
  ["7", "PQRS"],
  ["8", "TUV"],
  ["9", "WXYZ"],
  ["*", ""],
  ["0", "+"],
  ["#", ""],
] as const;

export function DialPad({
  onDigit,
  onBackspace,
  onLongZero,
}: {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  onLongZero?: () => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map(([digit, letters]) => (
        <button
          key={digit}
          type="button"
          className={cn(
            "keycap flex h-14 flex-col items-center justify-center rounded-xl bg-bg-elevated text-fg",
            "border border-border hover:bg-bg-subtle",
          )}
          onPointerDown={() => {
            void unlockAudio();
            playDtmf(digit);
          }}
          onClick={() => onDigit(digit)}
          onContextMenu={(e) => {
            if (digit === "0" && onLongZero) {
              e.preventDefault();
              onLongZero();
            }
          }}
        >
          <span className="font-mono text-2xl leading-none">{digit}</span>
          {letters ? (
            <span className="mt-1 text-[9px] tracking-[0.22em] text-fg-subtle">{letters}</span>
          ) : (
            <span className="mt-1 h-3" />
          )}
        </button>
      ))}
      <button
        type="button"
        className="keycap col-span-3 flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-bg-elevated text-sm text-fg-muted hover:bg-bg-subtle"
        onClick={onBackspace}
      >
        <Delete className="size-4" />
        Backspace
      </button>
    </div>
  );
}
