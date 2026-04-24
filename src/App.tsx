import { useCallback, useEffect, useRef, useState } from 'react';
import './styles.css';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as Tone from 'tone';
import { Note } from 'musicxml-interfaces';
import HarpModel from './components/HarpModel';
import ScoreLoader from './components/ScoreLoader';
import UIControls from './components/UIControls';

function App() {
  // État principal de la partition
  const [notes, setNotes] = useState<Note[]>([]);
  const [divisions, setDivisions] = useState(1);
  const [activeNoteIndex, setActiveNoteIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setBpm] = useState(120);

  // Refs pour éviter les problèmes de closure dans les timers
  const playbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPlayingRef = useRef(false);
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const activeNoteRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      synthRef.current?.dispose();
      if (playbackTimer.current) clearTimeout(playbackTimer.current);
    };
  }, []);

  // Scroll automatique vers la note active
  useEffect(() => {
    activeNoteRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }, [activeNoteIndex]);

  const getSynth = (): Tone.PolySynth => {
    if (!synthRef.current) {
      synthRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.02, decay: 0.5, sustain: 0.1, release: 0.8 },
      }).toDestination();
    }
    return synthRef.current;
  };

  const jouerNote = (note: Note) => {
    if (!note.pitch) return;
    const { step, octave, alter = 0 } = note.pitch;
    const alterSymbol = alter > 0 ? '#' : alter < 0 ? 'b' : '';
    const nomNote = `${step}${alterSymbol}${octave}`;
    try {
      getSynth().triggerAttackRelease(nomNote, '8n');
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
    ) => {
      if (!isPlayingRef.current || index >= partitionCourante.length) {
        isPlayingRef.current = false;
        setIsPlaying(false);
        setActiveNoteIndex(null);
        return;
      }
      setActiveNoteIndex(index);
      const note = partitionCourante[index];
      jouerNote(note);
      // Durée réelle = (divisions MusicXML / divisions par noire) * ms par noire
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
          ),
        Math.max(dureeMs, 50), // minimum 50 ms pour éviter les empilements
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handlePlay = useCallback(async () => {
    await Tone.start();
    isPlayingRef.current = true;
    setIsPlaying(true);
    jouerDepuis(0, notes, tempo, divisions);
  }, [notes, tempo, divisions, jouerDepuis]);

  const handleStop = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setActiveNoteIndex(null);
    if (playbackTimer.current) clearTimeout(playbackTimer.current);
  }, []);

  const handleScoreLoad = (loadedNotes: Note[], loadedDivisions: number) => {
    handleStop();
    setNotes(loadedNotes);
    setDivisions(loadedDivisions);
  };

  return (
    <div className='container'>
      <div className='header'>
        <ScoreLoader onLoad={handleScoreLoad} />
      </div>

      <div className='content'>
        {/* Liste des notes extraites */}
        <div className='notes-container card'>
          <h4>Notes extraites :</h4>
          <div className='notes-grid'>
            {notes.map((note, index) => (
              <div
                key={index}
                ref={activeNoteIndex === index ? activeNoteRef : null}
                className={`note-card${activeNoteIndex === index ? ' note-card--active' : ''}`}
              >
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
              </div>
            ))}
          </div>
        </div>

        {/* Harpe 3D + contrôles */}
        <div className='harp-container'>
          <UIControls
            isPlaying={isPlaying}
            tempo={tempo}
            onPlay={handlePlay}
            onStop={handleStop}
            onTempoChange={setBpm}
            disabled={notes.length === 0}
          />
          <Canvas camera={{ position: [0, 0, 20], fov: 75 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <pointLight position={[10, 10, 10]} />
            <HarpModel notes={notes} activeNoteIndex={activeNoteIndex} />
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
