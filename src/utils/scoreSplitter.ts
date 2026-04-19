import { Note } from 'musicxml-interfaces';

export interface Beat {
  /** Index dans le tableau plat notes[] de la note principale (non-accord) */
  primaryIndex: number;
  /** Note principale + notes d'accord consécutives */
  notes: Note[];
}

/** Regroupe les notes plates en beats (accord = un seul beat) */
export function buildBeats(notes: Note[]): Beat[] {
  const beats: Beat[] = [];
  let i = 0;
  while (i < notes.length) {
    const note = notes[i];
    if (note.chord !== undefined) {
      // Note d'accord orpheline — l'attacher au beat précédent
      if (beats.length > 0) beats[beats.length - 1].notes.push(note);
      i++;
      continue;
    }
    const beat: Beat = { primaryIndex: i, notes: [note] };
    i++;
    while (i < notes.length && notes[i].chord !== undefined) {
      beat.notes.push(notes[i]);
      i++;
    }
    beats.push(beat);
  }
  return beats;
}

/** Découpe les beats en mesures de 4/4 */
export function splitIntoMeasures(beats: Beat[], divisions: number): Beat[][] {
  const measureDuration = 4 * divisions;
  const measures: Beat[][] = [];
  let current: Beat[] = [];
  let fill = 0;

  for (const beat of beats) {
    const dur = beat.notes[0].duration ?? divisions;
    if (fill + dur > measureDuration && current.length > 0) {
      measures.push(current);
      current = [];
      fill = 0;
    }
    fill += dur;
    current.push(beat);
  }
  if (current.length > 0) measures.push(current);
  return measures;
}
