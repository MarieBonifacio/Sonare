import { Note } from 'musicxml-interfaces';
import React, { useState } from 'react';

interface ScoreLoaderProps {
  onLoad: (notes: Note[]) => void;
}

const ScoreLoader: React.FC<ScoreLoaderProps> = ({ onLoad }) => {
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const xmlContent = e.target?.result as string;

          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

          const notes: Note[] = [];
          const noteElements = xmlDoc.getElementsByTagName('note');
          for (let i = 0; i < noteElements.length; i++) {
            const step = noteElements[i].getElementsByTagName('step')[0]?.textContent || '';
            const octave = parseInt(noteElements[i].getElementsByTagName('octave')[0]?.textContent || '0', 10);
            const duration = parseInt(noteElements[i].getElementsByTagName('duration')[0]?.textContent || '0', 10);

            if (step && !isNaN(octave)) {
              notes.push({
                pitch: {
                  step, // Exemple : "C"
                  octave, // Exemple : 4
                  alter: 0, // Par défaut, aucune altération
                },
                duration, // Durée sous forme de nombre
                voice: 1, // Valeur par défaut
                type: '', // À adapter selon les besoins
                staff: 1, // Par défaut, première portée
              } as Note);
            }
          }

          onLoad(notes);
        } catch (error) {
          console.error('Erreur lors du traitement du fichier MusicXML :', error);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <label htmlFor="fileInput" style={{ cursor: 'pointer', color: 'blue', textDecoration: 'underline' }}>
        {fileName ? `Chargé : ${fileName}` : 'Cliquez pour charger une partition MusicXML'}
      </label>
      <input
        type="file"
        id="fileInput"
        accept=".musicxml,.xml"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default ScoreLoader;
