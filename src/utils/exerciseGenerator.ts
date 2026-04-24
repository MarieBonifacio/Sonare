import { Note } from 'musicxml-interfaces';

export type ExerciseType = 'gamme' | 'arpege' | 'tierces';
export type Difficulty = 'debutant' | 'intermediaire' | 'avance';
export type ScaleKey = 'C' | 'G' | 'D' | 'A' | 'F' | 'Bb';

export interface ExerciseConfig {
  type: ExerciseType;
  key: ScaleKey;
  octaves: 1 | 2;
  direction: 'montant' | 'montant-descendant';
  difficulty: Difficulty;
}

export interface GeneratedExercise {
  title: string;
  notes: Note[];
  divisions: number;
  tempo: number;
  volumes: number[];
}

type ScaleNote = { step: string; alter: number };

const NOTE_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const DIVISIONS = 4;
const DURATION = 4;
const DEFAULT_VOLUME = 0.65;

const SCALE_PATTERNS: Record<ScaleKey, ScaleNote[]> = {
  C: [
    { step: 'C', alter: 0 },
    { step: 'D', alter: 0 },
    { step: 'E', alter: 0 },
    { step: 'F', alter: 0 },
    { step: 'G', alter: 0 },
    { step: 'A', alter: 0 },
    { step: 'B', alter: 0 },
  ],
  G: [
    { step: 'G', alter: 0 },
    { step: 'A', alter: 0 },
    { step: 'B', alter: 0 },
    { step: 'C', alter: 0 },
    { step: 'D', alter: 0 },
    { step: 'E', alter: 0 },
    { step: 'F', alter: 1 },
  ],
  D: [
    { step: 'D', alter: 0 },
    { step: 'E', alter: 0 },
    { step: 'F', alter: 1 },
    { step: 'G', alter: 0 },
    { step: 'A', alter: 0 },
    { step: 'B', alter: 0 },
    { step: 'C', alter: 1 },
  ],
  A: [
    { step: 'A', alter: 0 },
    { step: 'B', alter: 0 },
    { step: 'C', alter: 1 },
    { step: 'D', alter: 0 },
    { step: 'E', alter: 0 },
    { step: 'F', alter: 1 },
    { step: 'G', alter: 1 },
  ],
  F: [
    { step: 'F', alter: 0 },
    { step: 'G', alter: 0 },
    { step: 'A', alter: 0 },
    { step: 'B', alter: -1 },
    { step: 'C', alter: 0 },
    { step: 'D', alter: 0 },
    { step: 'E', alter: 0 },
  ],
  Bb: [
    { step: 'B', alter: -1 },
    { step: 'C', alter: 0 },
    { step: 'D', alter: 0 },
    { step: 'E', alter: -1 },
    { step: 'F', alter: 0 },
    { step: 'G', alter: 0 },
    { step: 'A', alter: 0 },
  ],
};

const TEMPO_BY_DIFFICULTY: Record<Difficulty, number> = {
  debutant: 60,
  intermediaire: 80,
  avance: 100,
};

const START_OCTAVE: Record<ScaleKey, number> = {
  C: 4,
  G: 4,
  D: 4,
  A: 3,
  F: 4,
  Bb: 4,
};

function makeNote(step: string, octave: number, alter: number): Note {
  return { pitch: { step, octave, alter }, duration: DURATION };
}

function buildAscending(
  pattern: ScaleNote[],
  startOctave: number,
  numOctaves: number,
): Note[] {
  const notes: Note[] = [];
  let octave = startOctave;
  let prevIdx = NOTE_ORDER.indexOf(pattern[0].step);

  for (let oct = 0; oct < numOctaves; oct++) {
    if (oct > 0) {
      octave = startOctave + oct;
      prevIdx = NOTE_ORDER.indexOf(pattern[0].step);
    }
    for (let i = 0; i < pattern.length; i++) {
      const { step, alter } = pattern[i];
      const currIdx = NOTE_ORDER.indexOf(step);
      if (i > 0 && currIdx <= prevIdx) octave++;
      notes.push(makeNote(step, octave, alter));
      prevIdx = currIdx;
    }
  }
  // Note de complétion (tonique à l'octave supérieure)
  const { step, alter } = pattern[0];
  notes.push(makeNote(step, startOctave + numOctaves, alter));
  return notes;
}

function buildArpeggio(
  pattern: ScaleNote[],
  startOctave: number,
  numOctaves: number,
): Note[] {
  const degrees = [0, 2, 4]; // fondamentale, tierce, quinte
  const notes: Note[] = [];

  for (let oct = 0; oct < numOctaves; oct++) {
    let octave = startOctave + oct;
    let prevIdx = NOTE_ORDER.indexOf(pattern[degrees[0]].step);

    for (let di = 0; di < degrees.length; di++) {
      const { step, alter } = pattern[degrees[di]];
      const currIdx = NOTE_ORDER.indexOf(step);
      if (di > 0 && currIdx <= prevIdx) octave++;
      notes.push(makeNote(step, octave, alter));
      prevIdx = currIdx;
    }
  }
  // Note de complétion (tonique)
  const { step, alter } = pattern[0];
  notes.push(makeNote(step, startOctave + numOctaves, alter));
  return notes;
}

function buildTierces(
  pattern: ScaleNote[],
  startOctave: number,
  numOctaves: number,
): Note[] {
  // Gamme étendue pour accéder aux tierces de fin de gamme
  const fullScale = buildAscending(pattern, startOctave, numOctaves + 1);
  const notes: Note[] = [];
  const numPairs = numOctaves * 7;
  for (let i = 0; i < numPairs && i + 2 < fullScale.length; i++) {
    notes.push({ ...fullScale[i] });
    notes.push({ ...fullScale[i + 2] });
  }
  return notes;
}

const TYPE_LABELS: Record<ExerciseType, string> = {
  gamme: 'Gamme',
  arpege: 'Arpège',
  tierces: 'Tierces',
};

const DIFF_LABELS: Record<Difficulty, string> = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  avance: 'Avancé',
};

export function generateExercise(config: ExerciseConfig): GeneratedExercise {
  const pattern = SCALE_PATTERNS[config.key];
  const startOctave = START_OCTAVE[config.key];
  const tempo = TEMPO_BY_DIFFICULTY[config.difficulty];

  let ascending: Note[];
  if (config.type === 'arpege') {
    ascending = buildArpeggio(pattern, startOctave, config.octaves);
  } else if (config.type === 'tierces') {
    ascending = buildTierces(pattern, startOctave, config.octaves);
  } else {
    ascending = buildAscending(pattern, startOctave, config.octaves);
  }

  const notes =
    config.direction === 'montant-descendant'
      ? [...ascending, ...ascending.slice(1).reverse()]
      : ascending;

  const title = `${TYPE_LABELS[config.type]} de ${config.key} — ${config.octaves} oct. (${DIFF_LABELS[config.difficulty]})`;

  return {
    title,
    notes,
    divisions: DIVISIONS,
    tempo,
    volumes: new Array(notes.length).fill(DEFAULT_VOLUME) as number[],
  };
}
