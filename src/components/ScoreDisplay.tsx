import React, { useEffect, useRef } from 'react';
import { Note } from 'musicxml-interfaces';
import {
  Accidental,
  Formatter,
  Renderer,
  Stave,
  StaveNote,
  Voice,
} from 'vexflow';
import { buildBeats, splitIntoMeasures } from '../utils/scoreSplitter';
import { getRecommendedFinger } from '../utils/noteMapper';

interface ScoreDisplayProps {
  notes: Note[];
  activeNoteIndex: number | null;
  midiResult: 'correct' | 'error' | null;
  divisions: number;
  showFingering: boolean;
}

const FIRST_W = 340;
const MEASURE_W = 260;
const SVG_H = 160;
const STAVE_Y = 50;

function durationToVex(duration: number, divisions: number): string {
  const r = duration / divisions;
  if (r >= 4) return 'w';
  if (r >= 2) return 'h';
  if (r >= 1) return 'q';
  if (r >= 0.5) return '8';
  return '16';
}

function noteToVexKey(note: Note): { key: string; acc: string | null } {
  const step = (note.pitch?.step ?? 'B').toLowerCase();
  const octave = note.pitch?.octave ?? 4;
  const alter = note.pitch?.alter ?? 0;
  const suffix = alter > 0 ? '#' : alter < 0 ? 'b' : '';
  return { key: `${step}${suffix}/${octave}`, acc: suffix || null };
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  notes,
  activeNoteIndex,
  midiResult,
  divisions,
  showFingering,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const measureXRef = useRef<number[]>([]);
  const beatMeasureRef = useRef<number[]>([]);

  useEffect(() => {
    const div = containerRef.current;
    if (!div) return;
    div.innerHTML = '';
    measureXRef.current = [];
    beatMeasureRef.current = [];

    if (notes.length === 0) return;

    const beats = buildBeats(notes);
    const measures = splitIntoMeasures(beats, divisions);

    // Indice beat global → indice mesure (pour le scroll)
    let bi = 0;
    for (let mi = 0; mi < measures.length; mi++) {
      for (let k = 0; k < measures[mi].length; k++) {
        beatMeasureRef.current[bi++] = mi;
      }
    }

    const totalW = FIRST_W + Math.max(0, measures.length - 1) * MEASURE_W + 40;
    const renderer = new Renderer(div, Renderer.Backends.SVG);
    renderer.resize(totalW, SVG_H);
    const ctx = renderer.getContext();

    let x = 20;
    for (let mi = 0; mi < measures.length; mi++) {
      const staveW = mi === 0 ? FIRST_W : MEASURE_W;
      measureXRef.current[mi] = x;

      const stave = new Stave(x, STAVE_Y, staveW);
      if (mi === 0) stave.addClef('treble').addTimeSignature('4/4');
      stave.setContext(ctx).draw();

      const vfNotes: StaveNote[] = [];
      for (const beat of measures[mi]) {
        const primary = beat.notes[0];
        const dur = durationToVex(primary.duration ?? divisions, divisions);
        const isActive = beat.primaryIndex === activeNoteIndex;
        // Couleurs sur fond clair (score display a toujours un fond blanc/clair)
        const activeColor =
          midiResult === 'correct'
            ? '#16a34a'
            : midiResult === 'error'
              ? '#dc2626'
              : '#16a34a';

        let vn: StaveNote;
        if (primary.rest !== undefined) {
          vn = new StaveNote({ keys: ['b/4'], duration: `${dur}r` });
        } else {
          const keys: string[] = [];
          const accs: [number, string][] = [];
          for (let ki = 0; ki < beat.notes.length; ki++) {
            const { key, acc } = noteToVexKey(beat.notes[ki]);
            keys.push(key);
            if (acc) accs.push([ki, acc]);
          }
          vn = new StaveNote({ keys, duration: dur });
          for (const [ki, acc] of accs) {
            vn.addModifier(new Accidental(acc), ki);
          }
          if (showFingering && primary.pitch?.step) {
            const finger = getRecommendedFinger(primary.pitch.step);
            if (finger !== null) {
              // Annoter manuellement via style SVG (Fingering non dispo en v5)
              vn.setText(`${finger}`);
            }
          }
        }

        if (isActive) {
          vn.setStyle({ fillStyle: activeColor, strokeStyle: activeColor });
        }
        vfNotes.push(vn);
      }

      if (vfNotes.length > 0) {
        const voice = new Voice({ numBeats: 4, beatValue: 4 }).setMode(
          Voice.Mode.SOFT,
        );
        voice.addTickables(vfNotes);
        const noteW =
          stave.getX() + stave.getWidth() - stave.getNoteStartX() - 10;
        new Formatter().joinVoices([voice]).format([voice], noteW);
        voice.draw(ctx, stave);
      }

      x += staveW;
    }
  }, [notes, activeNoteIndex, midiResult, divisions, showFingering]);

  // Scroll horizontal vers la mesure active
  useEffect(() => {
    if (!scrollRef.current || activeNoteIndex === null) return;
    const beats = buildBeats(notes);
    const beatIdx = beats.findIndex((b) => b.primaryIndex === activeNoteIndex);
    if (beatIdx < 0) return;
    const measureIdx = beatMeasureRef.current[beatIdx];
    if (measureIdx === undefined) return;
    const mx = measureXRef.current[measureIdx] ?? 0;
    const cw = scrollRef.current.clientWidth;
    scrollRef.current.scrollTo({
      left: Math.max(0, mx - cw / 3),
      behavior: 'smooth',
    });
  }, [activeNoteIndex, notes]);

  return (
    <div ref={scrollRef} className='score-display-scroll'>
      <div ref={containerRef} className='score-display' />
    </div>
  );
};

export default ScoreDisplay;
