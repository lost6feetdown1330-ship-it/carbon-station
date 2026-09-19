import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Inbox, Plus } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { FaxTray } from "@/components/fax-tray";
import { PageHeader } from "@/components/app-shell";
import { Scanner } from "@/components/scanner";
import { Button } from "@/components/ui/button";
import { buildHeaderLine } from "@/lib/fax-image";
import { savePageBlob } from "@/lib/idb";
import { incoming, useFaxStore } from "@/lib/store";
import { BAUD_BY_RESOLUTION, type FaxJob } from "@/lib/types";
import { createId } from "@/lib/utils";

export const Route = createFileRoute("/inbox")({ component: InboxPage });

function InboxPage() {
  const faxes = useFaxStore((s) => s.faxes);
  const settings = useFaxStore((s) => s.settings);
  const upsertFax = useFaxStore((s) => s.upsertFax);
  const jobs = incoming(faxes);
  const [receiving, setReceiving] = useState(false);

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        kicker="Received"
        title="Inbox"
        action={
          <Button variant="outline" size="sm" onClick={() => setReceiving(true)}>
            <Plus />
            Receive
          </Button>
        }
      />
      <FaxTray
        jobs={jobs}
        empty={
          <EmptyState
            icon={Inbox}
            title="The tray is empty"
            body="Tap Receive to pull pages onto this line from the camera or a PDF, the same way a desk fax takes paper in."
          />
        }
      />
      {receiving && (
        <Scanner
          settings={settings}
          mode="text"
          header={buildHeaderLine(settings, 1, 1)}
          onClose={() => setReceiving(false)}
          onPages={async (pages) => {
            const id = createId();
            const faxPages = [];
            for (const page of pages) {
              const pid = createId();
              await savePageBlob(pid, page.blob);
              faxPages.push({ id: pid, thumb: page.thumb, kind: "document" as const });
            }
            const job: FaxJob = {
              id,
              direction: "in",
              status: "received",
              toNumber: settings.ownNumber,
              toName: settings.headerName,
              fromNumber: "",
              fromName: "Received on line",
              subject: `${faxPages.length} incoming page${faxPages.length === 1 ? "" : "s"}`,
              pages: faxPages,
              cover: false,
              resolution: settings.resolution,
              ecm: settings.ecm,
              createdAt: Date.now(),
              completedAt: Date.now(),
              baud: BAUD_BY_RESOLUTION[settings.resolution],
              resultCode: "OK",
              unread: true,
            };
            upsertFax(job);
            setReceiving(false);
            toast.success("Pages landed in the tray.");
          }}
        />
      )}
    </main>
  );
}
