import { cn } from "@/lib/utils";

export function LcdPanel({
  line1,
  line2,
  status,
  className,
}: {
  line1: string;
  line2?: string;
  status?: "ready" | "busy" | "ok" | "error";
  className?: string;
}) {
  return (
    <div className={cn("lcd-screen relative overflow-hidden rounded-lg px-4 py-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] tracking-[0.28em] text-lcd/60">LINE 1</p>
        <span
          className={cn(
            "size-1.5 rounded-full",
            status === "error" ? "bg-danger" : "bg-lcd",
            status === "busy" && "lcd-cursor",
          )}
        />
      </div>
      <p className="lcd-text mt-2 truncate font-mono text-lg tracking-wide">{line1 || " "}</p>
      {line2 !== undefined && (
        <p className="lcd-text mt-1 truncate font-mono text-sm tracking-wide text-lcd/80">
          {line2}
          {status === "ready" && <span className="lcd-cursor">_</span>}
        </p>
      )}
    </div>
  );
}
