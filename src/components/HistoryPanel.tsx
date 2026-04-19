import React from 'react';
import { HistoryEntry } from '../utils/history';

interface HistoryPanelProps {
  entries: HistoryEntry[];
  onClear: () => void;
}

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

function bestScore(entry: HistoryEntry): string | null {
  const sessions = entry.practiceSessions;
  if (!sessions || sessions.length === 0) return null;
  const best = Math.max(...sessions.map((s) => s.correct / s.total));
  return `${Math.round(best * 100)} %`;
}

function totalPracticeNotes(entry: HistoryEntry): number {
  return (entry.practiceSessions ?? []).reduce((acc, s) => acc + s.total, 0);
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ entries, onClear }) => {
  if (entries.length === 0) {
    return (
      <div className='history-panel'>
        <p className='history-panel__empty'>
          Aucune partition chargée récemment.
        </p>
      </div>
    );
  }

  return (
    <div className='history-panel'>
      <ul className='history-list'>
        {entries.map((entry) => {
          const score = bestScore(entry);
          const practiced = totalPracticeNotes(entry);
          return (
            <li key={entry.id} className='history-entry'>
              <span className='history-entry__title'>{entry.title}</span>
              <span className='history-entry__meta'>
                {formatDate(entry.loadedAt)}
                {entry.playCount > 0 &&
                  ` · ${entry.playCount} lecture${entry.playCount > 1 ? 's' : ''}`}
                {practiced > 0 && ` · ${practiced} notes pratiquées`}
                {score && ` · meilleur score : ${score}`}
              </span>
            </li>
          );
        })}
      </ul>
      <button className='btn-clear-history' onClick={onClear}>
        Tout effacer
      </button>
    </div>
  );
};

export default HistoryPanel;
