const STEP_TO_SEMITONE: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

export const pitchToMidi = (step: string, octave: number, alter = 0): number =>
  (octave + 1) * 12 + (STEP_TO_SEMITONE[step] ?? 0) + alter;
