import { describe, expect, it } from 'vitest';
import { generateExercise } from './exerciseGenerator';

const cfg = (overrides = {}) =>
  ({
    type: 'gamme',
    key: 'C',
    octaves: 1,
    direction: 'montant',
    difficulty: 'debutant',
    ...overrides,
  }) as Parameters<typeof generateExercise>[0];

describe('gamme', () => {
  it('génère 8 notes pour C 1 octave montant', () => {
    expect(generateExercise(cfg()).notes).toHaveLength(8);
  });

  it('première note C4, dernière C5', () => {
    const { notes } = generateExercise(cfg());
    expect(notes[0].pitch).toMatchObject({ step: 'C', octave: 4 });
    expect(notes[7].pitch).toMatchObject({ step: 'C', octave: 5 });
  });

  it('15 notes pour C 1 oct montant-descendant', () => {
    const { notes } = generateExercise(
      cfg({ direction: 'montant-descendant' }),
    );
    expect(notes).toHaveLength(15); // 8 montant + 7 descendant
  });

  it('15 notes pour C 2 octaves montant (7×2+1)', () => {
    const { notes } = generateExercise(cfg({ octaves: 2 }));
    expect(notes).toHaveLength(15);
  });

  it('gamme de G — F# en 7e position', () => {
    const { notes } = generateExercise(cfg({ key: 'G' }));
    expect(notes[6].pitch).toMatchObject({ step: 'F', alter: 1 });
  });

  it('gamme de G — octave correcte : G4 A4 B4 C5 D5 E5 F#5 G5', () => {
    const { notes } = generateExercise(cfg({ key: 'G' }));
    expect(notes[0].pitch?.octave).toBe(4); // G4
    expect(notes[3].pitch?.octave).toBe(5); // C5 (wrap)
    expect(notes[7].pitch?.octave).toBe(5); // G5
  });

  it('gamme de Bb — bémols sur B et E', () => {
    const { notes } = generateExercise(cfg({ key: 'Bb' }));
    expect(notes[0].pitch).toMatchObject({ step: 'B', alter: -1 }); // Bb
    expect(notes[3].pitch).toMatchObject({ step: 'E', alter: -1 }); // Eb
  });

  it('gamme de D — F# et C# présents', () => {
    const { notes } = generateExercise(cfg({ key: 'D' }));
    expect(notes[2].pitch).toMatchObject({ step: 'F', alter: 1 }); // F#
    expect(notes[6].pitch).toMatchObject({ step: 'C', alter: 1 }); // C#
  });

  it('tempo correct selon la difficulté', () => {
    expect(generateExercise(cfg({ difficulty: 'debutant' })).tempo).toBe(60);
    expect(generateExercise(cfg({ difficulty: 'intermediaire' })).tempo).toBe(
      80,
    );
    expect(generateExercise(cfg({ difficulty: 'avance' })).tempo).toBe(100);
  });

  it('tableau volumes de même longueur que les notes', () => {
    const ex = generateExercise(cfg());
    expect(ex.volumes).toHaveLength(ex.notes.length);
  });

  it('divisions vaut 4', () => {
    expect(generateExercise(cfg()).divisions).toBe(4);
  });
});

describe('arpège', () => {
  it('4 notes pour C 1 octave : C4 E4 G4 C5', () => {
    const { notes } = generateExercise(cfg({ type: 'arpege' }));
    expect(notes).toHaveLength(4);
    expect(notes[0].pitch).toMatchObject({ step: 'C', octave: 4, alter: 0 });
    expect(notes[1].pitch).toMatchObject({ step: 'E', octave: 4, alter: 0 });
    expect(notes[2].pitch).toMatchObject({ step: 'G', octave: 4, alter: 0 });
    expect(notes[3].pitch).toMatchObject({ step: 'C', octave: 5, alter: 0 });
  });

  it('arpège de G : G4 B4 D5 G5', () => {
    const { notes } = generateExercise(cfg({ type: 'arpege', key: 'G' }));
    expect(notes[0].pitch).toMatchObject({ step: 'G', octave: 4 });
    expect(notes[1].pitch).toMatchObject({ step: 'B', octave: 4 });
    expect(notes[2].pitch).toMatchObject({ step: 'D', octave: 5 });
    expect(notes[3].pitch).toMatchObject({ step: 'G', octave: 5 });
  });

  it('arpège 2 octaves — 7 notes : C4 E4 G4 C5 E5 G5 C6', () => {
    const { notes } = generateExercise(cfg({ type: 'arpege', octaves: 2 }));
    expect(notes).toHaveLength(7);
    expect(notes[6].pitch).toMatchObject({ step: 'C', octave: 6 });
  });

  it('arpège montant-descendant', () => {
    const { notes } = generateExercise(
      cfg({ type: 'arpege', direction: 'montant-descendant' }),
    );
    expect(notes).toHaveLength(7); // 4 + 3
  });
});

describe('tierces', () => {
  it('14 notes pour C 1 octave (7 paires)', () => {
    const { notes } = generateExercise(cfg({ type: 'tierces' }));
    expect(notes).toHaveLength(14);
  });

  it('première paire : C4 - E4', () => {
    const { notes } = generateExercise(cfg({ type: 'tierces' }));
    expect(notes[0].pitch).toMatchObject({ step: 'C', octave: 4 });
    expect(notes[1].pitch).toMatchObject({ step: 'E', octave: 4 });
  });

  it("6e paire : A4 - C5 (passage d'octave)", () => {
    const { notes } = generateExercise(cfg({ type: 'tierces' }));
    expect(notes[10].pitch).toMatchObject({ step: 'A', octave: 4 });
    expect(notes[11].pitch).toMatchObject({ step: 'C', octave: 5 });
  });

  it('7e paire : B4 - D5', () => {
    const { notes } = generateExercise(cfg({ type: 'tierces' }));
    expect(notes[12].pitch).toMatchObject({ step: 'B', octave: 4 });
    expect(notes[13].pitch).toMatchObject({ step: 'D', octave: 5 });
  });

  it('28 notes pour C 2 octaves', () => {
    const { notes } = generateExercise(cfg({ type: 'tierces', octaves: 2 }));
    expect(notes).toHaveLength(28); // 14 paires × 2
  });
});

describe('titre', () => {
  it('contient le type, la tonalité et le niveau', () => {
    const { title } = generateExercise(
      cfg({ type: 'gamme', key: 'G', octaves: 2, difficulty: 'intermediaire' }),
    );
    expect(title).toContain('Gamme');
    expect(title).toContain('G');
    expect(title).toContain('2 oct');
    expect(title).toContain('Intermédiaire');
  });
});
