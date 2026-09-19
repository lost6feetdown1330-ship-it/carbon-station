import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-24 w-full rounded-md border border-border bg-bg-elevated px-3 py-2.5 text-base text-fg outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-fg-subtle focus-visible:border-lcd/50 focus-visible:ring-2 focus-visible:ring-lcd/30",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
