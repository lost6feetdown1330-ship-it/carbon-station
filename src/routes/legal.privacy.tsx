import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/legal-doc";

export const Route = createFileRoute("/legal/privacy")({ component: Privacy });

function Privacy() {
  return (
    <LegalDoc kicker="CARBON" title="Privacy policy">
      <p>Effective 18 September 2026.</p>
      <p>
        Carbon is a facsimile station that runs on this device. Pages you scan, numbers you dial, and
        confirmations you keep are stored in this browser — in local storage and IndexedDB — not on a
        Carbon server. Clearing site data deletes the tray.
      </p>
      <p>
        The camera and file picker are used only when you load the feeder. Microphone access is not
        requested; handshake tones play through the speaker. Notifications are not sent off-device.
      </p>
      <p>
        If you share a fax through the system share sheet, that copy leaves Carbon and is handled by
        the app you choose (Mail, Files, a carrier, a printer). Carbon does not receive that handoff.
      </p>
      <p>
        We do not sell personal information. We do not run third-party advertising. Station identity
        (CSID, header, your line) is written onto page headers because that is how Group 3 facsimile
        identifies the sending machine.
      </p>
      <p>Questions about this policy: use the station header as the return identity on a facsimile.</p>
    </LegalDoc>
  );
}
