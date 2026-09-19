import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-border bg-bg-subtle transition-colors duration-150 data-[state=checked]:bg-lcd data-[state=checked]:border-lcd focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lcd/40",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className="pointer-events-none block size-5 translate-x-1 rounded-full bg-fg shadow-sm transition-transform duration-150 data-[state=checked]:translate-x-6 data-[state=checked]:bg-lcd-deep"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
