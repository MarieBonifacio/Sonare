import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import './styles.css';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Note } from 'musicxml-interfaces';
import HarpModel from './components/HarpModel';
import ScoreLoader from './components/ScoreLoader';
import UIControls from './components/UIControls';
import { collectChordGroup, getRecommendedFinger } from './utils/noteMapper';
import { DEFAULT_VOLUME } from './utils/xmlParser';
import HistoryPanel from './components/HistoryPanel';
import {
  HistoryEntry,
  clearHistory,
  loadHistory,
  recordLoad,
  recordPlay,
  recordPractice,
} from './utils/history';
import { downloadMusicXml } from './utils/musicxmlExport';
import { useMidi } from './hooks/useMidi';
import { pitchToMidi } from './utils/midiMapper';
import ExercisePanel from './components/ExercisePanel';
import LlmPanel from './components/LlmPanel';
import { GeneratedExercise } from './utils/exerciseGenerator';
import { Lang, STEP_FR, T } from './utils/i18n';
import { HARP_STRING_BY_MODEL } from './utils/harpTuning';

const HARP_BASE_URL =
  'https://gleitz.github.io/midi-js-soundfonts/MusyngKite/orchestral_harp-mp3/';
const HARP_URLS: Record<string, string> = {
  A0: 'A0.mp3',
  C1: 'C1.mp3',
  'D#1': 'Ds1.mp3',
  'F#1': 'Fs1.mp3',
  A1: 'A1.mp3',
  C2: 'C2.mp3',
  'D#2': 'Ds2.mp3',
  'F#2': 'Fs2.mp3',
  A2: 'A2.mp3',
  C3: 'C3.mp3',
  'D#3': 'Ds3.mp3',
  'F#3': 'Fs3.mp3',
  A3: 'A3.mp3',
  C4: 'C4.mp3',
  'D#4': 'Ds4.mp3',
  'F#4': 'Fs4.mp3',
  A4: 'A4.mp3',
  C5: 'C5.mp3',
  'D#5': 'Ds5.mp3',
  'F#5': 'Fs5.mp3',
  A5: 'A5.mp3',
  C6: 'C6.mp3',
  'D#6': 'Ds6.mp3',
  'F#6': 'Fs6.mp3',
  A6: 'A6.mp3',
  C7: 'C7.mp3',
};

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
  const [activeNoteIndices, setActiveNoteIndices] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [tempo, setBpm] = useState(120);
  const [title, setTitle] = useState('');
  const [showFingering, setShowFingering] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [showHistory, setShowHistory] = useState(false);
  const [showExercises, setShowExercises] = useState(false);
  const [showLlm, setShowLlm] = useState(false);
  const [midiResult, setMidiResult] = useState<'correct' | 'error' | null>(
    null,
  );
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem('sonare-lang');
    return saved === 'en' ? 'en' : 'fr';
  });
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('sonare-theme');
    return saved === 'light' ? 'light' : 'dark';
  });
  const currentEntryIdRef = useRef<string | null>(null);
  const practiceCorrectRef = useRef(0);
  const practiceTotalRef = useRef(0);

  // Refs pour éviter les problèmes de closure dans les timers
  const playbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const midiResultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPlayingRef = useRef(false);
  const loopRef = useRef(false);
  const synthRef = useRef<PolySynthInstance | null>(null);
  const activeNoteIndexRef = useRef<number | null>(null);
  const activeNoteRef = useRef<HTMLDivElement | null>(null);
  const practiceIndexRef = useRef(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sonare-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('sonare-lang', lang);
  }, [lang]);

  useEffect(() => {
    return () => {
      synthRef.current?.dispose();
      if (playbackTimer.current) clearTimeout(playbackTimer.current);
      if (midiResultTimer.current) clearTimeout(midiResultTimer.current);
    };
  }, []);

  // Garde activeNoteIndexRef synchronisé (premier index de l'accord) pour MIDI
  useEffect(() => {
    activeNoteIndexRef.current = activeNoteIndices[0] ?? null;
  }, [activeNoteIndices]);

  // Réinitialise le curseur de pratique quand une nouvelle partition est chargée
  useEffect(() => {
    if (currentEntryIdRef.current && practiceTotalRef.current > 0) {
      setHistory(
        recordPractice(
          currentEntryIdRef.current,
          practiceCorrectRef.current,
          practiceTotalRef.current,
        ),
      );
    }
    practiceIndexRef.current = 0;
    practiceCorrectRef.current = 0;
    practiceTotalRef.current = 0;
    setMidiResult(null);
  }, [notes]);

  // Scroll automatique vers la note active (première note de l'accord)
  useEffect(() => {
    activeNoteRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }, [activeNoteIndices]);

  // Chargement paresseux de Tone.js + échantillons harpe (fallback PluckSynth si hors-ligne)
  const getSynth = async (): Promise<PolySynthInstance> => {
    if (!synthRef.current) {
      const Tone = await import('tone');
      await Tone.start();

      // Réverbération naturelle (salle légère) — commune à tous les synthés
      const reverb = new Tone.Reverb({
        decay: 2.2,
        wet: 0.28,
        preDelay: 0.01,
      }).toDestination();
      await reverb.generate();

      // Filtre passe-bas pour adoucir la brillance excessive
      const warmth = new Tone.Filter({
        frequency: 3800,
        type: 'lowpass',
        rolloff: -12,
      }).connect(reverb);

      // PluckSynth pool — actif immédiatement en fallback si le Sampler n'est pas prêt
      // attackNoise 0.3 (vs 1) : attaque douce, sans cliquetis
      // dampening 2600 (vs 4000) : timbre plus chaud, moins métallique
      // resonance 0.93 (vs 0.98) : decay naturel, sans bourdonnement
      const pool = Array.from({ length: 8 }, () =>
        new Tone.PluckSynth({
          attackNoise: 0.3,
          dampening: 2600,
          resonance: 0.93,
        }).connect(warmth),
      );
      let poolIndex = 0;
      const samplerReady = { value: false };

      // Sampler avec échantillons harpe orchestrale réels — chargés en arrière-plan
      const sampler = new Tone.Sampler({
        urls: HARP_URLS,
        baseUrl: HARP_BASE_URL,
        onload: () => {
          samplerReady.value = true;
        },
      }).connect(warmth);

      synthRef.current = {
        triggerAttackRelease: (note, _duration, velocity) => {
          if (samplerReady.value) {
            sampler.triggerAttackRelease(note, '2n', undefined, velocity);
          } else {
            const synth = pool[poolIndex];
            poolIndex = (poolIndex + 1) % pool.length;
            synth.triggerAttackRelease(note, '4n', undefined, velocity);
          }
        },
        dispose: () => {
          sampler.dispose();
          pool.forEach((s) => s.dispose());
          warmth.dispose();
          reverb.dispose();
        },
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
        setActiveNoteIndices([]);
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
        setActiveNoteIndices([]);
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

      setActiveNoteIndices(collectChordGroup(partitionCourante, index));

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
    setActiveNoteIndices([]);
    if (playbackTimer.current) clearTimeout(playbackTimer.current);
  }, []);

  const handleNoteClick = useCallback(
    (index: number) => {
      if (playbackTimer.current) clearTimeout(playbackTimer.current);
      isPlayingRef.current = true;
      setIsPlaying(true);
      jouerDepuis(index, notes, tempo, divisions, volumes);
    },
    [notes, tempo, divisions, volumes, jouerDepuis],
  );

  const handleLoopToggle = useCallback(() => {
    setIsLooping((prev) => {
      loopRef.current = !prev;
      return !prev;
    });
  }, []);

  // Clic sur une corde de la harpe 3D → joue la note correspondante directement
  const handleStringClick = useCallback(async (stringIndex: number) => {
    const s = HARP_STRING_BY_MODEL[stringIndex];
    if (!s) return;
    const synth = await getSynth();
    synth.triggerAttackRelease(`${s.step}${s.octave}`, '2n', 0.8);
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

  const handleExerciseGenerate = useCallback(
    (exercise: GeneratedExercise) => {
      handleStop();
      setNotes(exercise.notes);
      setDivisions(exercise.divisions);
      setVolumes(exercise.volumes);
      setBpm(exercise.tempo);
      setTitle(exercise.title);
      setShowExercises(false);
    },
    [handleStop],
  );

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

      setActiveNoteIndices([idx]);
      practiceTotalRef.current += 1;
      if (midiNote === expected) {
        practiceCorrectRef.current += 1;
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

  const tr = T[lang];

  return (
    <div className='container'>
      <div className='header'>
        <div className='header-top'>
          {title && <h2 className='score-title'>{title}</h2>}
          <div className='header-controls'>
            <ScoreLoader onLoad={handleScoreLoad} lang={lang} />
            <button
              className={`btn-history${showHistory ? ' btn-history--active' : ''}`}
              onClick={() => setShowHistory((h) => !h)}
              title={tr.history}
            >
              📋 {tr.history}
            </button>
            <button
              className={`btn-history${showExercises ? ' btn-history--active' : ''}`}
              onClick={() => setShowExercises((e) => !e)}
              title={tr.exercises}
            >
              🎯 {tr.exercises}
            </button>
            <button
              className={`btn-history${showLlm ? ' btn-history--active' : ''}`}
              onClick={() => setShowLlm((l) => !l)}
              title={tr.llmTitle}
            >
              {tr.llmBtn}
            </button>
            {midiStatus === 'connected' && (
              <span className='midi-badge midi-badge--connected'>
                🎹 {midiDeviceName}
              </span>
            )}
            {midiStatus === 'disconnected' && (
              <span className='midi-badge midi-badge--disconnected'>
                🎹 {tr.noMidi}
              </span>
            )}
            <button
              className='btn-lang'
              onClick={() => setLang((l) => (l === 'fr' ? 'en' : 'fr'))}
              title={tr.otherLang}
            >
              {tr.otherLang}
            </button>
            <button
              className='btn-theme'
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              title={theme === 'dark' ? tr.themeLight : tr.themeDark}
            >
              {theme === 'dark' ? '☀' : '◑'}
            </button>
          </div>
        </div>
        {showHistory && (
          <HistoryPanel
            entries={history}
            onClear={handleClearHistory}
            lang={lang}
          />
        )}
        {showExercises && (
          <ExercisePanel onGenerate={handleExerciseGenerate} lang={lang} />
        )}
        {showLlm && (
          <LlmPanel onGenerate={handleExerciseGenerate} lang={lang} />
        )}
      </div>

      <div className='content'>
        {/* Partition — affichage portée musicale */}
        <div className='notes-container card'>
          <div className='notes-header'>
            <h4>{tr.extractedNotes}</h4>
            {notes.length > 0 && (
              <button
                className={`btn-fingering${showFingering ? ' btn-fingering--active' : ''}`}
                onClick={() => setShowFingering((f) => !f)}
                title={showFingering ? tr.hideFingering : tr.showFingering}
              >
                {tr.fingeringBtn}
              </button>
            )}
          </div>
          <div className='notes-grid'>
            {notes.map((note, index) => (
              <div
                key={index}
                ref={activeNoteIndices[0] === index ? activeNoteRef : null}
                className={`note-card${activeNoteIndices.includes(index) ? ' note-card--active' : ''}${activeNoteIndices[0] === index && midiResult === 'correct' ? ' note-card--correct' : ''}${activeNoteIndices[0] === index && midiResult === 'error' ? ' note-card--error' : ''}`}
                onClick={() => handleNoteClick(index)}
                style={{ cursor: 'pointer' }}
              >
                {note.rest !== undefined ? (
                  <>
                    <p>
                      <strong>{tr.noteLabel} :</strong> {tr.rest}
                    </p>
                    <p>
                      <strong>{tr.durationLabel} :</strong> {note.duration}
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      <strong>{tr.noteLabel} :</strong>{' '}
                      {lang === 'fr'
                        ? (STEP_FR[note.pitch?.step ?? ''] ?? note.pitch?.step)
                        : note.pitch?.step}
                      {(note.pitch?.alter ?? 0) > 0
                        ? '♯'
                        : (note.pitch?.alter ?? 0) < 0
                          ? '♭'
                          : ''}
                      {note.pitch?.octave}
                    </p>
                    <p>
                      <strong>{tr.durationLabel} :</strong> {note.duration}
                    </p>
                    {showFingering && note.pitch && (
                      <p>
                        <strong>{tr.fingerLabel} :</strong>{' '}
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
            onSeek={handleNoteClick}
            disabled={notes.length === 0}
            currentNoteIndex={activeNoteIndices[0] ?? null}
            totalNotes={notes.length}
            lang={lang}
          />
          {notes.length > 0 && (
            <button
              className='btn-export'
              onClick={() =>
                downloadMusicXml(notes, divisions, tempo, title || 'partition')
              }
              title={tr.exportXml}
            >
              {tr.exportXml}
            </button>
          )}
          <Canvas camera={{ position: [0, 0, 20], fov: 75 }}>
            <ambientLight intensity={0.9} />
            <directionalLight position={[8, 10, 6]} intensity={1.2} />
            <directionalLight
              position={[-4, 2, 8]}
              intensity={0.6}
              color='#BBBBFF'
            />
            <Suspense fallback={null}>
              <HarpModel
                notes={notes}
                activeNoteIndices={activeNoteIndices}
                onStringClick={handleStringClick}
              />
            </Suspense>
            <OrbitControls />
          </Canvas>
        </div>
      </div>

      <div className='footer'>
        <p>{tr.footer}</p>
      </div>
    </div>
  );
}

export default App;
