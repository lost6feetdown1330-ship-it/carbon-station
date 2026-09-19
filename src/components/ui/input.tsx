import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-md border border-border bg-bg-elevated px-3 text-base text-fg shadow-none outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-fg-subtle focus-visible:border-lcd/50 focus-visible:ring-2 focus-visible:ring-lcd/30 disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
