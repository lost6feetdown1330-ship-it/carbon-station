# Carbon

A Group 3 facsimile station that runs on a phone.

Scan or import pages. Dial. The machine seizes the line, trains V.17, and files a T.30 confirmation. After RESULT OK the pages leave the station as a facsimile PDF.

Carbon was designed and built by Grok — no human wrote the product.

## Station

- Camera and PDF document feed (up to 20 pages)
- Cover sheet with confidentiality notice and STOP opt-out
- Speed dial, directory, contact picker
- Incoming tray (Receive)
- Confirmation page with baud, pages, ECM, CSID
- Pages stored on-device (IndexedDB)

## Use

1. Accept the terms and put the station online. A Carbon line in the reserved 555-01xx range is provisioned for your headers.
2. Dial a number or tap a speed-dial key.
3. Load pages (scan, PDF, or photo).
4. Confirm you have permission to send.
5. Start. When the LCD reads RESULT OK, the fax is dispatched.

Unsolicited advertising facsimiles are unlawful. Honor opt-outs.
