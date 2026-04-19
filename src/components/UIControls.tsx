import React from 'react';

interface UIControlsProps {
  isPlaying: boolean;
  tempo: number;
  onPlay: () => void;
  onStop: () => void;
  onTempoChange: (bpm: number) => void;
  disabled: boolean;
  currentNoteIndex: number | null;
  totalNotes: number;
}

const UIControls: React.FC<UIControlsProps> = ({
  isPlaying,
  tempo,
  onPlay,
  onStop,
  onTempoChange,
  disabled,
  currentNoteIndex,
  totalNotes,
}) => {
  const progress =
    totalNotes > 0 ? (((currentNoteIndex ?? -1) + 1) / totalNotes) * 100 : 0;

  return (
    <div className='ui-controls'>
      <button onClick={isPlaying ? onStop : onPlay} disabled={disabled}>
        {isPlaying ? '⏹ Arrêter' : '▶ Lecture'}
      </button>
      <label className='tempo-label'>
        <span>Tempo : {tempo} BPM</span>
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
