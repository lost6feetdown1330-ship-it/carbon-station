let ctx: AudioContext | null = null;
let muted = false;

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export function setSpeakerMuted(value: boolean) {
  muted = value;
}

export async function unlockAudio() {
  const ac = audio();
  if (ac && ac.state === "suspended") await ac.resume();
}

function playTone(freq: number, duration: number, gain = 0.08, type: OscillatorType = "sine") {
  const ac = audio();
  if (!ac || muted) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + duration);
}

export function playDtmf(key: string) {
  const map: Record<string, [number, number]> = {
    "1": [697, 1209],
    "2": [697, 1336],
    "3": [697, 1477],
    "4": [770, 1209],
    "5": [770, 1336],
    "6": [770, 1477],
    "7": [852, 1209],
    "8": [852, 1336],
    "9": [852, 1477],
    "*": [941, 1209],
    "0": [941, 1336],
    "#": [941, 1477],
  };
  const pair = map[key];
  if (!pair) {
    playTone(800, 0.04, 0.04, "square");
    return;
  }
  playTone(pair[0], 0.12, 0.05);
  playTone(pair[1], 0.12, 0.05);
}

export function playCng() {
  // CNG calling tone: 1100 Hz, 0.5s on
  playTone(1100, 0.5, 0.07);
}

export function playCed() {
  // CED called tone: 2100 Hz
  playTone(2100, 0.9, 0.06);
}

export function playModemBurst() {
  const ac = audio();
  if (!ac || muted) return;
  const duration = 0.55;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(1650, ac.currentTime);
  osc.frequency.linearRampToValueAtTime(2100, ac.currentTime + duration);
  g.gain.setValueAtTime(0.03, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + duration);
}

export function playSuccess() {
  playTone(880, 0.08, 0.05);
  setTimeout(() => playTone(1320, 0.12, 0.05), 90);
}

export function playError() {
  playTone(220, 0.28, 0.07, "square");
}
