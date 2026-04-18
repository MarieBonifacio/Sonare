import React from 'react';

interface UIControlsProps {
  isPlaying: boolean;
  tempo: number;
  onPlay: () => void;
  onStop: () => void;
  onTempoChange: (bpm: number) => void;
  disabled: boolean;
}

const UIControls: React.FC<UIControlsProps> = ({
  isPlaying,
  tempo,
  onPlay,
  onStop,
  onTempoChange,
  disabled,
}) => {
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
    </div>
  );
};

export default UIControls;
