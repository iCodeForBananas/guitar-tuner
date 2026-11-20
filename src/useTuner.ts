// Microphone in, steady pitch out.
//
// Reads the mic through an AnalyserNode on every animation frame, runs pitch
// detection, and smooths the result with a short median so one bad frame
// doesn't flick the needle. When the string stops ringing, the last reading
// is held briefly so you can see where it ended up.

import { useCallback, useEffect, useRef, useState } from "react";
import { detectPitch } from "./lib/pitch";
import { median } from "./lib/tuning";

const BUFFER_SIZE = 4096; // ~85 ms at 48 kHz: three periods of a slack low E
const SMOOTHING = 5; // readings in the median
const HOLD_MS = 1500;

export type MicState = "idle" | "starting" | "listening" | "denied" | "unsupported" | "error";

export interface TunerReading {
  frequency: number;
  /** False once the string has stopped and we're only holding the last value. */
  live: boolean;
}

export function useTuner(resetKey: unknown) {
  const [mic, setMic] = useState<MicState>("idle");
  const [reading, setReading] = useState<TunerReading | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const historyRef = useRef<number[]>([]);
  const lastHeardRef = useRef(0);

  // A new target string starts from a clean slate.
  useEffect(() => {
    historyRef.current = [];
    lastHeardRef.current = 0;
    setReading(null);
  }, [resetKey]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    void ctxRef.current?.close();
    streamRef.current = null;
    ctxRef.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  // Phones suspend (iOS: "interrupt") audio when the app goes to the
  // background, a call comes in, or the screen locks. Pick back up when the
  // tuner is in front again.
  useEffect(() => {
    const wake = () => {
      const ctx = ctxRef.current;
      if (document.visibilityState === "visible" && ctx && ctx.state !== "running" && ctx.state !== "closed") {
        void ctx.resume();
      }
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    window.addEventListener("pageshow", wake);
    return () => {
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", wake);
      window.removeEventListener("pageshow", wake);
    };
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMic("unsupported");
      return;
    }
    setMic("starting");
    try {
      // The browser's voice processing is built for speech and smears pitch;
      // turn all of it off.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const ctx = new AudioContext();
      await ctx.resume(); // iOS starts contexts suspended
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = BUFFER_SIZE;
      source.connect(analyser);
      streamRef.current = stream;
      ctxRef.current = ctx;
      ctx.onstatechange = () => {
        if (ctx.state !== "running" && ctx.state !== "closed" && document.visibilityState === "visible") {
          void ctx.resume();
        }
      };
      setMic("listening");

      const buffer = new Float32Array(BUFFER_SIZE);
      let frame = 0;
      const tick = () => {
        rafRef.current = requestAnimationFrame(tick);
        // Every other frame is plenty for a needle and halves the CPU.
        if (frame++ % 2) return;
        analyser.getFloatTimeDomainData(buffer);
        const now = performance.now();
        const r = detectPitch(buffer, ctx.sampleRate);
        if (r) {
          const h = historyRef.current;
          // A big jump means a new pluck or a different string: start over
          // rather than averaging two notes together.
          if (h.length && Math.abs(Math.log2(r.frequency / h[h.length - 1])) > 0.05) h.length = 0;
          h.push(r.frequency);
          if (h.length > SMOOTHING) h.shift();
          lastHeardRef.current = now;
          setReading({ frequency: median(h), live: true });
        } else if (lastHeardRef.current) {
          if (now - lastHeardRef.current > HOLD_MS) {
            lastHeardRef.current = 0;
            historyRef.current = [];
            setReading(null);
          } else {
            setReading((prev) => (prev && prev.live ? { ...prev, live: false } : prev));
          }
        }
      };
      tick();
    } catch (e) {
      const name = (e as DOMException)?.name;
      setMic(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "error");
    }
  }, []);

  return { mic, reading, start };
}
