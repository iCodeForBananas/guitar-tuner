import { useState } from "react";
import InstallCard from "./InstallCard";
import { FINE_ZONE, STANDARD_TUNING, guidance, meterPosition, noteName, type GuitarString } from "./lib/tuning";
import { useTuner, type MicState } from "./useTuner";

export default function TunerApp() {
  const [selected, setSelected] = useState<GuitarString>(STANDARD_TUNING[0]);
  const { mic, reading, start } = useTuner(selected.number);

  const g = reading ? guidance(reading.frequency, selected.frequency) : null;
  const inTune = g?.direction === "in-tune";
  const state = !g ? "waiting" : inTune ? "in-tune" : "off";

  return (
    <main className={`app state-${state}`}>
      <header className='header'>
        <h1>Guitar Tuner</h1>
        <p className='tuning'>Standard · E A D G B E</p>
      </header>

      <section className='readout' aria-live='polite'>
        <div className='target'>
          {selected.note}
          <sub>{selected.octave}</sub>
        </div>
        <div className='status'>{statusText(g, selected, mic)}</div>
        <div className='heard'>
          {reading ? `Hearing ${noteName(reading.frequency)} · ${reading.frequency.toFixed(1)} Hz` : " "}
        </div>
      </section>

      <Meter cents={g?.cents ?? null} live={reading?.live ?? false} inTune={inTune} />

      <nav className='strings' aria-label='String to tune'>
        {STANDARD_TUNING.map((s) => {
          const active = s.number === selected.number;
          return (
            <button
              key={s.number}
              type='button'
              className={`string ${active ? "active" : ""} ${active && inTune ? "done" : ""}`}
              aria-pressed={active}
              aria-label={`String ${s.number}, ${s.note}${s.octave}`}
              onClick={() => setSelected(s)}
            >
              <span className='string-note'>{s.note}</span>
              <span className='string-num'>{s.number}</span>
            </button>
          );
        })}
      </nav>

      {mic !== "listening" && <MicGate mic={mic} onStart={start} />}
    </main>
  );
}

function statusText(g: ReturnType<typeof guidance> | null, s: GuitarString, mic: MicState): string {
  if (mic !== "listening") return "";
  if (!g) return `Pluck the ${s.note} string`;
  if (g.direction === "in-tune") return "In tune";
  const c = Math.round(Math.abs(g.cents));
  const how = g.semitones >= 1 ? `${g.semitones} semitone${g.semitones > 1 ? "s" : ""}` : `${c}¢`;
  return g.direction === "tighten" ? `Tighten · ${how} low` : `Loosen · ${how} high`;
}

function Meter({ cents, live, inTune }: { cents: number | null; live: boolean; inTune: boolean }) {
  const pos = cents === null ? 0 : meterPosition(cents);
  // Ticks every 10 cents across the fine zone.
  const ticks = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50];
  return (
    <section className='meter' aria-hidden='true'>
      <div className='meter-labels'>
        <span>♭ Tighten</span>
        <span>Loosen ♯</span>
      </div>
      <div className='track'>
        <div className='coarse left' style={{ width: `${((1 - FINE_ZONE) / 2) * 100}%` }} />
        <div className='coarse right' style={{ width: `${((1 - FINE_ZONE) / 2) * 100}%` }} />
        <div className='sweet' />
        {ticks.map((t) => (
          <div
            key={t}
            className={`tick ${t === 0 ? "center" : ""}`}
            style={{ left: `${50 + meterPosition(t) * 50}%` }}
          />
        ))}
        {cents !== null && (
          <div
            className={`needle ${live ? "" : "held"} ${inTune ? "on" : ""}`}
            style={{ left: `${50 + pos * 50}%` }}
          />
        )}
      </div>
      <div className='meter-scale'>
        <span>1 oct</span>
        <span>−50¢</span>
        <span>0</span>
        <span>+50¢</span>
        <span>1 oct</span>
      </div>
    </section>
  );
}

function MicGate({ mic, onStart }: { mic: MicState; onStart: () => void }) {
  const message: Record<MicState, string> = {
    idle: "The tuner listens through your microphone. Nothing is recorded or sent anywhere.",
    starting: "Waiting for microphone permission…",
    listening: "",
    denied: "Microphone access was blocked. Allow it in your browser or device settings, then try again.",
    unsupported: "This browser can't use the microphone. Try a current version of Safari, Chrome or Firefox.",
    error: "Couldn't open the microphone. Check that one is connected, then try again.",
  };
  return (
    <div className='gate'>
      <div className='gate-card'>
        <p>{message[mic]}</p>
        {mic !== "unsupported" && (
          <button type='button' className='primary' onClick={onStart} disabled={mic === "starting"}>
            {mic === "idle" || mic === "starting" ? "Start tuning" : "Try again"}
          </button>
        )}
        <InstallCard />
      </div>
    </div>
  );
}
