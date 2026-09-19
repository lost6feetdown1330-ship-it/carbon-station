import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[transform,background-color,opacity,color] duration-150 ease-out disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-lcd/60 active:not-disabled:scale-[0.96]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        start: "bg-lcd text-lcd-deep hover:bg-lcd/90 font-semibold tracking-wide",
        outline: "border border-border bg-transparent text-fg hover:bg-bg-subtle",
        secondary: "bg-bg-subtle text-fg hover:bg-bg-elevated",
        ghost: "text-fg hover:bg-bg-subtle",
        danger: "bg-danger text-paper hover:bg-danger/90",
        paper: "bg-paper text-ink hover:bg-paper/90",
      },
      size: {
        default: "h-11 px-4",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-6",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
