import { describe, expect, it, vi } from 'vitest';
import { extractMxlContent, parseXmlToNotes } from './xmlParser';

// ─── extractMxlContent ────────────────────────────────────────────────────────

vi.mock('jszip', () => ({
  default: {
    loadAsync: vi.fn(),
  },
}));

describe('extractMxlContent', () => {
  it("retourne le contenu de score.xml quand il est présent dans l'archive", async () => {
    const { default: JSZip } = await import('jszip');
    (JSZip.loadAsync as ReturnType<typeof vi.fn>).mockResolvedValue({
      files: {
        'score.xml': { async: vi.fn().mockResolvedValue('<xml/>') },
      },
    });
    const result = await extractMxlContent(new ArrayBuffer(0));
    expect(result).toBe('<xml/>');
  });

  it("lance une erreur si score.xml est absent de l'archive", async () => {
    const { default: JSZip } = await import('jszip');
    (JSZip.loadAsync as ReturnType<typeof vi.fn>).mockResolvedValue({
      files: { 'autre.xml': {} },
    });
    await expect(extractMxlContent(new ArrayBuffer(0))).rejects.toThrow(
      'score.xml',
    );
  });
});

// ─── parseXmlToNotes ──────────────────────────────────────────────────────────

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

const wrapInScore = (divisions: number, ...notes: string[]) =>
  `<?xml version="1.0"?><score-partwise>
    <part><measure><attributes><divisions>${divisions}</divisions></attributes>
    ${notes.join('')}
    </measure></part>
  </score-partwise>`;

describe('parseXmlToNotes', () => {
  it('parse une note simple', () => {
    const { notes } = parseXmlToNotes(wrapInScore(1, xmlNote('C', 4, 1)));
    expect(notes).toHaveLength(1);
    expect(notes[0].pitch?.step).toBe('C');
    expect(notes[0].pitch?.octave).toBe(4);
    expect(notes[0].duration).toBe(1);
  });

  it('extrait les divisions correctement', () => {
    const { divisions } = parseXmlToNotes(wrapInScore(4, xmlNote('C', 4, 4)));
    expect(divisions).toBe(4);
  });

  it('retourne divisions=1 par défaut si absent', () => {
    const { divisions } = parseXmlToNotes(
      '<?xml version="1.0"?><score-partwise></score-partwise>',
    );
    expect(divisions).toBe(1);
  });

  it('parse alter quand présent', () => {
    const { notes } = parseXmlToNotes(wrapInScore(1, xmlNote('F', 5, 2, 1)));
    expect(notes[0].pitch?.alter).toBe(1);
  });

  it('alter vaut 0 par défaut si absent', () => {
    const { notes } = parseXmlToNotes(wrapInScore(1, xmlNote('G', 3, 4)));
    expect(notes[0].pitch?.alter).toBe(0);
  });

  it("parse plusieurs notes dans l'ordre", () => {
    const { notes } = parseXmlToNotes(
      wrapInScore(
        1,
        xmlNote('C', 4, 1),
        xmlNote('D', 4, 1),
        xmlNote('E', 4, 1),
      ),
    );
    expect(notes).toHaveLength(3);
    expect(notes.map((n) => n.pitch?.step)).toEqual(['C', 'D', 'E']);
  });

  it('ignore les éléments note sans step valide', () => {
    const { notes } = parseXmlToNotes(
      wrapInScore(1, `<note><duration>1</duration></note>`, xmlNote('C', 4, 1)),
    );
    expect(notes).toHaveLength(1);
  });

  it('retourne un tableau vide pour un document sans notes', () => {
    const { notes } = parseXmlToNotes(
      '<?xml version="1.0"?><score-partwise></score-partwise>',
    );
    expect(notes).toHaveLength(0);
  });

  it('ne plante pas sur un XML vide', () => {
    expect(() => parseXmlToNotes('')).not.toThrow();
  });
});
