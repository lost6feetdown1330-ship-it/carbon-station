import { createFileRoute, Link } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { FaxTray } from "@/components/fax-tray";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { outgoing, useFaxStore } from "@/lib/store";

export const Route = createFileRoute("/sent")({ component: SentPage });

function SentPage() {
  const faxes = useFaxStore((s) => s.faxes);
  const jobs = outgoing(faxes);

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        kicker="Outbox"
        title="Sent"
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/compose">New fax</Link>
          </Button>
        }
      />
      <FaxTray
        jobs={jobs}
        empty={
          <EmptyState
            icon={Send}
            title="Nothing has gone out"
            body="Dial a number on the machine, load pages, and press Start. After the handshake, share the PDF off this device."
          />
        }
      />
    </main>
  );
}
