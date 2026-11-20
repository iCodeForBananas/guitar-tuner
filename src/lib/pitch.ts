// Pitch detection: the McLeod Pitch Method (McLeod & Wyvill, "A Smarter Way
// to Find Pitch", 2005).
//
// A plucked string is rich in overtones, and the second harmonic is often
// louder than the fundamental. Plain autocorrelation then tends to jump an
// octave up. MPM's normalized square difference function (NSDF) fixes most
// of that: it scores every lag between -1 and 1, and we take the *first*
// peak that comes close to the best one, not simply the best one. The first
// strong peak is the true period; later ones are multiples of it.

export const MIN_FREQUENCY = 55; // a little under A1, room for a very slack low E
export const MAX_FREQUENCY = 1100; // above the 12th fret of the high E

/** Below this RMS the input is treated as silence. */
export const SILENCE_RMS = 0.008;

/** How close to the highest NSDF peak a peak must be to count as the period. */
const PEAK_THRESHOLD = 0.9;

/** Peaks below this clarity are noise, not a note. */
const MIN_CLARITY = 0.8;

export interface PitchReading {
  frequency: number;
  /** 0..1, how periodic the signal is. Above ~0.9 is a clean note. */
  clarity: number;
}

export function rms(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
  return Math.sqrt(sum / buffer.length);
}

/**
 * Finds the fundamental frequency of `buffer`, or null when it is silence or
 * not periodic enough to be a note.
 */
export function detectPitch(buffer: Float32Array, sampleRate: number): PitchReading | null {
  if (rms(buffer) < SILENCE_RMS) return null;

  const n = buffer.length;
  const minLag = Math.max(2, Math.floor(sampleRate / MAX_FREQUENCY));
  const maxLag = Math.min(n - 1, Math.ceil(sampleRate / MIN_FREQUENCY));
  if (maxLag <= minLag) return null;

  // NSDF over lags 0..maxLag (+1 so the last peak can be interpolated).
  const nsdf = new Float32Array(maxLag + 2);
  for (let lag = 0; lag < nsdf.length; lag++) {
    let acf = 0;
    let energy = 0;
    for (let i = 0; i < n - lag; i++) {
      const a = buffer[i];
      const b = buffer[i + lag];
      acf += a * b;
      energy += a * a + b * b;
    }
    nsdf[lag] = energy > 0 ? (2 * acf) / energy : 0;
  }

  // Key maxima: the highest point of each stretch where the NSDF is positive,
  // starting after it first goes negative (lag 0 is always a trivial 1).
  const peaks: number[] = [];
  let lag = 1;
  while (lag < nsdf.length && nsdf[lag] > 0) lag++;
  let best = -1;
  for (; lag < nsdf.length - 1; lag++) {
    if (nsdf[lag] > 0) {
      if (best < 0 || nsdf[lag] > nsdf[best]) best = lag;
    } else if (best >= 0) {
      peaks.push(best);
      best = -1;
    }
  }
  if (best >= 0) peaks.push(best);

  const usable = peaks.filter((p) => p >= minLag && p <= maxLag);
  if (usable.length === 0) return null;

  const highest = Math.max(...usable.map((p) => nsdf[p]));
  const chosen = usable.find((p) => nsdf[p] >= PEAK_THRESHOLD * highest)!;

  // Parabolic interpolation between samples for sub-sample precision; at
  // 82 Hz one sample of lag is ~3 cents, too coarse for a tuner.
  const y0 = nsdf[chosen - 1];
  const y1 = nsdf[chosen];
  const y2 = nsdf[chosen + 1];
  const denom = y0 - 2 * y1 + y2;
  const shift = denom !== 0 ? (0.5 * (y0 - y2)) / denom : 0;
  const period = chosen + shift;
  const clarity = Math.min(1, y1 - 0.25 * (y0 - y2) * shift);

  if (clarity < MIN_CLARITY) return null;
  const frequency = sampleRate / period;
  if (frequency < MIN_FREQUENCY || frequency > MAX_FREQUENCY) return null;
  return { frequency, clarity };
}
