import React from 'react';
import { Lang, T } from '../utils/i18n';
import { HistoryEntry } from '../utils/history';

interface HistoryPanelProps {
  entries: HistoryEntry[];
  onClear: () => void;
  lang: Lang;
}

const formatDate = (iso: string, lang: Lang): string =>
  new Date(iso).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

function bestScore(entry: HistoryEntry): string | null {
  const sessions = entry.practiceSessions;
  const valid = (sessions ?? []).filter((s) => s.total > 0);
  if (valid.length === 0) return null;
  const best = Math.max(...valid.map((s) => s.correct / s.total));
  return `${Math.round(best * 100)} %`;
}

function totalPracticeNotes(entry: HistoryEntry): number {
  return (entry.practiceSessions ?? []).reduce((acc, s) => acc + s.total, 0);
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  entries,
  onClear,
  lang,
}) => {
  const tr = T[lang];

  if (entries.length === 0) {
    return (
      <div className='history-panel'>
        <p className='history-panel__empty'>{tr.noHistory}</p>
      </div>
    );
  }

  return (
    <div className='history-panel'>
      <ul className='history-list'>
        {entries.map((entry) => {
          const score = bestScore(entry);
          const practiced = totalPracticeNotes(entry);
          const playWord =
            lang === 'fr'
              ? `lecture${entry.playCount > 1 ? 's' : ''}`
              : `play${entry.playCount > 1 ? 's' : ''}`;
          return (
            <li key={entry.id} className='history-entry'>
              <span className='history-entry__title'>{entry.title}</span>
              <span className='history-entry__meta'>
                {formatDate(entry.loadedAt, lang)}
                {entry.playCount > 0 && ` · ${entry.playCount} ${playWord}`}
                {practiced > 0 && ` · ${practiced} ${tr.notesPracticed}`}
                {score && ` · ${tr.bestScore} : ${score}`}
              </span>
            </li>
          );
        })}
      </ul>
      <button className='btn-clear-history' onClick={onClear}>
        {tr.clearHistory}
      </button>
    </div>
  );
};

export default HistoryPanel;
