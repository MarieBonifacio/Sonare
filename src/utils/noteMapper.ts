export const NOTE_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
export type NoteStep = (typeof NOTE_ORDER)[number];

export const STRING_COUNT = 37;

export interface Pitch {
  step: string;
  octave: number;
  alter: number;
}

/**
 * Mappe un pitch MusicXML vers l'index d'une corde (0–36).
 * Formule : stepIndex + octave * 7 + alter
 * Retourne -1 si la note est invalide ou hors de la plage de la harpe.
 */
export const mapPitchToString = (pitch: Pitch): number => {
  const stepIndex = NOTE_ORDER.indexOf(pitch.step as NoteStep);
  if (stepIndex === -1) return -1;
  const stringIndex =
    stepIndex + pitch.octave * NOTE_ORDER.length + pitch.alter;
  return stringIndex < 0 || stringIndex >= STRING_COUNT ? -1 : stringIndex;
};
