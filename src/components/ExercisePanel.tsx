import React, { useState } from 'react';
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
}

const ExercisePanel: React.FC<ExercisePanelProps> = ({ onGenerate }) => {
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
      <h4 className='exercise-panel__title'>Exercices progressifs</h4>
      <div className='exercise-panel__grid'>
        <div className='exercise-field'>
          <label>Type</label>
          <div className='exercise-btn-group'>
            {(['gamme', 'arpege', 'tierces'] as ExerciseType[]).map((t) => (
              <button
                key={t}
                className={`btn-option${config.type === t ? ' btn-option--active' : ''}`}
                onClick={() => set('type', t)}
              >
                {t === 'gamme'
                  ? 'Gamme'
                  : t === 'arpege'
                    ? 'Arpège'
                    : 'Tierces'}
              </button>
            ))}
          </div>
        </div>

        <div className='exercise-field'>
          <label>Tonalité</label>
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
          <label>Octaves</label>
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
          <label>Direction</label>
          <div className='exercise-btn-group'>
            <button
              className={`btn-option${config.direction === 'montant' ? ' btn-option--active' : ''}`}
              onClick={() => set('direction', 'montant')}
            >
              ↑ Montant
            </button>
            <button
              className={`btn-option${config.direction === 'montant-descendant' ? ' btn-option--active' : ''}`}
              onClick={() => set('direction', 'montant-descendant')}
            >
              ↑↓ Aller-retour
            </button>
          </div>
        </div>

        <div className='exercise-field'>
          <label>Niveau</label>
          <div className='exercise-btn-group'>
            {(['debutant', 'intermediaire', 'avance'] as Difficulty[]).map(
              (d) => (
                <button
                  key={d}
                  className={`btn-option${config.difficulty === d ? ' btn-option--active' : ''}`}
                  onClick={() => set('difficulty', d)}
                >
                  {d === 'debutant'
                    ? 'Débutant'
                    : d === 'intermediaire'
                      ? 'Intermédiaire'
                      : 'Avancé'}
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
        ▶ Générer l&apos;exercice
      </button>
    </div>
  );
};

export default ExercisePanel;
