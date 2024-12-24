import JSZip from 'jszip';
import { Note } from 'musicxml-interfaces';
import { DOMParser } from 'xmldom';
import React, { useState } from 'react';

interface ScoreLoaderProps {
  onLoad: (notes: Note[]) => void;
}

const ScoreLoader: React.FC<ScoreLoaderProps> = ({ onLoad }) => {
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.warn('Aucun fichier sélectionné.');
      return;
    }

    console.log('Fichier détecté :', file.name);
    setFileName(file.name);

    try {
      const fileContent = await readFile(file);
      const xmlContent = file.name.endsWith('.mxl') ? await extractMxlContent(fileContent) : new TextDecoder().decode(fileContent);
      parseXmlContent(xmlContent);
    } catch (error) {
      console.error('Erreur lors du traitement du fichier :', error);
    }
  };

  const readFile = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const extractMxlContent = async (fileContent: ArrayBuffer): Promise<string> => {
    console.log('Tentative de décompression du fichier .mxl...');
    const zip = await JSZip.loadAsync(fileContent);
    console.log('Fichiers trouvés dans l’archive .mxl :', Object.keys(zip.files));
    const musicXmlFile = Object.keys(zip.files).find((name) => name === 'score.xml');

    if (!musicXmlFile) {
      throw new Error('Aucun fichier score.xml trouvé dans l’archive .mxl');
    }

    console.log('Fichier MusicXML trouvé :', musicXmlFile);
    return zip.files[musicXmlFile].async('string');
  };

  const parseXmlContent = (xmlContent: string) => {
    console.log('Début du parsing du contenu XML...');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    console.log('Fichier XML parsé avec succès :', xmlDoc);

    const notes: Note[] = [];
    const noteElements = xmlDoc.getElementsByTagName('note');
    console.log(`Nombre de notes trouvées : ${noteElements.length}`);

    for (let i = 0; i < noteElements.length; i++) {
      const step = noteElements[i].getElementsByTagName('step')[0]?.textContent || '';
      const octave = parseInt(noteElements[i].getElementsByTagName('octave')[0]?.textContent || '0', 10);
      const duration = parseInt(noteElements[i].getElementsByTagName('duration')[0]?.textContent || '0', 10);
      const alterElement = noteElements[i].getElementsByTagName('alter')[0];
      const alter = alterElement ? parseInt(alterElement.textContent || '0', 10) : 0;

      console.log(`Note ${i} :`, { step, octave, alter, duration });

      if (step && !isNaN(octave)) {
        notes.push({
          pitch: {
            step,
            octave,
            alter,
          },
          duration,
          voice: 1,
          type: '',
          staff: 1,
        } as Note);
      } else {
        console.warn(`Note ${i} ignorée en raison de données invalides :`, { step, octave });
      }
    }

    console.log('Notes extraites :', notes);
    onLoad(notes);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <label htmlFor="fileInput" style={{ cursor: 'pointer', color: 'blue', textDecoration: 'underline' }}>
        {fileName ? `Chargé : ${fileName}` : 'Cliquez pour charger une partition MusicXML'}
      </label>
      <input
        type="file"
        id="fileInput"
        accept=".musicxml,.xml,.mxl"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default ScoreLoader;
