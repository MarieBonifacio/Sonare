import { describe, expect, it } from 'vitest';
import {
  getRecommendedFinger,
  mapPitchToString,
  STRING_COUNT,
} from './noteMapper';

// Harpe celtique 36 cordes : C2 (index 0) → C7 (index 35).
// Formule : (octave − 2) × 7 + stepIndex + alter

describe('mapPitchToString — 36 cordes C2–C7', () => {
  it("mappe C2 à l'index 0 (corde basse)", () => {
    expect(mapPitchToString({ step: 'C', octave: 2, alter: 0 })).toBe(0);
  });

  it("mappe D2 à l'index 1", () => {
    expect(mapPitchToString({ step: 'D', octave: 2, alter: 0 })).toBe(1);
  });

  it("mappe B2 à l'index 6", () => {
    expect(mapPitchToString({ step: 'B', octave: 2, alter: 0 })).toBe(6);
  });

  it("mappe C3 à l'index 7 (début de l'octave 3)", () => {
    expect(mapPitchToString({ step: 'C', octave: 3, alter: 0 })).toBe(7);
  });

  it("mappe C4 à l'index 14", () => {
    expect(mapPitchToString({ step: 'C', octave: 4, alter: 0 })).toBe(14);
  });

  it("mappe D4 à l'index 15", () => {
    expect(mapPitchToString({ step: 'D', octave: 4, alter: 0 })).toBe(15);
  });

  it("mappe A4 (La4 diapason) à l'index 19", () => {
    // A4 = (4−2)×7 + 5 = 19
    expect(mapPitchToString({ step: 'A', octave: 4, alter: 0 })).toBe(19);
  });

  it("mappe A5 à l'index 26 (dans la plage valide)", () => {
    // A5 = (5−2)×7 + 5 = 26
    expect(mapPitchToString({ step: 'A', octave: 5, alter: 0 })).toBe(26);
  });

  it("mappe C7 à l'index 35 (corde aiguë)", () => {
    expect(mapPitchToString({ step: 'C', octave: 7, alter: 0 })).toBe(35);
  });

  it('prend en compte les dièses — C#4 → index de D4', () => {
    expect(mapPitchToString({ step: 'C', octave: 4, alter: 1 })).toBe(15);
  });

  it('prend en compte les bémols — Db4 → index de C4', () => {
    expect(mapPitchToString({ step: 'D', octave: 4, alter: -1 })).toBe(14);
  });

  it('retourne -1 pour un step inconnu', () => {
    expect(mapPitchToString({ step: 'X', octave: 4, alter: 0 })).toBe(-1);
  });

  it('retourne -1 pour D7 (hors plage haute, un demi-ton au-dessus)', () => {
    // D7 = (7−2)×7 + 1 = 36 → hors plage (>= 36)
    expect(mapPitchToString({ step: 'D', octave: 7, alter: 0 })).toBe(-1);
  });

  it('retourne -1 pour B1 (sous C2)', () => {
    // B1 = (1−2)×7 + 6 = −1 → hors plage
    expect(mapPitchToString({ step: 'B', octave: 1, alter: 0 })).toBe(-1);
  });

  it('retourne -1 pour une octave négative', () => {
    expect(mapPitchToString({ step: 'C', octave: -1, alter: 0 })).toBe(-1);
  });

  it('retourne -1 pour une octave NaN (valeur non-finie)', () => {
    expect(mapPitchToString({ step: 'C', octave: NaN, alter: 0 })).toBe(-1);
  });

  it('retourne une valeur dans [0, STRING_COUNT − 1] pour les notes valides', () => {
    const index = mapPitchToString({ step: 'G', octave: 4, alter: 0 });
    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(STRING_COUNT);
  });
});

describe('getRecommendedFinger', () => {
  it('retourne 1 (pouce) pour C et F', () => {
    expect(getRecommendedFinger('C')).toBe(1);
    expect(getRecommendedFinger('F')).toBe(1);
  });

  it('retourne 2 (index) pour D et G', () => {
    expect(getRecommendedFinger('D')).toBe(2);
    expect(getRecommendedFinger('G')).toBe(2);
  });

  it('retourne 3 (majeur) pour E et A', () => {
    expect(getRecommendedFinger('E')).toBe(3);
    expect(getRecommendedFinger('A')).toBe(3);
  });

  it('retourne 4 (annulaire) pour B', () => {
    expect(getRecommendedFinger('B')).toBe(4);
  });

  it('retourne null pour un step inconnu', () => {
    expect(getRecommendedFinger('X')).toBeNull();
    expect(getRecommendedFinger('')).toBeNull();
  });
});
