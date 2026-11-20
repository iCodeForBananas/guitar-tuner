import { describe, expect, it } from "vitest";
import {
  FINE_ZONE,
  STANDARD_TUNING,
  centsFromTarget,
  guidance,
  median,
  meterPosition,
  midiToFrequency,
  noteName,
} from "./tuning";

const [E2, A2, , , B3, E4] = STANDARD_TUNING;

describe("standard tuning", () => {
  it("is E2 A2 D3 G3 B3 E4 at the right frequencies", () => {
    expect(STANDARD_TUNING.map((s) => `${s.note}${s.octave}`)).toEqual(["E2", "A2", "D3", "G3", "B3", "E4"]);
    expect(E2.frequency).toBeCloseTo(82.41, 2);
    expect(A2.frequency).toBeCloseTo(110, 6);
    expect(E4.frequency).toBeCloseTo(329.63, 2);
    expect(STANDARD_TUNING.map((s) => s.number)).toEqual([6, 5, 4, 3, 2, 1]);
  });
});

describe("noteName", () => {
  it("names the nearest note", () => {
    expect(noteName(440)).toBe("A4");
    expect(noteName(82.41)).toBe("E2");
    expect(noteName(midiToFrequency(35))).toBe("B1");
    expect(noteName(midiToFrequency(61) * 1.01)).toBe("C♯4");
  });
});

describe("guidance", () => {
  it("is in tune within 5 cents", () => {
    expect(guidance(E2.frequency, E2.frequency).direction).toBe("in-tune");
    expect(guidance(E2.frequency * Math.pow(2, 4 / 1200), E2.frequency).direction).toBe("in-tune");
    expect(guidance(E2.frequency * Math.pow(2, -6 / 1200), E2.frequency).direction).toBe("tighten");
  });

  it("measures against the chosen string, not the nearest note", () => {
    // Tuning the high E, but the string is sitting at a B: 5 semitones low.
    const g = guidance(B3.frequency, E4.frequency);
    expect(g.direction).toBe("tighten");
    expect(g.semitones).toBe(5);
    expect(g.cents).toBeCloseTo(-500, 6);
  });

  it("says loosen when sharp", () => {
    const g = guidance(A2.frequency * Math.pow(2, 2 / 12), A2.frequency);
    expect(g.direction).toBe("loosen");
    expect(g.semitones).toBe(2);
  });
});

describe("centsFromTarget", () => {
  it("folds an octave-up misreading back onto the string", () => {
    expect(centsFromTarget(E2.frequency * 2, E2.frequency)).toBeCloseTo(0, 6);
    expect(centsFromTarget(E2.frequency * 2 * Math.pow(2, -10 / 1200), E2.frequency)).toBeCloseTo(-10, 6);
    expect(centsFromTarget(E4.frequency / 2, E4.frequency)).toBeCloseTo(0, 6);
  });

  it("doesn't pass the wrong string off as in tune two octaves away", () => {
    const g = guidance(E2.frequency, E4.frequency);
    expect(g.direction).toBe("tighten");
    expect(g.cents).toBeCloseTo(-2400, 6);
  });

  it("leaves a string that is a fifth off alone", () => {
    expect(centsFromTarget(E2.frequency * Math.pow(2, -7 / 12), E2.frequency)).toBeCloseTo(-700, 6);
  });
});

describe("meterPosition", () => {
  it("is linear in the fine zone and saturates at an octave", () => {
    expect(meterPosition(0)).toBe(0);
    expect(meterPosition(25)).toBeCloseTo(FINE_ZONE / 2, 9);
    expect(meterPosition(-50)).toBeCloseTo(-FINE_ZONE, 9);
    expect(meterPosition(1200)).toBe(1);
    expect(meterPosition(-5000)).toBe(-1);
  });

  it("keeps moving as a slack string comes up", () => {
    expect(meterPosition(-700)).toBeLessThan(meterPosition(-300));
    expect(meterPosition(-300)).toBeLessThan(meterPosition(-60));
  });
});

describe("median", () => {
  it("ignores a single outlier", () => {
    expect(median([82, 82.4, 164, 82.2, 82.1])).toBe(82.2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});
