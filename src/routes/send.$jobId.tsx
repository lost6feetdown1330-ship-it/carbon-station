import { createFileRoute, Link } from "@tanstack/react-router";
import { TransmitTheater } from "@/components/transmit-theater";
import { Button } from "@/components/ui/button";
import { useFaxStore } from "@/lib/store";

export const Route = createFileRoute("/send/$jobId")({ component: SendJob });

function SendJob() {
  const { jobId } = Route.useParams();
  const job = useFaxStore((s) => s.faxes.find((f) => f.id === jobId));

  if (!job) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-fg-muted">That session is no longer on the machine.</p>
        <Button asChild variant="outline">
          <Link to="/">Return to station</Link>
        </Button>
      </main>
    );
  }

  return <TransmitTheater job={job} />;
}
