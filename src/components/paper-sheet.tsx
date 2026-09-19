import { cn } from "@/lib/utils";

export function PaperSheet({
  src,
  alt,
  className,
  compact,
}: {
  src: string;
  alt: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <figure
      className={cn(
        "paper-grain print-sheet overflow-hidden shadow-[var(--shadow-paper)]",
        compact ? "rounded-sm" : "rounded-sm",
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        className="block w-full outline outline-1 -outline-offset-1 outline-ink/10"
      />
    </figure>
  );
}
