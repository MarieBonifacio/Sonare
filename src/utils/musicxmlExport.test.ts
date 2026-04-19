import { describe, expect, it } from 'vitest';
import { exportMusicXml } from './musicxmlExport';
import { Note } from 'musicxml-interfaces';

type Step = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';

function makeNote(step: string, octave: number, duration = 4, alter = 0): Note {
  return {
    pitch: { step: step as Step, octave, alter },
    duration,
  } as Note;
}

function makeRest(duration = 4): Note {
  return { rest: {}, duration } as Note;
}

describe('exportMusicXml', () => {
  it('produit un document XML valide avec la déclaration et le DOCTYPE', () => {
    const xml = exportMusicXml([makeNote('C', 4)], 4, 120, 'Test');
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('score-partwise');
  });

  it('inclut le titre dans work-title', () => {
    const xml = exportMusicXml([makeNote('C', 4)], 4, 120, 'Ma gamme');
    expect(xml).toContain('<work-title>Ma gamme</work-title>');
  });

  it('inclut le tempo dans sound', () => {
    const xml = exportMusicXml([makeNote('C', 4)], 4, 80, 'Test');
    expect(xml).toContain('tempo="80"');
  });

  it('encode correctement une note C4', () => {
    const xml = exportMusicXml([makeNote('C', 4)], 4, 120, 'T');
    expect(xml).toContain('<step>C</step>');
    expect(xml).toContain('<octave>4</octave>');
    expect(xml).toContain('<duration>4</duration>');
  });

  it('encode un dièse (alter=1)', () => {
    const xml = exportMusicXml([makeNote('F', 5, 4, 1)], 4, 120, 'T');
    expect(xml).toContain('<alter>1</alter>');
  });

  it('encode un bémol (alter=-1)', () => {
    const xml = exportMusicXml([makeNote('B', 4, 4, -1)], 4, 120, 'T');
    expect(xml).toContain('<alter>-1</alter>');
  });

  it('encode un silence avec <rest/>', () => {
    const xml = exportMusicXml([makeRest()], 4, 120, 'T');
    expect(xml).toContain('<rest/>');
  });

  it('produit plusieurs mesures pour une longue partition', () => {
    // 4 noires par mesure (divisions=4), 8 noires = 2 mesures
    const notes = Array.from({ length: 8 }, () => makeNote('C', 4, 4));
    const xml = exportMusicXml(notes, 4, 120, 'T');
    expect(xml).toContain('measure number="1"');
    expect(xml).toContain('measure number="2"');
  });

  it('inclut les divisions dans la première mesure seulement', () => {
    const notes = Array.from({ length: 8 }, () => makeNote('C', 4, 4));
    const xml = exportMusicXml(notes, 4, 120, 'T');
    const count = (xml.match(/<divisions>/g) ?? []).length;
    expect(count).toBe(1);
  });

  it('type "whole" pour une ronde (duration = 4 × divisions)', () => {
    const xml = exportMusicXml([makeNote('C', 4, 16)], 4, 120, 'T');
    expect(xml).toContain('<type>whole</type>');
  });

  it('type "eighth" pour une croche (duration = divisions / 2)', () => {
    const xml = exportMusicXml([makeNote('C', 4, 2)], 4, 120, 'T');
    expect(xml).toContain('<type>eighth</type>');
  });
});
