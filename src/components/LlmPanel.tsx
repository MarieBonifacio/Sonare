import React, { useState } from 'react';
import { Lang, T } from '../utils/i18n';
import { GeneratedExercise } from '../utils/exerciseGenerator';
import { generateExerciseWithLlm } from '../utils/llmExercise';

interface LlmPanelProps {
  onGenerate: (exercise: GeneratedExercise) => void;
  lang: Lang;
}

const LS_KEY = 'sonare-anthropic-key';

const LlmPanel: React.FC<LlmPanelProps> = ({ onGenerate, lang }) => {
  const tr = T[lang];
  const [apiKey, setApiKey] = useState<string>(
    () => localStorage.getItem(LS_KEY) ?? '',
  );
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setApiKey(val);
    localStorage.setItem(LS_KEY, val);
  };

  const handleGenerate = async () => {
    if (!apiKey.trim()) {
      setError(tr.llmApiKeyMissing);
      return;
    }
    if (!prompt.trim()) {
      setError(tr.llmPromptMissing);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const exercise = await generateExerciseWithLlm(
        apiKey.trim(),
        prompt.trim(),
        lang,
      );
      onGenerate(exercise);
    } catch (err) {
      setError(
        `${tr.llmError}${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='llm-panel'>
      <h4 className='llm-panel__title'>{tr.llmTitle}</h4>
      <div className='llm-panel__field'>
        <label>{tr.llmApiKey}</label>
        <input
          type='password'
          className='llm-input'
          value={apiKey}
          onChange={handleApiKeyChange}
          placeholder={tr.llmApiKeyPlaceholder}
          autoComplete='off'
        />
      </div>
      <div className='llm-panel__field'>
        <label>{tr.llmPrompt}</label>
        <textarea
          className='llm-textarea'
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={tr.llmPromptPlaceholder}
          rows={3}
        />
      </div>
      {error && <p className='llm-error'>{error}</p>}
      <button
        className='btn-llm-generate'
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? tr.llmGenerating : tr.llmGenerate}
      </button>
    </div>
  );
};

export default LlmPanel;
