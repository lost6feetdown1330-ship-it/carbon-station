import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LegalDoc({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <main className="px-5 pt-4 pb-16">
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => void navigate({ to: "/" })} aria-label="Back">
          <ChevronLeft />
        </Button>
        <div>
          <p className="font-mono text-[10px] tracking-[0.28em] text-fg-subtle">{kicker}</p>
          <h1 className="text-lg font-medium">{title}</h1>
        </div>
      </header>
      <article className="prose-legal mt-6 space-y-4 text-sm leading-relaxed text-fg-muted">{children}</article>
      <p className="mt-8 text-xs text-fg-subtle">
        <Link to="/legal/privacy" className="underline decoration-border underline-offset-4">
          Privacy
        </Link>
        {" · "}
        <Link to="/legal/terms" className="underline decoration-border underline-offset-4">
          Terms
        </Link>
      </p>
    </main>
  );
}
