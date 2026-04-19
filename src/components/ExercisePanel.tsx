import React, { useState } from 'react';
import { Lang, T } from '../utils/i18n';
import {
  Difficulty,
  ExerciseConfig,
  ExerciseType,
  GeneratedExercise,
  ScaleKey,
  generateExercise,
} from '../utils/exerciseGenerator';

interface ExercisePanelProps {
  onGenerate: (exercise: GeneratedExercise) => void;
  lang: Lang;
}

const ExercisePanel: React.FC<ExercisePanelProps> = ({ onGenerate, lang }) => {
  const tr = T[lang];
  const [config, setConfig] = useState<ExerciseConfig>({
    type: 'gamme',
    key: 'C',
    octaves: 1,
    direction: 'montant',
    difficulty: 'debutant',
  });

  const set = <K extends keyof ExerciseConfig>(
    key: K,
    value: ExerciseConfig[K],
  ) => setConfig((prev) => ({ ...prev, [key]: value }));

  return (
    <div className='exercise-panel'>
      <h4 className='exercise-panel__title'>{tr.exercisesTitle}</h4>
      <div className='exercise-panel__grid'>
        <div className='exercise-field'>
          <label>{tr.exType}</label>
          <div className='exercise-btn-group'>
            {(['gamme', 'arpege', 'tierces'] as ExerciseType[]).map((t) => (
              <button
                key={t}
                className={`btn-option${config.type === t ? ' btn-option--active' : ''}`}
                onClick={() => set('type', t)}
              >
                {t === 'gamme'
                  ? tr.scale
                  : t === 'arpege'
                    ? tr.arpeggio
                    : tr.thirds}
              </button>
            ))}
          </div>
        </div>

        <div className='exercise-field'>
          <label>{tr.key}</label>
          <div className='exercise-btn-group'>
            {(['C', 'G', 'D', 'A', 'F', 'Bb'] as ScaleKey[]).map((k) => (
              <button
                key={k}
                className={`btn-option${config.key === k ? ' btn-option--active' : ''}`}
                onClick={() => set('key', k)}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        <div className='exercise-field'>
          <label>{tr.octaves}</label>
          <div className='exercise-btn-group'>
            {([1, 2] as const).map((o) => (
              <button
                key={o}
                className={`btn-option${config.octaves === o ? ' btn-option--active' : ''}`}
                onClick={() => set('octaves', o)}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        <div className='exercise-field'>
          <label>{tr.direction}</label>
          <div className='exercise-btn-group'>
            <button
              className={`btn-option${config.direction === 'montant' ? ' btn-option--active' : ''}`}
              onClick={() => set('direction', 'montant')}
            >
              {tr.ascending}
            </button>
            <button
              className={`btn-option${config.direction === 'montant-descendant' ? ' btn-option--active' : ''}`}
              onClick={() => set('direction', 'montant-descendant')}
            >
              {tr.roundTrip}
            </button>
          </div>
        </div>

        <div className='exercise-field'>
          <label>{tr.level}</label>
          <div className='exercise-btn-group'>
            {(['debutant', 'intermediaire', 'avance'] as Difficulty[]).map(
              (d) => (
                <button
                  key={d}
                  className={`btn-option${config.difficulty === d ? ' btn-option--active' : ''}`}
                  onClick={() => set('difficulty', d)}
                >
                  {d === 'debutant'
                    ? tr.beginner
                    : d === 'intermediaire'
                      ? tr.intermediate
                      : tr.advanced}
                </button>
              ),
            )}
          </div>
        </div>
      </div>

      <button
        className='btn-generate'
        onClick={() => onGenerate(generateExercise(config))}
      >
        {tr.generate}
      </button>
    </div>
  );
};

export default ExercisePanel;
