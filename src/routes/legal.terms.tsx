import { createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/legal-doc";

export const Route = createFileRoute("/legal/terms")({ component: Terms });

function Terms() {
  return (
    <LegalDoc kicker="CARBON" title="Terms of use">
      <p>Effective 18 September 2026.</p>
      <p>
        Carbon provisions a virtual station on this device. You are the operator. You are responsible
        for the content of every page you transmit and for having permission to send it.
      </p>
      <h2 className="pt-2 text-base font-medium text-fg">Consent and junk fax law</h2>
      <p>
        Unsolicited advertising facsimiles are unlawful in the United States under the Telephone
        Consumer Protection Act (47 U.S.C. § 227) and the Junk Fax Prevention Act, and may be
        unlawful in other jurisdictions. You must have prior express permission, an established
        business relationship, or another lawful basis before sending. Cover sheets include an
        opt-out notice; honor opt-out requests.
      </p>
      <h2 className="pt-2 text-base font-medium text-fg">The line</h2>
      <p>
        Your Carbon number is a station identifier in the reserved 555-01xx range. It is printed on
        headers and cover sheets. It is not a PSTN assignment from a telephone company. After the
        T.30 session, you hand pages off this device with Share, PDF, or Print so they actually
        leave the station.
      </p>
      <h2 className="pt-2 text-base font-medium text-fg">Acceptable use</h2>
      <p>
        Do not use Carbon to harass, defraud, spoof a foreign station ID in order to mislead, or send
        content you are not allowed to copy. Protected health information and attorney-client material
        remain your responsibility to safeguard.
      </p>
      <p>
        Carbon is provided as-is. Transmission confirmations record what this station did, not what a
        distant machine on the public network received.
      </p>
    </LegalDoc>
  );
}
