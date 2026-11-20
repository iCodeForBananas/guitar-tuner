// Strings, notes, and how far the string you plucked is from the one you're
// tuning.
//
// Everything is measured against the string you picked, not the nearest
// note. If you pick the low E and the string is sitting at a C, the tuner
// says "4 semitones low, tighten" rather than "C, in tune".

export interface GuitarString {
  /** 6 = low E, 1 = high E, as guitarists number them. */
  number: number;
  note: string;
  octave: number;
  frequency: number;
}

const A4 = 440;
const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];

/** MIDI note number to frequency, equal temperament, A4 = 440 Hz. */
export function midiToFrequency(midi: number): number {
  return A4 * Math.pow(2, (midi - 69) / 12);
}

function makeString(number: number, midi: number): GuitarString {
  return {
    number,
    note: NOTE_NAMES[midi % 12],
    octave: Math.floor(midi / 12) - 1,
    frequency: midiToFrequency(midi),
  };
}

/** Standard tuning, low to high: E2 A2 D3 G3 B3 E4. */
export const STANDARD_TUNING: GuitarString[] = [
  makeString(6, 40),
  makeString(5, 45),
  makeString(4, 50),
  makeString(3, 55),
  makeString(2, 59),
  makeString(1, 64),
];

/** Within this many cents of the target counts as in tune. */
export const IN_TUNE_CENTS = 5;

/** The inner, fine part of the meter covers this many cents each side. */
export const FINE_RANGE_CENTS = 50;

/** The meter's outer edge: a full octave either way. */
export const MAX_RANGE_CENTS = 1200;

export function cents(frequency: number, target: number): number {
  return 1200 * Math.log2(frequency / target);
}

/** The nearest note to a frequency, e.g. "B2". */
export function noteName(frequency: number): string {
  const midi = Math.round(69 + 12 * Math.log2(frequency / A4));
  return `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

/**
 * Cents from target, with octave mistakes folded back in.
 *
 * Pitch detectors sometimes lock onto the string's second harmonic (an
 * octave up) or, rarely, report half the frequency. Nobody tunes a guitar
 * string a whole octave away from where it belongs, so a reading more than
 * three quarters of an octave out is moved one octave toward the target.
 * A string that really is a fifth low still reads as a fifth low, and
 * plucking the low E while the high E is picked (two octaves) doesn't
 * pass for in tune.
 */
export function centsFromTarget(frequency: number, target: number): number {
  const c = cents(frequency, target);
  if (c > 900 && c < 1500) return c - 1200;
  if (c < -900 && c > -1500) return c + 1200;
  return c;
}

export type Direction = "in-tune" | "tighten" | "loosen";

export interface Guidance {
  cents: number;
  direction: Direction;
  /** Whole semitones away, rounded, for the coarse "3 semitones low" hint. */
  semitones: number;
}

export function guidance(frequency: number, target: number): Guidance {
  const c = centsFromTarget(frequency, target);
  const direction: Direction = Math.abs(c) <= IN_TUNE_CENTS ? "in-tune" : c < 0 ? "tighten" : "loosen";
  return { cents: c, direction, semitones: Math.round(Math.abs(c) / 100) };
}

/**
 * Where the needle sits on the meter, from -1 (far left, flat) to 1 (far
 * right, sharp).
 *
 * The meter has two zones. The inner 70% is linear over ±50 cents, so the
 * last stretch of fine tuning is easy to read. The outer 15% each side
 * squeezes 50 cents to a full octave, so even a badly slack string puts the
 * needle on the correct side and moves it as you turn the peg.
 */
export const FINE_ZONE = 0.7;

export function meterPosition(c: number): number {
  const a = Math.abs(c);
  const pos =
    a <= FINE_RANGE_CENTS
      ? (FINE_ZONE * a) / FINE_RANGE_CENTS
      : FINE_ZONE + (1 - FINE_ZONE) * Math.min(1, (a - FINE_RANGE_CENTS) / (MAX_RANGE_CENTS - FINE_RANGE_CENTS));
  return Math.sign(c) * pos;
}

/** The middle value; steadier than the mean when one reading jumps. */
export function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
