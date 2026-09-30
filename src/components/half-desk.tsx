import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Download, Square } from "lucide-react";
import { HalfPlayer } from "@/lib/half-four/player";
import {
  buildScore,
  grooveById,
  grooves,
  punchList,
  recipes,
  type Mode,
  type RecipeId,
} from "@/lib/half-four/score";

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function HalfDesk() {
  const [grooveId, setGrooveId] = useState(grooves[0]!.id);
  const [recipeId, setRecipeId] = useState<RecipeId>("anchor");
  const [hook, setHook] = useState(grooves[0]!.hook);
  const [status, setStatus] = useState("Seating chairs…");
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode | null>(null);
  const [bar, setBar] = useState(-1);
  const [note, setNote] = useState("");
  const playerRef = useRef<HalfPlayer | null>(null);
  const groove = grooveById(grooveId);
  const recipe = recipes.find((item) => item.id === recipeId) ?? recipes[0]!;

  useEffect(() => {
    const player = new HalfPlayer(
      (text) => setStatus(text),
      (index) => setBar(index),
    );
    playerRef.current = player;
    let alive = true;
    void player.load().then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
      player.stop();
    };
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("halffour-hook");
    if (saved) setHook(saved);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (event.key === "a" || event.key === "A") void start("A");
      if (event.key === "b" || event.key === "B") void start("B");
      if (event.key === "h" || event.key === "H") void start("H");
      if (event.key === " ") {
        event.preventDefault();
        stop();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const form = useMemo(() => buildScore(groove, recipeId, mode ?? "B"), [groove, recipeId, mode]);
  const shown = mode === "A" ? buildScore(groove, recipeId, "A") : mode === "H" ? buildScore(groove, recipeId, "H") : form;

  function stop() {
    playerRef.current?.stop();
    setMode(null);
    setBar(-1);
  }

  async function start(next: Mode) {
    if (!ready) return;
    setMode(next);
    setNote("");
    await playerRef.current?.play(next, groove, recipeId);
  }

  async function copyPunch() {
    const text = punchList(groove, recipeId, hook);
    try {
      await navigator.clipboard.writeText(text);
      setNote("Punch list copied.");
    } catch {
      setNote("Clipboard blocked — select the list and copy.");
    }
  }

  async function saveWav() {
    if (!ready || !playerRef.current) return;
    setNote("Printing the pass…");
    const blob = await playerRef.current.renderWav(groove, recipeId);
    download(blob, `HalfFour-${groove.id}-${recipeId}.wav`);
    setNote("WAV saved. Straight, half-time, return.");
  }

  function saveMidi() {
    if (!playerRef.current) return;
    download(playerRef.current.midi(groove, recipeId), `HalfFour-${groove.id}-${recipeId}-half.mid`);
    setNote("Half-time MIDI saved. Drop it under the chorus.");
  }

  function pickGroove(id: string) {
    const next = grooveById(id);
    setGrooveId(id);
    const saved = window.localStorage.getItem("halffour-hook");
    if (!saved) setHook(next.hook);
    stop();
  }

  return (
    <>
    <main className="desk">
      <p className="eyebrow">WorkinWithAI · live chairs</p>
      <h1>HalfFour</h1>
      <p className="lead">
        The chorus stays a loop because the grid never changes. Eight bars run straight. Four live bars drop
        the same chords into half-time — kick on one, snare on three, the bass sits — then the top comes back
        heavier than it left. Acoustic piano, upright, nylon, trumpet, violin, kit. Not a new section. Not a
        key change. Not the seam that turns bar 8 into bar 1.
      </p>
      <p className="status">{status}</p>

      <p className="eyebrow">Groove</p>
      <div className="row">
        {grooves.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === grooveId ? "card on" : "card"}
            onClick={() => pickGroove(item.id)}
          >
            <b>
              {item.name}
              <span className="meta">
                {item.bpm} · {item.key}
              </span>
            </b>
            <span>{item.hook}</span>
          </button>
        ))}
      </div>

      <p className="eyebrow">Half-time</p>
      <div className="row">
        {recipes.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === recipeId ? "card on" : "card"}
            onClick={() => {
              setRecipeId(item.id);
              stop();
            }}
          >
            <b>{item.name}</b>
            <span>{item.blurb}</span>
          </button>
        ))}
      </div>

      <label className="hook">
        <span className="eyebrow">Line that sits in the four</span>
        <input
          value={hook}
          maxLength={80}
          suppressHydrationWarning
          onChange={(event) => {
            setHook(event.target.value);
            window.localStorage.setItem("halffour-hook", event.target.value);
          }}
        />
      </label>

      <p className="eyebrow">
        {mode === "A" && "Form · straight loop"}
        {mode === "H" && "Form · half-time only"}
        {mode === "B" && "Form · straight · half · return"}
        {mode === null && "Form · 1–8 straight · 9–12 half · 13–16 return"}
      </p>
      <div className={shown.bars.length > 8 ? "bars sixteen" : "bars"}>
        {shown.bars.map((item, index) => (
          <div
            key={`${item.role}-${item.n}`}
            className={`bar ${item.role}${index === bar ? " active" : ""}`}
          >
            <div className="n">
              {item.role === "half" ? "half" : item.role === "return" ? "back" : "straight"} {item.n}
            </div>
            <div className="c">{item.symbol}</div>
          </div>
        ))}
      </div>

      <div className="split">
        <h2>Punch list</h2>
        {note ? <p className="status">{note}</p> : null}
      </div>
      <pre>{punchList(groove, recipeId, hook)}</pre>
      <p className="fine">
        Yesterday wrote the verse and the door into a section. SeamFour turns the loop home. HalfFour changes
        the grid under the chorus you already have. {recipe.name}. Live samples only — audio never leaves
        this tab until you export.
      </p>
    </main>
    <div className="dock">
      <button type="button" className={mode === "A" ? "lit" : ""} disabled={!ready} onClick={() => void start("A")}>
        A · Straight
      </button>
      <button type="button" className={mode === "B" ? "lit" : ""} disabled={!ready} onClick={() => void start("B")}>
        B · Weight
      </button>
      <button type="button" className={mode === "H" ? "lit" : ""} disabled={!ready} onClick={() => void start("H")}>
        H · Half only
      </button>
      <button type="button" className="ghost" onClick={stop}>
        <Square aria-hidden /> Stop
      </button>
      <button type="button" className="ghost" onClick={() => void copyPunch()}>
        <Copy aria-hidden /> Punch
      </button>
      <button type="button" className="ghost" disabled={!ready} onClick={() => void saveWav()}>
        <Download aria-hidden /> WAV
      </button>
      <button type="button" className="ghost" onClick={saveMidi}>
        <Download aria-hidden /> MIDI
      </button>
    </div>
    </>
  );
}
