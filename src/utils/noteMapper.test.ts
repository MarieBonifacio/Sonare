import { describe, expect, it } from 'vitest';
import { mapPitchToString, STRING_COUNT } from './noteMapper';

describe('mapPitchToString', () => {
  it("mappe C4 à l'index 28", () => {
    expect(mapPitchToString({ step: 'C', octave: 4, alter: 0 })).toBe(28);
  });

  it("mappe D4 à l'index 29", () => {
    expect(mapPitchToString({ step: 'D', octave: 4, alter: 0 })).toBe(29);
  });

  it("mappe B3 à l'index 27", () => {
    expect(mapPitchToString({ step: 'B', octave: 3, alter: 0 })).toBe(27);
  });

  it('prend en compte les dièses (alter = 1)', () => {
    expect(mapPitchToString({ step: 'C', octave: 4, alter: 1 })).toBe(29);
  });

  it('prend en compte les bémols (alter = -1)', () => {
    expect(mapPitchToString({ step: 'D', octave: 4, alter: -1 })).toBe(28);
  });

  it('retourne -1 pour une note invalide (step inconnu)', () => {
    expect(mapPitchToString({ step: 'X', octave: 4, alter: 0 })).toBe(-1);
  });

  it('retourne -1 pour une note hors de la plage haute', () => {
    // A5 = 5 + 5*7 = 40 → hors plage (>= 37)
    expect(mapPitchToString({ step: 'A', octave: 5, alter: 0 })).toBe(-1);
  });

  it('retourne -1 pour une octave négative', () => {
    expect(mapPitchToString({ step: 'C', octave: -1, alter: 0 })).toBe(-1);
  });

  it('retourne une valeur dans [0, STRING_COUNT - 1] pour les notes valides', () => {
    const index = mapPitchToString({ step: 'G', octave: 4, alter: 0 });
    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(STRING_COUNT);
  });

  it("mappe C0 à l'index 0 (borne basse)", () => {
    expect(mapPitchToString({ step: 'C', octave: 0, alter: 0 })).toBe(0);
  });

  it('mappe A4 (La4 diapason) correctement', () => {
    // A4 = stepIndex(5) + 4*7 = 33
    expect(mapPitchToString({ step: 'A', octave: 4, alter: 0 })).toBe(33);
  });
});
