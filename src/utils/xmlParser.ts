import JSZip from 'jszip';
import { Note } from 'musicxml-interfaces';
import { DOMParser } from 'xmldom';

export const extractMxlContent = async (
  fileContent: ArrayBuffer,
): Promise<string> => {
  const zip = await JSZip.loadAsync(fileContent);
  const musicXmlFile = Object.keys(zip.files).find(
    (name) => name === 'score.xml',
  );
  if (!musicXmlFile) {
    throw new Error("Aucun fichier score.xml trouvé dans l'archive .mxl");
  }
  return zip.files[musicXmlFile].async('string');
};

export interface ParseResult {
  notes: Note[];
  /** Divisions par noire (défaut 1 si absent du fichier). */
  divisions: number;
  /** Tempo extrait de &lt;sound tempo="X"&gt;, undefined si absent. */
  tempo?: number;
  /** Titre extrait de &lt;movement-title&gt; ou &lt;work-title&gt;, undefined si absent. */
  title?: string;
}

export const parseXmlToNotes = (xmlContent: string): ParseResult => {
  if (!xmlContent.trim()) return { notes: [], divisions: 1 };
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
  if (!xmlDoc || !xmlDoc.getElementsByTagName)
    return { notes: [], divisions: 1 };

  // Extraire la valeur <divisions>
  const divisionsEl = xmlDoc.getElementsByTagName('divisions')[0];
  const divisions = divisionsEl
    ? parseInt(divisionsEl.textContent || '1', 10)
    : 1;

  // Extraire le tempo depuis <sound tempo="X">
  let tempo: number | undefined;
  const soundElements = xmlDoc.getElementsByTagName('sound');
  for (let i = 0; i < soundElements.length; i++) {
    const tempoAttr = soundElements[i].getAttribute('tempo');
    if (tempoAttr) {
      tempo = parseFloat(tempoAttr);
      break;
    }
  }

  // Extraire le titre depuis <movement-title> ou <work-title>
  const movementTitleEl = xmlDoc.getElementsByTagName('movement-title')[0];
  const workTitleEl = xmlDoc.getElementsByTagName('work-title')[0];
  const rawTitle =
    movementTitleEl?.textContent || workTitleEl?.textContent || undefined;
  const title = rawTitle?.trim() || undefined;

  const notes: Note[] = [];
  const noteElements = xmlDoc.getElementsByTagName('note');

  for (let i = 0; i < noteElements.length; i++) {
    const noteEl = noteElements[i];
    const duration = parseInt(
      noteEl.getElementsByTagName('duration')[0]?.textContent || '0',
      10,
    );

    // Silence : présence de <rest/>
    if (noteEl.getElementsByTagName('rest').length > 0) {
      notes.push({
        rest: {},
        duration,
        voice: 1,
        type: '',
        staff: 1,
      } as Note);
      continue;
    }

    const step = noteEl.getElementsByTagName('step')[0]?.textContent || '';
    const octave = parseInt(
      noteEl.getElementsByTagName('octave')[0]?.textContent || '0',
      10,
    );
    const alterElement = noteEl.getElementsByTagName('alter')[0];
    const alter = alterElement
      ? parseInt(alterElement.textContent || '0', 10)
      : 0;

    // Accord : présence de <chord/>
    const isChord = noteEl.getElementsByTagName('chord').length > 0;

    if (step && !isNaN(octave)) {
      notes.push({
        pitch: { step, octave, alter },
        duration,
        voice: 1,
        type: '',
        staff: 1,
        ...(isChord ? { chord: {} } : {}),
      } as Note);
    }
  }

  return { notes, divisions, tempo, title };
};
