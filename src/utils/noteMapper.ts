// 36-string Celtic harp: C2 (index 0, bass) → C7 (index 35, treble).
// Diatonic C-major tuning — no sharps/flats on the instrument.
// Accidentals are rounded to the nearest diatonic neighbour via the alter offset.

export const NOTE_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
export type NoteStep = (typeof NOTE_ORDER)[number];

export const STRING_COUNT = 36;
const LOWEST_OCTAVE = 2; // C2 = modelIndex 0
const NOTES_PER_OCT = NOTE_ORDER.length; // 7

export interface Pitch {
  step: string;
  octave: number;
  alter: number;
}

/**
 * Mappe un pitch MusicXML vers l'index d'une corde (0–35).
 *
 * Formule : (octave − 2) × 7 + stepIndex + alter
 *   • index 0  = C2 (corde basse / pilier)
 *   • index 35 = C7 (corde aiguë / tête de renard)
 *
 * Retourne -1 si la note est invalide ou hors de la plage de la harpe.
 * Les altérations (alter ±1) sont traitées comme un décalage vers la corde
 * diatonique voisine (ex. C#4 → index de D4, Db4 → index de C4).
 */
export const mapPitchToString = (pitch: Pitch): number => {
  const stepIndex = NOTE_ORDER.indexOf(pitch.step as NoteStep);
  if (stepIndex === -1) return -1;
  const index =
    (pitch.octave - LOWEST_OCTAVE) * NOTES_PER_OCT + stepIndex + pitch.alter;
  return !Number.isFinite(index) || index < 0 || index >= STRING_COUNT
    ? -1
    : index;
};

/**
 * Retourne les indices (dans le tableau notes[]) de toutes les notes formant
 * l'accord à partir de baseIdx : la note de base + toutes les notes suivantes
 * marquées chord !== undefined.
 */
export const collectChordGroup = <T extends { chord?: unknown }>(
  notes: T[],
  baseIdx: number,
): number[] => {
  const result = [baseIdx];
  let i = baseIdx + 1;
  while (i < notes.length && notes[i].chord !== undefined) {
    result.push(i);
    i++;
  }
  return result;
};

/**
 * Retourne le doigt recommandé pour une note (1 = pouce … 4 = annulaire).
 * Utilisé pour l'affichage pédagogique du doigté.
 */
export const getRecommendedFinger = (step: string): number | null => {
  const map: Record<string, number> = {
    C: 1,
    D: 2,
    E: 3,
    F: 1,
    G: 2,
    A: 3,
    B: 4,
  };
  return map[step] ?? null;
};
