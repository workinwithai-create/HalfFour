import { buildScore, type AbsHit, type Groove, type Mode, type RecipeId, type Score, type Voice } from "./score";

const CDN = "https://cdn.jsdelivr.net/gh/workinwithai-create/PreEight@main/public/samples";

const FILES: { id: string; url: string }[] = [
  { id: "kick", url: `${CDN}/drums/kick.mp3` },
  { id: "snare", url: `${CDN}/drums/snare.mp3` },
  { id: "hat", url: `${CDN}/drums/hihat.mp3` },
  { id: "crash", url: `${CDN}/drums/crash.mp3` },
  { id: "p48", url: `${CDN}/piano/C3.mp3` },
  { id: "p57", url: `${CDN}/piano/A3.mp3` },
  { id: "p60", url: `${CDN}/piano/C4.mp3` },
  { id: "b28", url: `${CDN}/bass/E1.mp3` },
  { id: "b33", url: `${CDN}/bass/A1.mp3` },
  { id: "b36", url: `${CDN}/bass/C2.mp3` },
  { id: "g40", url: `${CDN}/guitar/E2.mp3` },
  { id: "g45", url: `${CDN}/guitar/A2.mp3` },
  { id: "g52", url: `${CDN}/guitar/E3.mp3` },
  { id: "t60", url: `${CDN}/trumpet/C4.mp3` },
  { id: "v57", url: `${CDN}/violin/A3.mp3` },
];

const BASES: Record<"piano" | "bass" | "guitar" | "trumpet" | "violin", number[]> = {
  piano: [48, 57, 60],
  bass: [28, 33, 36],
  guitar: [40, 45, 52],
  trumpet: [60],
  violin: [57],
};

let bankPromise: Promise<Record<string, AudioBuffer>> | null = null;
let sharedCtx: AudioContext | null = null;
let sharedBus: AudioNode | null = null;

function getCtx() {
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new AudioContext();
    sharedBus = null;
  }
  return sharedCtx;
}

function getBus(ctx: AudioContext) {
  if (sharedBus) return sharedBus;
  const bus = ctx.createGain();
  bus.gain.value = 0.92;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.knee.value = 6;
  comp.ratio.value = 3;
  comp.attack.value = 0.004;
  comp.release.value = 0.18;
  bus.connect(comp);
  comp.connect(ctx.destination);
  sharedBus = bus;
  return bus;
}

function nearest(voice: Voice, midi: number): { id: string; rate: number } {
  if (voice === "kick" || voice === "snare" || voice === "hat" || voice === "crash") {
    return { id: voice, rate: 1 };
  }
  const bases = BASES[voice];
  let best = bases[0]!;
  let dist = Math.abs(midi - best);
  for (const base of bases) {
    const d = Math.abs(midi - base);
    if (d < dist) {
      best = base;
      dist = d;
    }
  }
  const id =
    voice === "piano" ? `p${best}` : voice === "bass" ? `b${best}` : voice === "guitar" ? `g${best}` : voice === "trumpet" ? "t60" : "v57";
  return { id, rate: 2 ** ((midi - best) / 12) };
}

async function loadBank(onProgress: (n: number, total: number) => void) {
  if (!bankPromise) {
    const ctx = getCtx();
    bankPromise = (async () => {
      const out: Record<string, AudioBuffer> = {};
      let n = 0;
      await Promise.all(
        FILES.map(async (file) => {
          try {
            const res = await fetch(file.url);
            if (!res.ok) throw new Error(String(res.status));
            out[file.id] = await ctx.decodeAudioData(await res.arrayBuffer());
          } catch (err) {
            console.warn("chair missed", file.id, err);
          } finally {
            n += 1;
            onProgress(n, FILES.length);
          }
        }),
      );
      return out;
    })();
  }
  return bankPromise;
}

function playHit(ctx: BaseAudioContext, bus: AudioNode, bank: Record<string, AudioBuffer>, hit: AbsHit, when: number) {
  if (when < 0) return;
  if (ctx instanceof AudioContext && when < ctx.currentTime - 0.03) return;
  const { id, rate } = nearest(hit.voice, hit.midi);
  const buffer = bank[id];
  if (!buffer) return;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = rate;
  const gain = ctx.createGain();
  const start = Math.max(when, 0);
  gain.gain.setValueAtTime(hit.gain, start);
  src.connect(gain);
  gain.connect(bus);
  src.start(start);
}

export function encodeWav(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const rate = buffer.sampleRate;
  const frames = buffer.length;
  const block = channels * 2;
  const dataSize = frames * block;
  const ab = new ArrayBuffer(44 + dataSize);
  const view = new DataView(ab);
  const str = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  str(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  str(8, "WAVE");
  str(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * block, true);
  view.setUint16(32, block, true);
  view.setUint16(34, 16, true);
  str(36, "data");
  view.setUint32(40, dataSize, true);
  const data = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c));
  let offset = 44;
  for (let i = 0; i < frames; i += 1) {
    for (let c = 0; c < channels; c += 1) {
      const sample = Math.max(-1, Math.min(1, data[c]?.[i] ?? 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([ab], { type: "audio/wav" });
}

function vlq(value: number): number[] {
  let n = Math.max(0, value);
  const bytes = [n & 0x7f];
  n >>= 7;
  while (n > 0) {
    bytes.unshift((n & 0x7f) | 0x80);
    n >>= 7;
  }
  return bytes;
}

const GM: Record<Voice, { ch: number; program: number; drum?: number }> = {
  piano: { ch: 0, program: 0 },
  bass: { ch: 1, program: 32 },
  guitar: { ch: 2, program: 24 },
  trumpet: { ch: 3, program: 56 },
  violin: { ch: 4, program: 40 },
  kick: { ch: 9, program: 0, drum: 36 },
  snare: { ch: 9, program: 0, drum: 38 },
  hat: { ch: 9, program: 0, drum: 42 },
  crash: { ch: 9, program: 0, drum: 49 },
};

export function encodeMidi(score: Score, bpm: number): Blob {
  const sixteenth = 120;
  type Ev = { tick: number; bytes: number[] };
  const events: Ev[] = [];
  for (const voice of ["piano", "bass", "guitar", "trumpet", "violin"] as const) {
    const map = GM[voice];
    events.push({ tick: 0, bytes: [0xc0 | map.ch, map.program] });
  }
  for (const hit of score.hits) {
    const map = GM[hit.voice];
    const note = map.drum ?? Math.max(0, Math.min(127, hit.midi));
    const start = hit.step * sixteenth;
    const end = start + Math.max(20, hit.dur * sixteenth - 8);
    const vel = Math.max(1, Math.min(127, Math.round(hit.gain * 170)));
    events.push({ tick: start, bytes: [0x90 | map.ch, note, vel] });
    events.push({ tick: end, bytes: [0x80 | map.ch, note, 0] });
  }
  events.sort((a, b) => a.tick - b.tick);
  const track: number[] = [];
  let last = 0;
  for (const ev of events) {
    track.push(...vlq(ev.tick - last), ...ev.bytes);
    last = ev.tick;
  }
  track.push(...vlq(0), 0xff, 0x2f, 0x00);
  const uspq = Math.round(60_000_000 / bpm);
  const header = [0x4d, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0x01, 0x01, 0xe0];
  const tempo = [0x00, 0xff, 0x51, 0x03, (uspq >> 16) & 0xff, (uspq >> 8) & 0xff, uspq & 0xff];
  const body = [...tempo, ...track];
  const len = body.length;
  const mtrk = [0x4d, 0x54, 0x72, 0x6b, (len >> 24) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff];
  return new Blob([new Uint8Array([...header, ...mtrk, ...body])], { type: "audio/midi" });
}

export class HalfPlayer {
  private timer = 0;
  private bank: Record<string, AudioBuffer> = {};
  private score: Score | null = null;
  private stepDur = 0.12;
  private loopSteps = 16;
  private displayStart = 0;
  private scheduled = 0;
  playing = false;
  mode: Mode | null = null;

  constructor(
    private readonly onStatus: (text: string) => void,
    private readonly onBar: (index: number) => void,
  ) {}

  async load() {
    this.onStatus("Seating chairs…");
    this.bank = await loadBank((n, total) => this.onStatus(`Seating chairs ${n}/${total}`));
    const got = Object.keys(this.bank).length;
    this.onStatus(got >= 12 ? "Chairs seated · live FluidR3" : `Seated ${got}/15 chairs`);
  }

  stop() {
    this.playing = false;
    this.mode = null;
    window.clearTimeout(this.timer);
    this.onBar(-1);
  }

  async play(mode: Mode, groove: Groove, recipe: RecipeId) {
    const ctx = getCtx();
    if (ctx.state === "suspended") await ctx.resume();
    this.stop();
    this.score = buildScore(groove, recipe, mode);
    this.mode = mode;
    this.playing = true;
    this.loopSteps = this.score.steps;
    this.stepDur = 60 / groove.bpm / 4;
    this.displayStart = ctx.currentTime + 0.08;
    this.scheduled = 0;
    this.tick();
  }

  private tick = () => {
    const ctx = sharedCtx;
    const score = this.score;
    if (!ctx || !score || !this.playing) return;
    const bus = getBus(ctx);
    const horizon = ctx.currentTime + 0.22;
    while (this.displayStart + this.scheduled * this.stepDur < horizon) {
      const index = this.scheduled % this.loopSteps;
      const when = this.displayStart + this.scheduled * this.stepDur;
      for (const hit of score.hits) {
        if (hit.step === index) playHit(ctx, bus, this.bank, hit, when);
      }
      this.scheduled += 1;
    }
    const elapsed = ctx.currentTime - this.displayStart;
    if (elapsed >= 0) {
      const step = Math.floor(elapsed / this.stepDur);
      this.onBar(Math.floor((step % this.loopSteps) / 16));
    }
    this.timer = window.setTimeout(this.tick, 50);
  };

  async renderWav(groove: Groove, recipe: RecipeId, mode: Mode = "B"): Promise<Blob> {
    if (!Object.keys(this.bank).length) await this.load();
    const score = buildScore(groove, recipe, mode);
    const stepDur = 60 / groove.bpm / 4;
    const seconds = score.steps * stepDur + 2.6;
    const offline = new OfflineAudioContext(2, Math.ceil(seconds * 44100), 44100);
    const bus = offline.createGain();
    bus.gain.value = 0.9;
    const comp = offline.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3;
    bus.connect(comp);
    comp.connect(offline.destination);
    for (const hit of score.hits) playHit(offline, bus, this.bank, hit, 0.05 + hit.step * stepDur);
    return encodeWav(await offline.startRendering());
  }

  midi(groove: Groove, recipe: RecipeId): Blob {
    return encodeMidi(buildScore(groove, recipe, "H"), groove.bpm);
  }
}
