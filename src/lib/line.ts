/** Hollywood 555-01xx range — a virtual Carbon DID, not a PSTN assignment. */
export function provisionCarbonLine() {
  const bytes = new Uint8Array(2);
  crypto.getRandomValues(bytes);
  const nn = String(bytes[0]! % 100).padStart(2, "0");
  return `150355501${nn}`;
}
