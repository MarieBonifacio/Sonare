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

const DYNAMIC_LEVELS: Record<string, number> = {
  ppp: 0.1,
  pp: 0.2,
  p: 0.3,
  mp: 0.5,
  mf: 0.65,
  f: 0.8,
  ff: 0.9,
  fff: 1.0,
};

export const DEFAULT_VOLUME = 0.65;

function getDynamicLevel(directionEl: Element): number | null {
  // <sound dynamics="X"> — vélocité MIDI 0–127 convertie en 0.0–1.0
  const soundEls = directionEl.getElementsByTagName('sound');
  for (let i = 0; i < soundEls.length; i++) {
    const attr = soundEls[i].getAttribute('dynamics');
    if (attr) return Math.max(0, Math.min(1, parseFloat(attr) / 127));
  }
  // <direction-type><dynamics><mf/> etc.
  const dynEls = directionEl.getElementsByTagName('dynamics');
  if (dynEls.length > 0) {
    const dynEl = dynEls[0];
    for (const [name, level] of Object.entries(DYNAMIC_LEVELS)) {
      if (dynEl.getElementsByTagName(name).length > 0) return level;
    }
  }
  return null;
}

export interface ParseResult {
  notes: Note[];
  /** Divisions par noire (défaut 1 si absent du fichier). */
  divisions: number;
  /** Tempo extrait de &lt;sound tempo="X"&gt;, undefined si absent. */
  tempo?: number;
  /** Titre extrait de &lt;movement-title&gt; ou &lt;work-title&gt;, undefined si absent. */
  title?: string;
  /** Volume 0.0–1.0 par note, aligné sur notes[] (issu des marquages de dynamique). */
  volumes: number[];
}

export const parseXmlToNotes = (xmlContent: string): ParseResult => {
  if (!xmlContent.trim()) return { notes: [], divisions: 1, volumes: [] };
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
  if (!xmlDoc || !xmlDoc.getElementsByTagName)
    return { notes: [], divisions: 1, volumes: [] };

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
  const volumes: number[] = [];
  let currentVolume = DEFAULT_VOLUME;

  const processNoteEl = (noteEl: Element) => {
    const duration = parseInt(
      noteEl.getElementsByTagName('duration')[0]?.textContent || '0',
      10,
    );

    if (noteEl.getElementsByTagName('rest').length > 0) {
      notes.push({ rest: {}, duration, voice: 1, type: '', staff: 1 } as Note);
      volumes.push(currentVolume);
      return;
    }

    const step = noteEl.getElementsByTagName('step')[0]?.textContent || '';
    const octave = parseInt(
      noteEl.getElementsByTagName('octave')[0]?.textContent || '0',
      10,
    );
    const alterEl = noteEl.getElementsByTagName('alter')[0];
    const alter = alterEl ? parseInt(alterEl.textContent || '0', 10) : 0;
    const isChord = noteEl.getElementsByTagName('chord').length > 0;

    const tieEls = noteEl.getElementsByTagName('tie');
    let isTiedStop = false;
    for (let j = 0; j < tieEls.length; j++) {
      if (tieEls[j].getAttribute('type') === 'stop') {
        isTiedStop = true;
        break;
      }
    }

    if (step && !isNaN(octave)) {
      notes.push({
        pitch: { step, octave, alter },
        duration,
        voice: 1,
        type: '',
        staff: 1,
        ...(isChord ? { chord: {} } : {}),
        // StartStop.Stop = 1 (sans import de l'enum pour éviter XSLTProcessor en test)
        ...(isTiedStop ? { ties: [{ type: 1 }] } : {}),
      } as Note);
      volumes.push(currentVolume);
    }
  };

  // Parcourir les mesures en ordre document pour respecter les changements de dynamique
  const parts = xmlDoc.getElementsByTagName('part');
  for (let p = 0; p < parts.length; p++) {
    const measures = parts[p].getElementsByTagName('measure');
    for (let m = 0; m < measures.length; m++) {
      const measureEl = measures[m];
      for (let c = 0; c < measureEl.childNodes.length; c++) {
        const child = measureEl.childNodes[c] as Element;
        if (!child || child.nodeType !== 1) continue;
        if (child.nodeName === 'direction') {
          const level = getDynamicLevel(child);
          if (level !== null) currentVolume = level;
        } else if (child.nodeName === 'note') {
          processNoteEl(child);
        }
      }
    }
  }

  // Repli : si le XML ne suit pas la structure <part><measure> standard
  if (notes.length === 0) {
    const noteElements = xmlDoc.getElementsByTagName('note');
    for (let i = 0; i < noteElements.length; i++) {
      processNoteEl(noteElements[i]);
    }
  }

  return { notes, divisions, tempo, title, volumes };
};
