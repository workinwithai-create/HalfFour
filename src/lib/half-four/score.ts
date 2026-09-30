export type Voice =
  | "kick"
  | "snare"
  | "hat"
  | "crash"
  | "piano"
  | "bass"
  | "guitar"
  | "trumpet"
  | "violin";

export type Chord = {
  symbol: string;
  piano: number[];
  guitar: number[];
  bass: number;
  fifth: number;
  lead: number;
  pad: number;
};

export type Groove = {
  id: string;
  name: string;
  bpm: number;
  key: string;
  hook: string;
  bars: Chord[];
};

export type RecipeId = "anchor" | "two-step" | "string" | "horn" | "crash" | "walk-back";

export type Mode = "A" | "B" | "H";

export type Role = "straight" | "half" | "return";

export type AbsHit = {
  step: number;
  voice: Voice;
  midi: number;
  gain: number;
  dur: number;
};

export type BarView = {
  symbol: string;
  role: Role;
  n: number;
};

export type Score = {
  bars: BarView[];
  hits: AbsHit[];
  steps: number;
};

export const recipes: { id: RecipeId; name: string; blurb: string }[] = [
  { id: "anchor", name: "Anchor", blurb: "Kick on one. Snare on three. The band sits down." },
  { id: "two-step", name: "Two-step", blurb: "Bass answers on beat three. The pocket still moves." },
  { id: "string", name: "String bed", blurb: "Violin holds the color. Hats get out of the vocal." },
  { id: "horn", name: "Horn lean", blurb: "Trumpet parks, then leans into the return." },
  { id: "crash", name: "Crash door", blurb: "One crash. No hats. Half-time arrives like a door." },
  { id: "walk-back", name: "Walk back", blurb: "Three heavy bars, then the upright walks you home." },
];

const g = (symbol: string, piano: number[], guitar: number[], bass: number, lead: number, pad: number): Chord => ({
  symbol,
  piano,
  guitar,
  bass,
  fifth: bass + 7,
  lead,
  pad,
});

export const grooves: Groove[] = [
  {
    id: "yard",
    name: "Yard",
    bpm: 92,
    key: "G major",
    hook: "leave the light on",
    bars: [
      g("G", [55, 59, 62], [43, 47, 50], 31, 67, 62),
      g("D", [50, 54, 57], [38, 45, 50], 26, 62, 57),
      g("Em", [52, 55, 59], [40, 47, 52], 28, 64, 59),
      g("C", [48, 52, 55], [36, 43, 48], 36, 60, 55),
      g("G", [55, 59, 62], [43, 47, 50], 31, 67, 62),
      g("D", [50, 54, 57], [38, 45, 50], 26, 62, 57),
      g("Em", [52, 55, 59], [40, 47, 52], 28, 64, 59),
      g("C", [48, 52, 55], [36, 43, 48], 36, 60, 55),
    ],
  },
  {
    id: "late",
    name: "Late",
    bpm: 84,
    key: "F minor",
    hook: "say it slower",
    bars: [
      g("Fm", [53, 56, 60], [41, 48, 53], 29, 65, 60),
      g("Db", [49, 53, 56], [37, 44, 49], 25, 61, 56),
      g("Ab", [56, 60, 63], [44, 51, 56], 32, 68, 63),
      g("Eb", [51, 55, 58], [39, 46, 51], 27, 63, 58),
      g("Fm", [53, 56, 60], [41, 48, 53], 29, 65, 60),
      g("Db", [49, 53, 56], [37, 44, 49], 25, 61, 56),
      g("Ab", [56, 60, 63], [44, 51, 56], 32, 68, 63),
      g("Eb", [51, 55, 58], [39, 46, 51], 27, 63, 58),
    ],
  },
  {
    id: "copper",
    name: "Copper",
    bpm: 100,
    key: "D major",
    hook: "we don't get younger",
    bars: [
      g("D", [50, 54, 57], [38, 42, 50], 26, 62, 57),
      g("Bm", [47, 50, 54], [35, 42, 47], 35, 59, 54),
      g("G", [55, 59, 62], [43, 47, 50], 31, 67, 62),
      g("A", [45, 49, 52], [33, 40, 45], 33, 64, 61),
      g("D", [50, 54, 57], [38, 42, 50], 26, 62, 57),
      g("Bm", [47, 50, 54], [35, 42, 47], 35, 59, 54),
      g("G", [55, 59, 62], [43, 47, 50], 31, 67, 62),
      g("A", [45, 49, 52], [33, 40, 45], 33, 64, 61),
    ],
  },
];

function push(out: AbsHit[], step: number, voice: Voice, midi: number, gain: number, dur: number) {
  out.push({ step, voice, midi, gain, dur });
}

function straight(out: AbsHit[], chord: Chord, base: number) {
  for (const s of [0, 2, 4, 6, 8, 10, 12, 14]) push(out, base + s, "hat", 0, 0.055, 1);
  push(out, base, "kick", 0, 0.62, 2);
  push(out, base + 8, "kick", 0, 0.48, 2);
  push(out, base + 10, "kick", 0, 0.18, 1);
  push(out, base + 4, "snare", 0, 0.4, 2);
  push(out, base + 12, "snare", 0, 0.36, 2);
  push(out, base, "bass", chord.bass, 0.46, 6);
  push(out, base + 8, "bass", chord.fifth, 0.34, 4);
  chord.guitar.forEach((midi, i) => {
    push(out, base + (i % 2) * 4, "guitar", midi, 0.13, 4);
    push(out, base + 8 + (i % 2) * 4, "guitar", midi, 0.11, 4);
  });
  chord.piano.forEach((midi) => push(out, base, "piano", midi, 0.14, 6));
  push(out, base + 6, "piano", chord.piano[chord.piano.length - 1] ?? 60, 0.08, 2);
  push(out, base + 14, "piano", chord.pad, 0.07, 2);
}

function half(out: AbsHit[], chord: Chord, base: number, recipe: RecipeId, local: number, nextBass: number) {
  const sit = recipe !== "walk-back" || local < 3;
  push(out, base, "kick", 0, 0.74, 4);
  push(out, base + 8, "snare", 0, recipe === "crash" ? 0.62 : 0.52, 4);

  if (recipe === "crash") {
    if (local === 0) push(out, base, "crash", 0, 0.42, 8);
  } else if (recipe === "two-step") {
    push(out, base, "hat", 0, 0.05, 2);
    push(out, base + 8, "hat", 0, 0.045, 2);
    push(out, base + 12, "hat", 0, 0.035, 1);
  } else {
    push(out, base, "hat", 0, 0.04, 2);
    push(out, base + 8, "hat", 0, 0.035, 2);
  }

  if (recipe === "walk-back" && local === 3) {
    const lead = nextBass - 1;
    const mid = chord.bass + (nextBass >= chord.bass ? 3 : -2);
    const steps = [chord.bass, chord.bass + 2, mid, lead];
    steps.forEach((midi, i) => push(out, base + i * 4, "bass", midi, 0.5, 4));
    push(out, base + 12, "snare", 0, 0.28, 1);
    push(out, base + 14, "snare", 0, 0.34, 1);
    push(out, base + 15, "snare", 0, 0.4, 1);
    chord.piano.forEach((midi) => push(out, base, "piano", midi, 0.1, 8));
    return;
  }

  push(out, base, "bass", chord.bass, 0.56, recipe === "two-step" ? 8 : 14);
  if (recipe === "two-step") push(out, base + 8, "bass", chord.fifth, 0.4, 8);

  chord.piano.forEach((midi) => push(out, base, "piano", midi, recipe === "string" ? 0.1 : 0.2, 14));
  if (recipe === "two-step") push(out, base + 8, "piano", chord.pad, 0.12, 6);

  if (sit) {
    const gGain = recipe === "string" ? 0.08 : 0.14;
    chord.guitar.forEach((midi) => push(out, base, "guitar", midi, gGain, 10));
  }

  if (recipe === "string") push(out, base, "violin", chord.pad, 0.3, 16);
  if (recipe === "horn") {
    if (local < 3) push(out, base, "trumpet", chord.lead, 0.28, 12);
    else {
      push(out, base + 8, "trumpet", chord.pad, 0.26, 3);
      push(out, base + 12, "trumpet", chord.lead, 0.28, 2);
      push(out, base + 14, "trumpet", chord.lead + 2, 0.3, 2);
    }
  }
}

export function buildScore(groove: Groove, recipe: RecipeId, mode: Mode): Score {
  const bars: BarView[] = [];
  const hits: AbsHit[] = [];
  const phrase = groove.bars.slice(4, 8);
  const head = groove.bars.slice(0, 4);

  const addStraight = (chord: Chord, role: Role) => {
    const n = bars.length;
    bars.push({ symbol: chord.symbol, role, n: n + 1 });
    straight(hits, chord, n * 16);
  };
  const addHalf = (chord: Chord, local: number, nextBass: number) => {
    const n = bars.length;
    bars.push({ symbol: chord.symbol, role: "half", n: n + 1 });
    half(hits, chord, n * 16, recipe, local, nextBass);
  };

  if (mode === "A") groove.bars.forEach((c) => addStraight(c, "straight"));
  if (mode === "H") phrase.forEach((c, i) => addHalf(c, i, phrase[(i + 1) % phrase.length]?.bass ?? c.bass));
  if (mode === "B") {
    groove.bars.forEach((c) => addStraight(c, "straight"));
    phrase.forEach((c, i) => addHalf(c, i, i === 3 ? (head[0]?.bass ?? c.bass) : (phrase[i + 1]?.bass ?? c.bass)));
    head.forEach((c) => addStraight(c, "return"));
  }

  return { bars, hits, steps: bars.length * 16 };
}

export function punchList(groove: Groove, recipeId: RecipeId, hook: string): string {
  const recipe = recipes.find((r) => r.id === recipeId)!;
  const line = hook.trim() || groove.hook;
  return [
    `HalfFour · ${groove.name} · ${groove.key} · ${groove.bpm} bpm`,
    `Recipe: ${recipe.name} — ${recipe.blurb}`,
    `Hook line (sits inside the half-time): “${line}”`,
    ``,
    `Form`,
    `1–8   straight chorus. This is the loop you already have.`,
    `9–12  same chords, half-time grid. Kick on 1, snare on 3.`,
    `13–16 straight return, so the top feels heavier than it left.`,
    ``,
    `Do this in the DAW`,
    `1. Duplicate the chorus. Do not write a new section.`,
    `2. Bars 9–12: move the snare from 2 and 4 onto beat 3.`,
    `3. Kick only on beat 1. Delete the hat pattern. Leave one closed hat on 1 and 3 if the room feels dead.`,
    `4. Bass becomes a whole note on the root (${recipe.name === "Two-step" ? "plus the fifth on beat 3" : "hold it"}).`,
    `5. Piano and guitar stab on beat 1 and get out of the way.`,
    recipe.id === "string" ? `6. Violin holds the color tone across each of the four bars.` : null,
    recipe.id === "horn" ? `6. Trumpet holds the lead tone, then a three-note pickup into bar 13.` : null,
    recipe.id === "crash" ? `6. One crash on bar 9. No hats for the four.` : null,
    recipe.id === "walk-back" ? `6. Bar 12: upright walks in quarter notes into the return downbeat.` : null,
    `${recipe.id === "anchor" || recipe.id === "two-step" ? "6" : "7"}. Sing “${line}” once across the four. Do not chop it into the straight grid.`,
    ``,
    `Not this desk`,
    `SeamFour turns bar 8 back into bar 1. HalfFour does not rewrite the chords.`,
    `VerseEight writes the verse. DoorTwo is the entrance. StopFour is a hole.`,
    `ThinFour keeps the straight grid and removes notes. This changes the grid.`,
    `UpStep is a key change. MixForge is the mix. AuraMix is the vocal.`,
    ``,
    `Print the half-time MIDI under the chorus you already trust. Leave with the line.`,
  ]
    .filter((row): row is string => row !== null)
    .join("\n");
}

export function grooveById(id: string): Groove {
  return grooves.find((g) => g.id === id) ?? grooves[0]!;
}
