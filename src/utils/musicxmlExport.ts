import { Note } from 'musicxml-interfaces';

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function alterToAccidental(alter: number): string {
  if (alter === 1) return '<alter>1</alter>';
  if (alter === -1) return '<alter>-1</alter>';
  return '';
}

function durationToType(duration: number, divisions: number): string {
  const ratio = duration / divisions;
  if (ratio >= 4) return 'whole';
  if (ratio >= 2) return 'half';
  if (ratio >= 1) return 'quarter';
  if (ratio >= 0.5) return 'eighth';
  return '16th';
}

function noteToXml(note: Note, divisions: number): string {
  const dur = note.duration ?? divisions;
  const type = durationToType(dur, divisions);

  if (note.rest !== undefined) {
    return `      <note><rest/><duration>${dur}</duration><type>${type}</type></note>`;
  }

  const p = note.pitch!;
  const alter = p.alter ?? 0;
  const chord = note.chord !== undefined ? '      <chord/>\n' : '';

  return (
    `${chord}      <note>\n` +
    `        <pitch><step>${p.step}</step>${alterToAccidental(alter)}<octave>${p.octave}</octave></pitch>\n` +
    `        <duration>${dur}</duration>\n` +
    `        <type>${type}</type>\n` +
    `      </note>`
  );
}

export function exportMusicXml(
  notes: Note[],
  divisions: number,
  tempo: number,
  title: string,
): string {
  const beatsPerMeasure = 4;
  const measureDuration = beatsPerMeasure * divisions;

  // Regroupe les notes en mesures
  const measures: Note[][] = [];
  let current: Note[] = [];
  let fill = 0;

  for (const note of notes) {
    const dur = note.duration ?? divisions;
    if (note.chord === undefined) {
      if (fill + dur > measureDuration && current.length > 0) {
        measures.push(current);
        current = [];
        fill = 0;
      }
      fill += dur;
    }
    current.push(note);
  }
  if (current.length > 0) measures.push(current);

  const measuresXml = measures
    .map((m, i) => {
      const attrs =
        i === 0
          ? `\n      <attributes>` +
            `\n        <divisions>${divisions}</divisions>` +
            `\n        <key><fifths>0</fifths></key>` +
            `\n        <time><beats>4</beats><beat-type>4</beat-type></time>` +
            `\n        <clef><sign>G</sign><line>2</line></clef>` +
            `\n      </attributes>` +
            `\n      <direction placement="above">` +
            `\n        <direction-type><words>${escapeXml(title)}</words></direction-type>` +
            `\n        <sound tempo="${tempo}"/>` +
            `\n      </direction>`
          : '';
      const notesXml = m.map((n) => noteToXml(n, divisions)).join('\n');
      return `    <measure number="${i + 1}">${attrs}\n${notesXml}\n    </measure>`;
    })
    .join('\n');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n` +
    `<score-partwise version="3.1">\n` +
    `  <work><work-title>${escapeXml(title)}</work-title></work>\n` +
    `  <part-list><score-part id="P1"><part-name>Harpe</part-name></score-part></part-list>\n` +
    `  <part id="P1">\n` +
    measuresXml +
    `\n  </part>\n` +
    `</score-partwise>\n`
  );
}

export function downloadMusicXml(
  notes: Note[],
  divisions: number,
  tempo: number,
  title: string,
): void {
  const xml = exportMusicXml(notes, divisions, tempo, title);
  const blob = new Blob([xml], {
    type: 'application/vnd.recordare.musicxml+xml',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'partition'}.musicxml`;
  a.click();
  URL.revokeObjectURL(url);
}
