import { describe, expect, it } from "vitest";
import { detectPitch } from "./pitch";
import { STANDARD_TUNING, cents } from "./tuning";

const SAMPLE_RATE = 48000;
const SIZE = 4096;

/**
 * A plucked-string-like tone: a fundamental plus overtones, with the second
 * harmonic louder than the fundamental, which is what trips up naive
 * detectors on a real guitar.
 */
function pluck(frequency: number, harmonics = [0.6, 1, 0.5, 0.35, 0.2, 0.1], amplitude = 0.3) {
  const buf = new Float32Array(SIZE);
  for (let i = 0; i < SIZE; i++) {
    const t = i / SAMPLE_RATE;
    let v = 0;
    harmonics.forEach((h, k) => (v += h * Math.sin(2 * Math.PI * frequency * (k + 1) * t + k)));
    buf[i] = amplitude * v * Math.exp(-t * 2);
  }
  return buf;
}

function seededNoise(amplitude: number) {
  let s = 12345;
  const buf = new Float32Array(SIZE);
  for (let i = 0; i < SIZE; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    buf[i] = amplitude * ((s / 0x7fffffff) * 2 - 1);
  }
  return buf;
}

describe("detectPitch", () => {
  it.each(STANDARD_TUNING.map((s) => [`${s.note}${s.octave}`, s.frequency] as const))(
    "finds %s within a cent, despite a loud second harmonic",
    (_, f) => {
      const r = detectPitch(pluck(f), SAMPLE_RATE);
      expect(r).not.toBeNull();
      expect(Math.abs(cents(r!.frequency, f))).toBeLessThan(1);
    },
  );

  it("reads a string a few cents off as a few cents off", () => {
    const e2 = STANDARD_TUNING[0].frequency;
    const flat = e2 * Math.pow(2, -12 / 1200);
    const r = detectPitch(pluck(flat), SAMPLE_RATE)!;
    expect(cents(r.frequency, e2)).toBeCloseTo(-12, 0);
  });

  it("follows a slack low string well below E2", () => {
    const b1 = 61.74;
    const r = detectPitch(pluck(b1), SAMPLE_RATE)!;
    expect(Math.abs(cents(r.frequency, b1))).toBeLessThan(1);
  });

  it("works at 44.1 kHz too", () => {
    const a2 = STANDARD_TUNING[1].frequency;
    const buf = new Float32Array(SIZE);
    for (let i = 0; i < SIZE; i++) buf[i] = 0.3 * Math.sin((2 * Math.PI * a2 * i) / 44100);
    const r = detectPitch(buf, 44100)!;
    expect(Math.abs(cents(r.frequency, a2))).toBeLessThan(1);
  });

  it("returns null for silence", () => {
    expect(detectPitch(new Float32Array(SIZE), SAMPLE_RATE)).toBeNull();
    expect(detectPitch(seededNoise(0.001), SAMPLE_RATE)).toBeNull();
  });

  it("returns null for loud noise", () => {
    expect(detectPitch(seededNoise(0.5), SAMPLE_RATE)).toBeNull();
  });
});
