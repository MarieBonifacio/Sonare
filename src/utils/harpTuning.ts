// 36-string Celtic harp tuning — C major diatonic, C2 (bass) → C7 (treble).
//
// Conventions:
//   id          1–36, where 1 = highest pitch (C7) and 36 = lowest (C2)
//   modelIndex  0–35, where 0 = C2 (bass/long, near pillar) and 35 = C7
//               (treble/short, near fox head).  modelIndex = 36 - id.
//   color       Celtic-harp tradition: C strings are red, F strings are black.
//
// Frequencies use equal temperament (A4 = 440 Hz):
//   f = 440 × 2^((midi − 69) / 12)
//
// JSON export:
//   HARP_STRINGS_JSON is a plain array compatible with the required output format:
//   [{ "id": 1, "note": "C7", "frequency": 2093.0 }, …]

export type StringColor = 'red' | 'black' | 'natural';

export interface HarpString {
  id: number;
  note: string;
  step: string;
  octave: number;
  frequency: number;
  color: StringColor;
  modelIndex: number;
}

// NOTE_ORDER matches the diatonic harp string order within each octave.
const STEPS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;

function color(step: string): StringColor {
  if (step === 'C') return 'red';
  if (step === 'F') return 'black';
  return 'natural';
}

// Build the 36-string table: modelIndex 0 = C2, 35 = C7.
function buildStrings(): HarpString[] {
  const strings: HarpString[] = [];
  let modelIndex = 0;

  for (let octave = 2; octave <= 7; octave++) {
    const stepsInOctave = octave < 7 ? STEPS.length : 1; // C7 only
    for (let si = 0; si < stepsInOctave; si++) {
      const step = STEPS[si];
      const note = `${step}${octave}`;
      // MIDI note: C4 = 60.  C(oct) = 12*(oct+1), then add semitones.
      const semitones = [0, 2, 4, 5, 7, 9, 11];
      const midi = 12 * (octave + 1) + semitones[si];
      const frequency =
        Math.round(440 * Math.pow(2, (midi - 69) / 12) * 100) / 100;
      strings.push({
        id: 36 - modelIndex,
        note,
        step,
        octave,
        frequency,
        color: color(step),
        modelIndex,
      });
      modelIndex++;
    }
  }

  // Sort by id ascending (1 = C7 … 36 = C2) for the export view.
  return strings.sort((a, b) => a.id - b.id);
}

export const HARP_STRINGS: HarpString[] = buildStrings();

// Lookup by modelIndex (0–35) — used by HarpModel renderer.
export const HARP_STRING_BY_MODEL: HarpString[] = HARP_STRINGS.slice().sort(
  (a, b) => a.modelIndex - b.modelIndex,
);

// Plain JSON-serialisable export matching the required output format.
export const HARP_STRINGS_JSON: {
  id: number;
  note: string;
  frequency: number;
}[] = HARP_STRINGS.map(({ id, note, frequency }) => ({ id, note, frequency }));
