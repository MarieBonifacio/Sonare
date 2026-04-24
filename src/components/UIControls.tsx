import React from 'react';
import { Lang, T } from '../utils/i18n';

interface UIControlsProps {
  isPlaying: boolean;
  isLooping: boolean;
  tempo: number;
  onPlay: () => void;
  onStop: () => void;
  onLoopToggle: () => void;
  onTempoChange: (bpm: number) => void;
  onSeek: (index: number) => void;
  disabled: boolean;
  currentNoteIndex: number | null;
  totalNotes: number;
  lang: Lang;
}

const UIControls: React.FC<UIControlsProps> = ({
  isPlaying,
  isLooping,
  tempo,
  onPlay,
  onStop,
  onLoopToggle,
  onTempoChange,
  onSeek,
  disabled,
  currentNoteIndex,
  totalNotes,
  lang,
}) => {
  const tr = T[lang];
  const progress =
    totalNotes > 0 ? (((currentNoteIndex ?? -1) + 1) / totalNotes) * 100 : 0;

  return (
    <div className='ui-controls'>
      <button onClick={isPlaying ? onStop : onPlay} disabled={disabled}>
        {isPlaying ? tr.stop : tr.play}
      </button>
      <button
        onClick={onLoopToggle}
        disabled={disabled}
        className={`btn-loop${isLooping ? ' btn-loop--active' : ''}`}
        title={isLooping ? tr.disableLoop : tr.enableLoop}
      >
        {tr.loop}
      </button>
      <label className='tempo-label'>
        <span>
          {tr.tempo} : {tempo} BPM
        </span>
        <input
          type='range'
          min={40}
          max={240}
          value={tempo}
          onChange={(e) => onTempoChange(Number(e.target.value))}
          disabled={isPlaying}
        />
      </label>
      {totalNotes > 0 && (
        <div
          className='progress-bar'
          role='progressbar'
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            onSeek(Math.floor(ratio * totalNotes));
          }}
        >
          <div
            className='progress-bar__fill'
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default UIControls;
