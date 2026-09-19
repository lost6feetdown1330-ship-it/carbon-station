import * as React from "react";
import { Drawer } from "vaul";
import { cn } from "@/lib/utils";

function Sheet({ shouldScaleBackground = false, ...props }: React.ComponentProps<typeof Drawer.Root>) {
  return <Drawer.Root shouldScaleBackground={shouldScaleBackground} {...props} />;
}

const SheetTrigger = Drawer.Trigger;
const SheetClose = Drawer.Close;
const SheetPortal = Drawer.Portal;

function SheetContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Drawer.Content>) {
  return (
    <SheetPortal>
      <Drawer.Overlay className="fixed inset-0 z-50 bg-bg/70" />
      <Drawer.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mt-24 flex max-h-[92dvh] flex-col rounded-t-2xl border border-border bg-bg-elevated outline-none",
          className,
        )}
        {...props}
      >
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-border" />
        {children}
      </Drawer.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1 px-5 pt-4 pb-2", className)} {...props} />;
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof Drawer.Title>) {
  return <Drawer.Title className={cn("text-lg font-medium tracking-tight", className)} {...props} />;
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof Drawer.Description>) {
  return <Drawer.Description className={cn("text-sm text-fg-muted", className)} {...props} />;
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription };
