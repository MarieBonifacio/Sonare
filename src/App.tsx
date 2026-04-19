import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import './styles.css';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Note } from 'musicxml-interfaces';
import HarpModel from './components/HarpModel';
import ScoreLoader from './components/ScoreLoader';
import UIControls from './components/UIControls';
import { getRecommendedFinger } from './utils/noteMapper';
import { DEFAULT_VOLUME } from './utils/xmlParser';
import HistoryPanel from './components/HistoryPanel';
import {
  HistoryEntry,
  clearHistory,
  loadHistory,
  recordLoad,
  recordPlay,
} from './utils/history';
import { useMidi } from './hooks/useMidi';
import { pitchToMidi } from './utils/midiMapper';

// Type minimal pour ne pas importer Tone.js au chargement initial
type PolySynthInstance = {
  triggerAttackRelease: (
    note: string,
    duration: string,
    velocity?: number,
  ) => void;
  dispose: () => void;
};

function App() {
  // État principal de la partition
  const [notes, setNotes] = useState<Note[]>([]);
  const [divisions, setDivisions] = useState(1);
  const [volumes, setVolumes] = useState<number[]>([]);
  const [activeNoteIndex, setActiveNoteIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [tempo, setBpm] = useState(120);
  const [title, setTitle] = useState('');
  const [showFingering, setShowFingering] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [showHistory, setShowHistory] = useState(false);
  const [midiResult, setMidiResult] = useState<'correct' | 'error' | null>(
    null,
  );
  const currentEntryIdRef = useRef<string | null>(null);

  // Refs pour éviter les problèmes de closure dans les timers
  const playbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const midiResultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPlayingRef = useRef(false);
  const loopRef = useRef(false);
  const synthRef = useRef<PolySynthInstance | null>(null);
  const activeNoteRef = useRef<HTMLDivElement | null>(null);
  const activeNoteIndexRef = useRef<number | null>(null);
  const practiceIndexRef = useRef(0);

  useEffect(() => {
    return () => {
      synthRef.current?.dispose();
      if (playbackTimer.current) clearTimeout(playbackTimer.current);
      if (midiResultTimer.current) clearTimeout(midiResultTimer.current);
    };
  }, []);

  // Garde activeNoteIndexRef synchronisé pour usage dans les callbacks stables
  useEffect(() => {
    activeNoteIndexRef.current = activeNoteIndex;
  }, [activeNoteIndex]);

  // Réinitialise le curseur de pratique quand une nouvelle partition est chargée
  useEffect(() => {
    practiceIndexRef.current = 0;
    setMidiResult(null);
  }, [notes]);

  // Scroll automatique vers la note active
  useEffect(() => {
    activeNoteRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }, [activeNoteIndex]);

  // Chargement paresseux de Tone.js : n'est importé qu'au premier clic sur Lecture
  const getSynth = async (): Promise<PolySynthInstance> => {
    if (!synthRef.current) {
      const Tone = await import('tone');
      await Tone.start();
      // Pool de 8 PluckSynth (Karplus-Strong) pour la polyphonie
      const pool = Array.from({ length: 8 }, () =>
        new Tone.PluckSynth({
          attackNoise: 1,
          dampening: 4000,
          resonance: 0.98,
        }).toDestination(),
      );
      let poolIndex = 0;
      synthRef.current = {
        triggerAttackRelease: (note, _duration, velocity) => {
          const synth = pool[poolIndex];
          poolIndex = (poolIndex + 1) % pool.length;
          synth.triggerAttackRelease(note, '8n', undefined, velocity);
        },
        dispose: () => pool.forEach((s) => s.dispose()),
      };
    }
    return synthRef.current!;
  };

  const jouerNote = async (note: Note, volume = DEFAULT_VOLUME) => {
    if (!note.pitch) return;
    const { step, octave, alter = 0 } = note.pitch;
    const alterSymbol = alter > 0 ? '#' : alter < 0 ? 'b' : '';
    const nomNote = `${step}${alterSymbol}${octave}`;
    try {
      const synth = await getSynth();
      synth.triggerAttackRelease(nomNote, '8n', volume);
    } catch {
      // Note hors de la plage du synthétiseur — ignorée silencieusement
    }
  };

  const jouerDepuis = useCallback(
    (
      index: number,
      partitionCourante: Note[],
      bpmCourant: number,
      divisionsCourantes: number,
      volumesCourants: number[],
    ) => {
      if (!isPlayingRef.current) {
        setIsPlaying(false);
        setActiveNoteIndex(null);
        return;
      }

      if (index >= partitionCourante.length) {
        if (loopRef.current) {
          // Boucle : reprendre depuis le début après une courte pause
          playbackTimer.current = setTimeout(
            () =>
              jouerDepuis(
                0,
                partitionCourante,
                bpmCourant,
                divisionsCourantes,
                volumesCourants,
              ),
            50,
          );
          return;
        }
        isPlayingRef.current = false;
        setIsPlaying(false);
        setActiveNoteIndex(null);
        return;
      }

      const note = partitionCourante[index];
      const vol = volumesCourants[index] ?? DEFAULT_VOLUME;

      // Note d'accord : jouer immédiatement sans mettre à jour l'index affiché
      if (note.chord !== undefined) {
        // StartStop.Stop = 1 (sans import de l'enum pour éviter XSLTProcessor en test)
        const isTiedStop = note.ties?.some((t) => (t.type as number) === 1);
        if (!isTiedStop) jouerNote(note, vol);
        playbackTimer.current = setTimeout(
          () =>
            jouerDepuis(
              index + 1,
              partitionCourante,
              bpmCourant,
              divisionsCourantes,
              volumesCourants,
            ),
          0,
        );
        return;
      }

      setActiveNoteIndex(index);

      const isTiedStop = note.ties?.some((t) => (t.type as number) === 1);
      if (note.rest === undefined && !isTiedStop) {
        jouerNote(note, vol);
      }

      // Durée réelle = (duration MusicXML / divisions par noire) * ms par noire
      const msParNoire = 60_000 / bpmCourant;
      const dureeMs =
        ((note.duration ?? divisionsCourantes) / divisionsCourantes) *
        msParNoire;
      playbackTimer.current = setTimeout(
        () =>
          jouerDepuis(
            index + 1,
            partitionCourante,
            bpmCourant,
            divisionsCourantes,
            volumesCourants,
          ),
        Math.max(dureeMs, 50),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handlePlay = useCallback(async () => {
    isPlayingRef.current = true;
    setIsPlaying(true);
    if (currentEntryIdRef.current) {
      setHistory(recordPlay(currentEntryIdRef.current));
    }
    jouerDepuis(0, notes, tempo, divisions, volumes);
  }, [notes, tempo, divisions, volumes, jouerDepuis]);

  const handleStop = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setActiveNoteIndex(null);
    if (playbackTimer.current) clearTimeout(playbackTimer.current);
  }, []);

  const handleLoopToggle = useCallback(() => {
    setIsLooping((prev) => {
      loopRef.current = !prev;
      return !prev;
    });
  }, []);

  const handleScoreLoad = (
    loadedNotes: Note[],
    loadedDivisions: number,
    loadedTempo?: number,
    loadedTitle?: string,
    loadedVolumes?: number[],
    filename?: string,
  ) => {
    handleStop();
    setNotes(loadedNotes);
    setDivisions(loadedDivisions);
    setVolumes(loadedVolumes ?? []);
    if (loadedTempo !== undefined) setBpm(Math.round(loadedTempo));
    setTitle(loadedTitle ?? '');
    if (filename) {
      const updated = recordLoad(loadedTitle ?? filename, filename);
      setHistory(updated);
      currentEntryIdRef.current =
        updated.find((e) => e.filename === filename)?.id ?? null;
    }
  };

  const handleClearHistory = useCallback(() => {
    clearHistory();
    setHistory([]);
  }, []);

  const showMidiResult = useCallback((result: 'correct' | 'error') => {
    setMidiResult(result);
    if (midiResultTimer.current) clearTimeout(midiResultTimer.current);
    midiResultTimer.current = setTimeout(() => setMidiResult(null), 700);
  }, []);

  const handleMidiNote = useCallback(
    (midiNote: number) => {
      if (notes.length === 0) return;

      // Pendant la lecture automatique : comparer avec la note active
      if (isPlayingRef.current) {
        const idx = activeNoteIndexRef.current;
        if (idx === null) return;
        const note = notes[idx];
        if (!note.pitch) return;
        const expected = pitchToMidi(
          note.pitch.step ?? '',
          note.pitch.octave ?? 0,
          note.pitch.alter ?? 0,
        );
        showMidiResult(midiNote === expected ? 'correct' : 'error');
        return;
      }

      // Mode pratique manuel : avancer note par note
      let idx = practiceIndexRef.current;
      // Sauter les silences et les notes d'accord
      while (
        idx < notes.length &&
        (notes[idx].rest !== undefined || notes[idx].chord !== undefined)
      ) {
        idx++;
      }
      if (idx >= notes.length) return;

      const note = notes[idx];
      if (!note.pitch) return;
      const expected = pitchToMidi(
        note.pitch.step ?? '',
        note.pitch.octave ?? 0,
        note.pitch.alter ?? 0,
      );

      setActiveNoteIndex(idx);
      if (midiNote === expected) {
        showMidiResult('correct');
        practiceIndexRef.current = idx + 1;
      } else {
        showMidiResult('error');
        practiceIndexRef.current = idx;
      }
    },
    [notes, showMidiResult],
  );

  const { status: midiStatus, deviceName: midiDeviceName } =
    useMidi(handleMidiNote);

  return (
    <div className='container'>
      <div className='header'>
        <div className='header-top'>
          {title && <h2 className='score-title'>{title}</h2>}
          <div className='header-controls'>
            <ScoreLoader onLoad={handleScoreLoad} />
            <button
              className={`btn-history${showHistory ? ' btn-history--active' : ''}`}
              onClick={() => setShowHistory((h) => !h)}
              title='Historique des partitions'
            >
              📋 Historique
            </button>
            {midiStatus === 'connected' && (
              <span className='midi-badge midi-badge--connected'>
                🎹 {midiDeviceName}
              </span>
            )}
            {midiStatus === 'disconnected' && (
              <span className='midi-badge midi-badge--disconnected'>
                🎹 Aucun appareil MIDI
              </span>
            )}
          </div>
        </div>
        {showHistory && (
          <HistoryPanel entries={history} onClear={handleClearHistory} />
        )}
      </div>

      <div className='content'>
        {/* Liste des notes extraites */}
        <div className='notes-container card'>
          <div className='notes-header'>
            <h4>Notes extraites :</h4>
            {notes.length > 0 && (
              <button
                className={`btn-fingering${showFingering ? ' btn-fingering--active' : ''}`}
                onClick={() => setShowFingering((f) => !f)}
                title={
                  showFingering ? 'Masquer le doigté' : 'Afficher le doigté'
                }
              >
                ✋ Doigté
              </button>
            )}
          </div>
          <div className='notes-grid'>
            {notes.map((note, index) => (
              <div
                key={index}
                ref={activeNoteIndex === index ? activeNoteRef : null}
                className={`note-card${activeNoteIndex === index ? ' note-card--active' : ''}${activeNoteIndex === index && midiResult === 'correct' ? ' note-card--correct' : ''}${activeNoteIndex === index && midiResult === 'error' ? ' note-card--error' : ''}`}
              >
                {note.rest !== undefined ? (
                  <>
                    <p>
                      <strong>Note :</strong> Silence
                    </p>
                    <p>
                      <strong>Durée :</strong> {note.duration}
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      <strong>Note :</strong> {note.pitch?.step}
                      {(note.pitch?.alter ?? 0) > 0
                        ? '♯'
                        : (note.pitch?.alter ?? 0) < 0
                          ? '♭'
                          : ''}
                      {note.pitch?.octave}
                    </p>
                    <p>
                      <strong>Durée :</strong> {note.duration}
                    </p>
                    {showFingering && note.pitch && (
                      <p>
                        <strong>Doigt :</strong>{' '}
                        {getRecommendedFinger(note.pitch.step ?? '') ?? '?'}
                      </p>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Harpe 3D + contrôles */}
        <div className='harp-container'>
          <UIControls
            isPlaying={isPlaying}
            isLooping={isLooping}
            tempo={tempo}
            onPlay={handlePlay}
            onStop={handleStop}
            onLoopToggle={handleLoopToggle}
            onTempoChange={setBpm}
            disabled={notes.length === 0}
            currentNoteIndex={activeNoteIndex}
            totalNotes={notes.length}
          />
          <Canvas camera={{ position: [0, 0, 20], fov: 75 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <pointLight position={[10, 10, 10]} />
            <Suspense fallback={null}>
              <HarpModel notes={notes} activeNoteIndex={activeNoteIndex} />
            </Suspense>
            <OrbitControls />
          </Canvas>
        </div>
      </div>

      <div className='footer'>
        <p>Sonare — Visualiseur de partition pour harpe</p>
      </div>
    </div>
  );
}

export default App;
