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

const xmlRest = (duration: number) => `
  <note>
    <rest/>
    <duration>${duration}</duration>
  </note>`;

const xmlChordNote = (step: string, octave: number, duration: number) => `
  <note>
    <chord/>
    <pitch>
      <step>${step}</step>
      <octave>${octave}</octave>
    </pitch>
    <duration>${duration}</duration>
  </note>`;

const wrapInScore = (divisions: number, extra: string, ...notes: string[]) =>
  `<?xml version="1.0"?><score-partwise>
    ${extra}
    <part><measure><attributes><divisions>${divisions}</divisions></attributes>
    ${notes.join('')}
    </measure></part>
  </score-partwise>`;

const simpleScore = (divisions: number, ...notes: string[]) =>
  wrapInScore(divisions, '', ...notes);

describe('parseXmlToNotes', () => {
  it('parse une note simple', () => {
    const { notes } = parseXmlToNotes(simpleScore(1, xmlNote('C', 4, 1)));
    expect(notes).toHaveLength(1);
    expect(notes[0].pitch?.step).toBe('C');
    expect(notes[0].pitch?.octave).toBe(4);
    expect(notes[0].duration).toBe(1);
  });

  it('extrait les divisions correctement', () => {
    const { divisions } = parseXmlToNotes(simpleScore(4, xmlNote('C', 4, 4)));
    expect(divisions).toBe(4);
  });

  it('retourne divisions=1 par défaut si absent', () => {
    const { divisions } = parseXmlToNotes(
      '<?xml version="1.0"?><score-partwise></score-partwise>',
    );
    expect(divisions).toBe(1);
  });

  it('parse alter quand présent', () => {
    const { notes } = parseXmlToNotes(simpleScore(1, xmlNote('F', 5, 2, 1)));
    expect(notes[0].pitch?.alter).toBe(1);
  });

  it('alter vaut 0 par défaut si absent', () => {
    const { notes } = parseXmlToNotes(simpleScore(1, xmlNote('G', 3, 4)));
    expect(notes[0].pitch?.alter).toBe(0);
  });

  it("parse plusieurs notes dans l'ordre", () => {
    const { notes } = parseXmlToNotes(
      simpleScore(
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
      simpleScore(1, `<note><duration>1</duration></note>`, xmlNote('C', 4, 1)),
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

  // ─── Silences ────────────────────────────────────────────────────────────────

  it('parse un silence et le marque avec rest', () => {
    const { notes } = parseXmlToNotes(simpleScore(1, xmlRest(2)));
    expect(notes).toHaveLength(1);
    expect(notes[0].rest).toBeDefined();
    expect(notes[0].pitch).toBeUndefined();
    expect(notes[0].duration).toBe(2);
  });

  it('inclut les silences dans le décompte total des notes', () => {
    const { notes } = parseXmlToNotes(
      simpleScore(1, xmlNote('C', 4, 1), xmlRest(1), xmlNote('D', 4, 1)),
    );
    expect(notes).toHaveLength(3);
    expect(notes[1].rest).toBeDefined();
  });

  // ─── Accords ─────────────────────────────────────────────────────────────────

  it("parse une note d'accord et la marque avec chord", () => {
    const { notes } = parseXmlToNotes(
      simpleScore(1, xmlNote('C', 4, 1), xmlChordNote('E', 4, 1)),
    );
    expect(notes).toHaveLength(2);
    expect(notes[0].chord).toBeUndefined();
    expect(notes[1].chord).toBeDefined();
    expect(notes[1].pitch?.step).toBe('E');
  });

  // ─── Tempo ───────────────────────────────────────────────────────────────────

  it('extrait le tempo depuis <sound tempo="X">', () => {
    const xml = wrapInScore(
      1,
      '<direction><sound tempo="96"/></direction>',
      xmlNote('C', 4, 1),
    );
    const { tempo } = parseXmlToNotes(xml);
    expect(tempo).toBe(96);
  });

  it('retourne tempo=undefined si absent', () => {
    const { tempo } = parseXmlToNotes(simpleScore(1, xmlNote('C', 4, 1)));
    expect(tempo).toBeUndefined();
  });

  // ─── Titre ───────────────────────────────────────────────────────────────────

  it('extrait le titre depuis <movement-title>', () => {
    const xml = wrapInScore(
      1,
      '<movement-title>Peaceful Waters</movement-title>',
      xmlNote('C', 4, 1),
    );
    const { title } = parseXmlToNotes(xml);
    expect(title).toBe('Peaceful Waters');
  });

  it('extrait le titre depuis <work-title> si movement-title absent', () => {
    const xml = wrapInScore(
      1,
      '<work><work-title>Mon Morceau</work-title></work>',
      xmlNote('C', 4, 1),
    );
    const { title } = parseXmlToNotes(xml);
    expect(title).toBe('Mon Morceau');
  });

  it('retourne title=undefined si absent', () => {
    const { title } = parseXmlToNotes(simpleScore(1, xmlNote('C', 4, 1)));
    expect(title).toBeUndefined();
  });
});
