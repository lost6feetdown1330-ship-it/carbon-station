export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function formatFaxNumber(value: string) {
  const hasPlus = value.trim().startsWith("+");
  const digits = digitsOnly(value);
  if (!digits) return hasPlus ? "+" : "";
  if (hasPlus || digits.length > 11) {
    const rest = hasPlus ? digits : digits;
    if (rest.length <= 1) return `+${rest}`;
    if (rest.length <= 4) return `+${rest}`;
    if (rest.length <= 7) return `+${rest.slice(0, 1)} ${rest.slice(1)}`;
    return `+${rest.slice(0, 1)} ${rest.slice(1, 4)} ${rest.slice(4, 7)} ${rest.slice(7, 11)}`.trim();
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return formatNanp(digits.slice(1), true);
  }
  if (digits.length <= 10) return formatNanp(digits, false);
  return digits;
}

function formatNanp(d: string, one: boolean) {
  const prefix = one ? "1 " : "";
  if (d.length === 0) return one ? "1" : "";
  if (d.length < 4) return `${prefix}(${d}`;
  if (d.length < 7) return `${prefix}(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `${prefix}(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
}

export function isDialable(value: string) {
  const digits = digitsOnly(value);
  return digits.length >= 10;
}

export function displayNumber(value: string) {
  if (!value) return "—";
  return formatFaxNumber(value);
}

export function toE164(value: string) {
  const digits = digitsOnly(value);
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (value.trim().startsWith("+") && digits.length >= 10) return `+${digits}`;
  if (digits.length >= 10) return `+${digits}`;
  throw new Error("Need a full fax number.");
}

export function formatDuration(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatClock(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatShortDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatLongDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatHeaderStamp(ts: number) {
  const d = new Date(ts);
  const mon = d.toLocaleString("en-US", { month: "short" });
  const day = d.getDate();
  const year = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${mon} ${day} ${year}  ${hh}:${mm}`;
}

export function estimateTransmitMs(pages: number, resolution: "standard" | "fine" | "superfine") {
  const perPage = resolution === "standard" ? 14000 : resolution === "fine" ? 18000 : 24000;
  return 5200 + pages * perPage;
}

export function padStation(id: string, width = 16) {
  const s = id.toUpperCase().slice(0, width);
  return s.padEnd(width, " ");
}
