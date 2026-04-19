import { describe, expect, it } from 'vitest';
import { parseXmlToNotes } from './xmlParser';

const xmlNote = (
  step: string,
  octave: number,
  duration: number,
  alter?: number,
) => `
  <note>
    <pitch>
      <step>${step}</step>
      <octave>${octave}</octave>
      ${alter !== undefined ? `<alter>${alter}</alter>` : ''}
    </pitch>
    <duration>${duration}</duration>
  </note>`;

const wrapInScore = (...notes: string[]) =>
  `<?xml version="1.0"?><score-partwise>${notes.join('')}</score-partwise>`;

describe('parseXmlToNotes', () => {
  it('parse une note simple', () => {
    const xml = wrapInScore(xmlNote('C', 4, 1));
    const notes = parseXmlToNotes(xml);
    expect(notes).toHaveLength(1);
    expect(notes[0].pitch?.step).toBe('C');
    expect(notes[0].pitch?.octave).toBe(4);
    expect(notes[0].duration).toBe(1);
  });

  it('parse alter quand présent', () => {
    const xml = wrapInScore(xmlNote('F', 5, 2, 1));
    const notes = parseXmlToNotes(xml);
    expect(notes[0].pitch?.alter).toBe(1);
  });

  it('alter vaut 0 par défaut si absent', () => {
    const xml = wrapInScore(xmlNote('G', 3, 4));
    const notes = parseXmlToNotes(xml);
    expect(notes[0].pitch?.alter).toBe(0);
  });

  it("parse plusieurs notes dans l'ordre", () => {
    const xml = wrapInScore(
      xmlNote('C', 4, 1),
      xmlNote('D', 4, 1),
      xmlNote('E', 4, 1),
    );
    const notes = parseXmlToNotes(xml);
    expect(notes).toHaveLength(3);
    expect(notes.map((n) => n.pitch?.step)).toEqual(['C', 'D', 'E']);
  });

  it('ignore les éléments note sans step valide', () => {
    const xml = wrapInScore(
      `<note><duration>1</duration></note>`,
      xmlNote('C', 4, 1),
    );
    const notes = parseXmlToNotes(xml);
    expect(notes).toHaveLength(1);
  });

  it('retourne un tableau vide pour un document sans notes', () => {
    const notes = parseXmlToNotes(
      '<?xml version="1.0"?><score-partwise></score-partwise>',
    );
    expect(notes).toHaveLength(0);
  });

  it('ne plante pas sur un XML vide', () => {
    expect(() => parseXmlToNotes('')).not.toThrow();
  });
});
