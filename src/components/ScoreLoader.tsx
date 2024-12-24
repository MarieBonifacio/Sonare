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
    if (file) {
      console.log('Fichier détecté :', file.name);
      setFileName(file.name);

      if (file.name.endsWith('.mxl')) {
        console.log('Traitement d’un fichier .mxl');
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            console.log('Tentative de décompression du fichier .mxl...');
            const zip = await JSZip.loadAsync(e.target?.result as ArrayBuffer);
            console.log('Fichiers trouvés dans l’archive .mxl :', Object.keys(zip.files));
            console.log('Décompression réussie.');
            const musicXmlFile = Object.keys(zip.files).find((name) => name === 'score.xml');

            if (!musicXmlFile) {
              console.error('Aucun fichier score.xml trouvé dans l’archive .mxl');
              return;
            }

            console.log('Fichier MusicXML trouvé :', musicXmlFile);
            const xmlContent = await zip.files[musicXmlFile].async('string');
            if (xmlContent) {
              parseXmlContent(xmlContent); // Parse le contenu XML extrait
            } else {
              console.error('Le contenu XML est vide ou invalide.');
            }
          } catch (error) {
            console.error('Erreur lors de la décompression du fichier .mxl :', error);
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        console.log('Traitement d’un fichier .xml ou .musicxml');
        const reader = new FileReader();
        reader.onload = (e) => {
          console.log('Lecture du fichier XML brut effectuée.');
          const xmlContent = e.target?.result as string;
          if (xmlContent) {
            parseXmlContent(xmlContent);
          } else {
            console.error('Le contenu XML est vide ou invalide.');
          }
        };
        reader.readAsText(file);
      }
    } else {
      console.warn('Aucun fichier sélectionné.');
    }
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
