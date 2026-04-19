import { beforeEach, describe, expect, it } from 'vitest';
import { clearHistory, loadHistory, recordLoad, recordPlay } from './history';

describe('history', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadHistory retourne [] si localStorage est vide', () => {
    expect(loadHistory()).toEqual([]);
  });

  it('recordLoad ajoute une nouvelle entrée', () => {
    const entries = recordLoad('Ma Partition', 'score.xml');
    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe('Ma Partition');
    expect(entries[0].filename).toBe('score.xml');
    expect(entries[0].playCount).toBe(0);
  });

  it('recordLoad utilise le filename comme titre si title est vide', () => {
    const entries = recordLoad('', 'score.xml');
    expect(entries[0].title).toBe('score.xml');
  });

  it('recordLoad met à jour une entrée existante (même filename)', () => {
    recordLoad('Titre 1', 'score.xml');
    const entries = recordLoad('Titre 2', 'score.xml');
    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe('Titre 2');
  });

  it('recordLoad place les nouvelles entrées en tête', () => {
    recordLoad('Partition A', 'a.xml');
    const entries = recordLoad('Partition B', 'b.xml');
    expect(entries[0].filename).toBe('b.xml');
    expect(entries[1].filename).toBe('a.xml');
  });

  it('recordPlay incrémente le playCount', () => {
    const loaded = recordLoad('Ma Partition', 'score.xml');
    const { id } = loaded[0];
    const updated = recordPlay(id);
    expect(updated.find((e) => e.id === id)!.playCount).toBe(1);
  });

  it('recordPlay définit lastPlayedAt', () => {
    const loaded = recordLoad('Ma Partition', 'score.xml');
    const { id } = loaded[0];
    const updated = recordPlay(id);
    expect(updated.find((e) => e.id === id)!.lastPlayedAt).toBeDefined();
  });

  it('recordPlay est sans effet pour un id inconnu', () => {
    recordLoad('Ma Partition', 'score.xml');
    expect(() => recordPlay('id-inconnu')).not.toThrow();
  });

  it('clearHistory vide le stockage', () => {
    recordLoad('Ma Partition', 'score.xml');
    clearHistory();
    expect(loadHistory()).toEqual([]);
  });

  it('limite à 20 entrées maximum', () => {
    for (let i = 0; i < 25; i++) {
      recordLoad(`Partition ${i}`, `score${i}.xml`);
    }
    expect(loadHistory().length).toBeLessThanOrEqual(20);
  });

  it('loadHistory résiste à un JSON corrompu dans localStorage', () => {
    localStorage.setItem('sonare-history', 'invalide{{{');
    expect(loadHistory()).toEqual([]);
  });
});
