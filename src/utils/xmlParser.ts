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
}

export const parseXmlToNotes = (xmlContent: string): ParseResult => {
  if (!xmlContent.trim()) return { notes: [], divisions: 1 };
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
  if (!xmlDoc || !xmlDoc.getElementsByTagName)
    return { notes: [], divisions: 1 };

  // Extraire la valeur <divisions> (premier élément trouvé dans la partition)
  const divisionsEl = xmlDoc.getElementsByTagName('divisions')[0];
  const divisions = divisionsEl
    ? parseInt(divisionsEl.textContent || '1', 10)
    : 1;

  const notes: Note[] = [];
  const noteElements = xmlDoc.getElementsByTagName('note');

  for (let i = 0; i < noteElements.length; i++) {
    const step =
      noteElements[i].getElementsByTagName('step')[0]?.textContent || '';
    const octave = parseInt(
      noteElements[i].getElementsByTagName('octave')[0]?.textContent || '0',
      10,
    );
    const duration = parseInt(
      noteElements[i].getElementsByTagName('duration')[0]?.textContent || '0',
      10,
    );
    const alterElement = noteElements[i].getElementsByTagName('alter')[0];
    const alter = alterElement
      ? parseInt(alterElement.textContent || '0', 10)
      : 0;

    if (step && !isNaN(octave)) {
      notes.push({
        pitch: { step, octave, alter },
        duration,
        voice: 1,
        type: '',
        staff: 1,
      } as Note);
    }
  }

  return { notes, divisions };
};
