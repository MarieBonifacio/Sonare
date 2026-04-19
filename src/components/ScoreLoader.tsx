import React, { useState } from 'react';
import { Note } from 'musicxml-interfaces';
import { Lang, T } from '../utils/i18n';
import { extractMxlContent, parseXmlToNotes } from '../utils/xmlParser';

interface ScoreLoaderProps {
  onLoad: (
    notes: Note[],
    divisions: number,
    tempo?: number,
    title?: string,
    volumes?: number[],
    filename?: string,
  ) => void;
  lang: Lang;
}

const ScoreLoader: React.FC<ScoreLoaderProps> = ({ onLoad, lang }) => {
  const tr = T[lang];
  const [fileName, setFileName] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  const lireFichier = (file: File): Promise<ArrayBuffer> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () =>
        reject(new Error('Impossible de lire le fichier.'));
      reader.readAsArrayBuffer(file);
    });

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErreur(null);
    setChargement(true);

    try {
      const buffer = await lireFichier(file);
      const xmlContent = file.name.endsWith('.mxl')
        ? await extractMxlContent(buffer)
        : new TextDecoder().decode(buffer);

      const { notes, divisions, tempo, title, volumes } =
        parseXmlToNotes(xmlContent);

      if (notes.length === 0) {
        setErreur(
          lang === 'fr'
            ? "Aucune note trouvée dans ce fichier. Vérifiez qu'il s'agit bien d'une partition MusicXML valide."
            : "No notes found in this file. Make sure it's a valid MusicXML score.",
        );
        return;
      }

      onLoad(notes, divisions, tempo, title, volumes, file.name);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : lang === 'fr'
            ? 'Erreur inconnue lors du chargement.'
            : 'Unknown error while loading.';
      setErreur(message);
    } finally {
      setChargement(false);
      event.target.value = '';
    }
  };

  return (
    <div className='score-loader'>
      <label htmlFor='fileInput' className='score-loader__label'>
        {chargement ? tr.loading : fileName ? `✓ ${fileName}` : tr.loadScore}
      </label>
      <input
        type='file'
        id='fileInput'
        accept='.musicxml,.xml,.mxl'
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
      {erreur && <p className='score-loader__erreur'>{erreur}</p>}
    </div>
  );
};

export default ScoreLoader;
