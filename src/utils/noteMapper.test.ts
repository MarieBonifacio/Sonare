import { describe, expect, it } from 'vitest';
import {
  getRecommendedFinger,
  mapPitchToString,
  STRING_COUNT,
} from './noteMapper';

describe('mapPitchToString', () => {
  it("mappe C4 à l'index 21", () => {
    // C4 = 0 + 4×7 + 0 − 7 = 21
    expect(mapPitchToString({ step: 'C', octave: 4, alter: 0 })).toBe(21);
  });

  it("mappe D4 à l'index 22", () => {
    expect(mapPitchToString({ step: 'D', octave: 4, alter: 0 })).toBe(22);
  });

  it("mappe B3 à l'index 20", () => {
    // B3 = 6 + 3×7 + 0 − 7 = 20
    expect(mapPitchToString({ step: 'B', octave: 3, alter: 0 })).toBe(20);
  });

  it('prend en compte les dièses (alter = 1)', () => {
    expect(mapPitchToString({ step: 'C', octave: 4, alter: 1 })).toBe(22);
  });

  it('prend en compte les bémols (alter = -1)', () => {
    expect(mapPitchToString({ step: 'D', octave: 4, alter: -1 })).toBe(21);
  });

  it('retourne -1 pour une note invalide (step inconnu)', () => {
    expect(mapPitchToString({ step: 'X', octave: 4, alter: 0 })).toBe(-1);
  });

  it('retourne -1 pour une note hors de la plage haute', () => {
    // A7 = 5 + 7×7 + 0 − 7 = 47 → hors plage (>= 47)
    expect(mapPitchToString({ step: 'A', octave: 7, alter: 0 })).toBe(-1);
  });

  it('retourne -1 pour une octave négative', () => {
    expect(mapPitchToString({ step: 'C', octave: -1, alter: 0 })).toBe(-1);
  });

  it('retourne une valeur dans [0, STRING_COUNT - 1] pour les notes valides', () => {
    const index = mapPitchToString({ step: 'G', octave: 4, alter: 0 });
    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(STRING_COUNT);
  });

  it("mappe C1 à l'index 0 (borne basse)", () => {
    expect(mapPitchToString({ step: 'C', octave: 1, alter: 0 })).toBe(0);
  });

  it("mappe G7 à l'index 46 (borne haute)", () => {
    // G7 = 4 + 7×7 + 0 − 7 = 46
    expect(mapPitchToString({ step: 'G', octave: 7, alter: 0 })).toBe(46);
  });

  it('mappe A4 (La4 diapason) correctement', () => {
    // A4 = 5 + 4×7 + 0 − 7 = 26
    expect(mapPitchToString({ step: 'A', octave: 4, alter: 0 })).toBe(26);
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
