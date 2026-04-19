export interface PracticeSession {
  date: string;
  correct: number;
  total: number;
}

export interface HistoryEntry {
  id: string;
  title: string;
  filename: string;
  loadedAt: string;
  playCount: number;
  lastPlayedAt?: string;
  practiceSessions?: PracticeSession[];
}

const STORAGE_KEY = 'sonare-history';
const MAX_ENTRIES = 20;

export const loadHistory = (): HistoryEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
};

const saveHistory = (entries: HistoryEntry[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

export const recordLoad = (title: string, filename: string): HistoryEntry[] => {
  const entries = loadHistory();
  const existing = entries.find((e) => e.filename === filename);
  if (existing) {
    existing.title = title || filename;
    existing.loadedAt = new Date().toISOString();
  } else {
    entries.unshift({
      id: Date.now().toString(),
      title: title || filename,
      filename,
      loadedAt: new Date().toISOString(),
      playCount: 0,
    });
  }
  const trimmed = entries.slice(0, MAX_ENTRIES);
  saveHistory(trimmed);
  return trimmed;
};

export const recordPlay = (id: string): HistoryEntry[] => {
  const entries = loadHistory();
  const entry = entries.find((e) => e.id === id);
  if (entry) {
    entry.playCount += 1;
    entry.lastPlayedAt = new Date().toISOString();
    saveHistory(entries);
  }
  return entries;
};

export const recordPractice = (
  id: string,
  correct: number,
  total: number,
): HistoryEntry[] => {
  if (total === 0) return loadHistory();
  const entries = loadHistory();
  const entry = entries.find((e) => e.id === id);
  if (entry) {
    if (!entry.practiceSessions) entry.practiceSessions = [];
    entry.practiceSessions.push({
      date: new Date().toISOString(),
      correct,
      total,
    });
    // Garder au maximum 50 sessions par entrée
    if (entry.practiceSessions.length > 50) {
      entry.practiceSessions = entry.practiceSessions.slice(-50);
    }
    saveHistory(entries);
  }
  return entries;
};

export const clearHistory = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};
