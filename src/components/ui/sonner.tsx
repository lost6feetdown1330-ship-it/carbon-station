import { Toaster as Sonner } from "sonner";

function Toaster() {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "bg-bg-elevated text-fg border-border",
          description: "text-fg-muted",
        },
      }}
    />
  );
}

export { Toaster };
