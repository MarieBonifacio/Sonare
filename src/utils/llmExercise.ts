import Anthropic from '@anthropic-ai/sdk';
import {
  Difficulty,
  ExerciseConfig,
  ExerciseType,
  GeneratedExercise,
  ScaleKey,
  generateExercise,
} from './exerciseGenerator';
import { Lang } from './i18n';

const SYSTEM_PROMPT = `You are a harp exercise assistant. The user will describe a musical exercise in natural language (possibly in French or English).
Parse their request and return ONLY a valid JSON object with these exact fields:
{
  "type": "gamme" | "arpege" | "tierces",
  "key": "C" | "G" | "D" | "A" | "F" | "Bb",
  "octaves": 1 | 2,
  "direction": "montant" | "montant-descendant",
  "difficulty": "debutant" | "intermediaire" | "avance"
}

Mapping rules:
- type: "gamme" for scales/gammes, "arpege" for arpeggios/arpèges, "tierces" for thirds/tierces
- key: use the closest matching key; default "C"
- octaves: 1 or 2; default 1
- direction: "montant" for ascending only, "montant-descendant" for round trip/aller-retour
- difficulty: "debutant" slow/easy, "intermediaire" medium, "avance" fast/advanced

Respond with ONLY the JSON object. No explanation, no markdown, no code block.`;

const VALID_TYPES: ExerciseType[] = ['gamme', 'arpege', 'tierces'];
const VALID_KEYS: ScaleKey[] = ['C', 'G', 'D', 'A', 'F', 'Bb'];
const VALID_DIRECTIONS = ['montant', 'montant-descendant'] as const;
const VALID_DIFFICULTIES: Difficulty[] = [
  'debutant',
  'intermediaire',
  'avance',
];

function validateConfig(obj: unknown): ExerciseConfig {
  if (typeof obj !== 'object' || obj === null) {
    throw new Error("La réponse n'est pas un objet JSON valide.");
  }
  const raw = obj as Record<string, unknown>;

  if (!VALID_TYPES.includes(raw.type as ExerciseType)) {
    throw new Error(`Type invalide : "${raw.type}"`);
  }
  if (!VALID_KEYS.includes(raw.key as ScaleKey)) {
    throw new Error(`Tonalité invalide : "${raw.key}"`);
  }
  if (raw.octaves !== 1 && raw.octaves !== 2) {
    throw new Error(`Octaves invalide : "${raw.octaves}"`);
  }
  if (
    !VALID_DIRECTIONS.includes(
      raw.direction as (typeof VALID_DIRECTIONS)[number],
    )
  ) {
    throw new Error(`Direction invalide : "${raw.direction}"`);
  }
  if (!VALID_DIFFICULTIES.includes(raw.difficulty as Difficulty)) {
    throw new Error(`Niveau invalide : "${raw.difficulty}"`);
  }

  return {
    type: raw.type as ExerciseType,
    key: raw.key as ScaleKey,
    octaves: raw.octaves as 1 | 2,
    direction: raw.direction as 'montant' | 'montant-descendant',
    difficulty: raw.difficulty as Difficulty,
  };
}

export async function generateExerciseWithLlm(
  apiKey: string,
  userPrompt: string,
  lang: Lang,
): Promise<GeneratedExercise> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: [
      {
        type: 'text' as const,
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' as const },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `[Language: ${lang === 'fr' ? 'French' : 'English'}]\n${userPrompt}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Aucune réponse textuelle reçue.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(textBlock.text.trim());
  } catch {
    throw new Error(
      `Réponse non valide (JSON attendu) : ${textBlock.text.slice(0, 120)}`,
    );
  }

  const config = validateConfig(parsed);
  return generateExercise(config);
}
