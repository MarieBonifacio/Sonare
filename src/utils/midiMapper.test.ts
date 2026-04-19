import { describe, expect, it } from 'vitest';
import { pitchToMidi } from './midiMapper';

describe('pitchToMidi', () => {
  it('convertit C4 en 60 (do central)', () => {
    expect(pitchToMidi('C', 4)).toBe(60);
  });

  it('convertit A4 en 69 (diapason standard)', () => {
    expect(pitchToMidi('A', 4)).toBe(69);
  });

  it('convertit D4 en 62', () => {
    expect(pitchToMidi('D', 4)).toBe(62);
  });

  it('convertit C#4 en 61', () => {
    expect(pitchToMidi('C', 4, 1)).toBe(61);
  });

  it('convertit Bb3 en 58', () => {
    expect(pitchToMidi('B', 3, -1)).toBe(58);
  });

  it('convertit C1 en 24 (corde grave de harpe)', () => {
    expect(pitchToMidi('C', 1)).toBe(24);
  });

  it('convertit G7 en 103 (corde aiguë de harpe)', () => {
    expect(pitchToMidi('G', 7)).toBe(103);
  });

  it('step inconnu retourne le semitone 0 (do)', () => {
    expect(pitchToMidi('X', 4)).toBe(60);
  });

  it('les équivalents enharmoniques donnent le même numéro MIDI', () => {
    expect(pitchToMidi('C', 4, 1)).toBe(pitchToMidi('D', 4, -1));
  });
});
