export const NOTE_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
export type NoteStep = (typeof NOTE_ORDER)[number];

export const STRING_COUNT = 47;

// C1 a une valeur de formule brute = 0 + 1×7 = 7 ; on soustrait cet offset
// pour que C1 → index 0 et G7 → index 46
const LOWEST_STRING_FORMULA_INDEX = 7;

export interface Pitch {
  step: string;
  octave: number;
  alter: number;
}

/**
 * Mappe un pitch MusicXML vers l'index d'une corde (0–46).
 * Plage de la harpe de concert : C1 (index 0) – G7 (index 46).
 * Retourne -1 si la note est invalide ou hors de la plage.
 */
export const mapPitchToString = (pitch: Pitch): number => {
  const stepIndex = NOTE_ORDER.indexOf(pitch.step as NoteStep);
  if (stepIndex === -1) return -1;
  const stringIndex =
    stepIndex +
    pitch.octave * NOTE_ORDER.length +
    pitch.alter -
    LOWEST_STRING_FORMULA_INDEX;
  return stringIndex < 0 || stringIndex >= STRING_COUNT ? -1 : stringIndex;
};
