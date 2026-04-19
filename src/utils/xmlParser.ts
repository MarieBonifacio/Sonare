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

export const parseXmlToNotes = (xmlContent: string): Note[] => {
  if (!xmlContent.trim()) return [];
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
  if (!xmlDoc || !xmlDoc.getElementsByTagName) return [];

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

  return notes;
};
