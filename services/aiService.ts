import OpenAI from "openai";
import { Lesson } from "../types";
import type { TargetLang } from "../types";
import { LANGUAGE_CONFIGS, LANG_NAME_EN } from "./languages.config";

// ─── JSON Parsing Helpers ─────────────────────────────────────────────────────

const VALID_DIFF_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;

/**
 * Tries to parse a JSON string. If parsing fails, attempts to extract a JSON
 * object by finding the first { ... } block. Returns the parsed object or
 * throws if no valid JSON can be recovered.
 */
function tryParseJSON(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as Record<string, unknown>;
      } catch {
        const raw = match[0];
        for (let i = raw.length - 1; i > 0; i--) {
          if (raw[i] === '}' || raw[i] === ']' || raw[i] === '"') {
            try {
              const sub = raw.slice(0, i + 1);
              let open = 0;
              let inStr = false;
              let escape = false;
              for (const ch of sub) {
                if (escape) { escape = false; continue; }
                if (ch === '\\' && inStr) { escape = true; continue; }
                if (ch === '"') { inStr = !inStr; continue; }
                if (inStr) continue;
                if (ch === '{') open++;
                else if (ch === '}') open--;
              }
              const closed = sub + '}'.repeat(Math.max(0, open));
              return JSON.parse(closed) as Record<string, unknown>;
            } catch {
              // keep trying
            }
          }
        }
      }
    }
    throw new Error('Invalid or incomplete JSON response from API');
  }
}

/**
 * Normalises the difficulty_level field to a single valid CEFR level.
 * If the model returns "B1-B2" or similar, we take the first level.
 * If no valid level is found, defaults to "B1".
 */
function normalizeDifficultyLevel(raw: unknown): string {
  if (typeof raw !== 'string') return 'B1';
  if ((VALID_DIFF_LEVELS as readonly string[]).includes(raw)) return raw;
  const match = raw.match(/\b(A1|A2|B1|B2|C1)\b/);
  if (match) return match[1];
  return 'B1';
}

/**
 * Validates that all required top-level fields are present in the parsed data.
 * Returns an array of missing field names.
 */
function findMissingRequiredFields(data: Record<string, unknown>, required: string[]): string[] {
  return required.filter(field => !(field in data) || data[field] === null || data[field] === undefined);
}

// ─── OpenRouter model type ────────────────────────────────────────────────────

export interface ORModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: { prompt: string; completion: string };
  top_provider?: { context_length?: number };
}

export const DEFAULT_MODEL = "google/gemini-3-pro-preview";
const MODEL_STORAGE_KEY = "openrouter_model";

export function getSavedModel(): string {
  const saved = localStorage.getItem(MODEL_STORAGE_KEY);
  // If the saved model was the old broken default, reset it
  if (!saved || saved === "google/gemini-2.5-flash") {
    localStorage.setItem(MODEL_STORAGE_KEY, DEFAULT_MODEL);
    return DEFAULT_MODEL;
  }
  return saved;
}

export function saveModel(modelId: string) {
  localStorage.setItem(MODEL_STORAGE_KEY, modelId);
}

export async function loadModels(apiKey: string): Promise<ORModel[]> {
  // Filter to models that support response_format (JSON mode) — required for lesson generation
  const res = await fetch(
    "https://openrouter.ai/api/v1/models?supported_parameters=response_format",
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );
  if (!res.ok) throw new Error("Failed to load models");
  const json = await res.json();
  return (json.data as ORModel[]).filter(m => m.id);
}

// ─── Prompt Builders ──────────────────────────────────────────────────────────

type LangCfg = (typeof LANGUAGE_CONFIGS)[TargetLang];

function buildSystemPrompt(cfg: LangCfg): string {
  const { namePair, englishName, culturalAuth, linguisticPrecision, polishFocus, code } = cfg;

  const precisionLine = linguisticPrecision
    ? `— LINGUISTIC PRECISION: distinguish registers, connotations, and pragmatic constraints scrupulously. ${linguisticPrecision}`
    : `— LINGUISTIC PRECISION: distinguish registers, connotations, and pragmatic constraints scrupulously.`;

  const focusLine = polishFocus
    ? `— POLISH SPEAKER FOCUS: always identify specifically which Polish structures or words cause interference. ${polishFocus}`
    : `— POLISH SPEAKER FOCUS: always identify specifically which Polish structures or words cause interference.`;

  const codeNote = code === 'it'
    ? ''
    : `\nIMPORTANT: All bilingual fields use "${code}" (not "it") for the ${englishName} content, and "pl" for Polish.`;

  return `You are a world-class bilingual (${namePair}) editorial expert, cultural authority, and master language educator with 30 years of experience teaching ${englishName} to Polish speakers.

You produce premium, literary-quality learning resources that feel like an issue of a prestigious culture magazine combined with a rigorous academic reference.

Your guiding principles:
— DEPTH over brevity: every field must be thorough, substantive, and information-dense. Short answers are a failure.
— CULTURAL AUTHENTICITY: ${culturalAuth}
${precisionLine}
${focusLine}
— LITERARY QUALITY: your ${englishName} must be native, varied, and beautiful. Your Polish must be elegant and precise.
— MEMORABILITY: every explanation, example, and note should be crafted so a learner will never forget it.

CRITICAL LENGTH REQUIREMENTS — enforce these strictly:
• introduction: ≥ 6 sentences per language
• vocabulary definitions: ≥ 2–3 sentences per language each
• grammar explanations: ≥ 5 sentences per language each
• grammar examples: ≥ 4 example pairs per grammar point
• common_mistakes explanations: ≥ 3–4 sentences per language each

• deep_dive: ≥ 250 words per language — in-depth analytical/narrative feature
• culture content: ≥ 250 words per language
• cultural_notes content: ≥ 3 sentences per language each
• mini_story text: ≥ 200 words per language
• dialogue: ≥ 16 lines total, each utterance 1–3 sentences
• closing_reflection: ≥ 200 words per language — synthesising closing essay
• proverb meaning: ≥ 4 sentences per language
• idiom meaning + origin: ≥ 3 sentences each per language
${codeNote}
DO NOT produce shortened, telegraphic, or bullet-point-style content in any field that requests prose.`;
}

function buildUserPrompt(topic: string, cfg: LangCfg): string {
  const {
    code: tl, textPair, learnerLabel, englishName,
    grammarNote, commonMistakesNote, miniStoryLocation,
    cultureDetails, proverbTerm, idiomTerm, defaultEmoji,
  } = cfg;

  const grammarLine = grammarNote
    ? `Grammar: 3 sections minimum, each with ≥ 5-sentence explanations and ≥ 4 example pairs. ${grammarNote}`
    : `Grammar: 3 sections minimum, each with ≥ 5-sentence explanations and ≥ 4 example pairs.`;

  return `Create a comprehensive, premium bilingual (${textPair}) learning resource on the topic: "${topic}".

Target audience: Polish adults learning ${learnerLabel} (B1–B2 level).
Tone: Engaging, magazine-quality, culturally immersive, intellectually serious.

MANDATORY requirements — failure to meet ANY of these is unacceptable:
1. ALL prose fields must be long and substantive — see the length requirements in the system prompt.
2. ALL explanations and prose must be provided in BOTH ${englishName} and Polish — every "Bilingual" field has "${tl}" and "pl" keys.
3. DO NOT include a "vocabulary" field — vocabulary is generated separately.
4. ${grammarLine}
5. Common mistakes: SPECIFIC to Polish speakers — ${commonMistakesNote}
6. Mini-story: ≥ 200 words per language, ${miniStoryLocation}
7. Dialogue: ≥ 16 lines, authentic native ${englishName}, multi-sentence utterances, grammar notes on ≥ 6 lines. This must feel like a complete dramatic scene, not a textbook exchange.
8. Culture content: ≥ 250 words per language — ${cultureDetails}
9. Cultural notes: 3–4 notes, each ≥ 3 sentences per language.
10. Proverb: must be a ${proverbTerm}. Meaning field ≥ 4 sentences per language.
11. Idiom: ${idiomTerm}. Origin story required (≥ 3 sentences per language).
12. Phrases: 8 items, each with detailed context ≥ 2–3 sentences per language.
13. deep_dive_title: concise encyclopedic section title (3–7 words, topic-specific, like an encyclopedia chapter). deep_dive: ≥ 250 words per language — authoritative, encyclopedic analysis. NO "lesson/journey" framing — write as a reference work.
14. closing_reflection_title: concise encyclopedic section title. closing_reflection: ≥ 200 words per language — scholarly synthesis of linguistic, cultural and grammatical dimensions. NO "lesson/journey" framing.

CRITICAL — You MUST respond with a single valid JSON object. No markdown, no code fences, no extra text — ONLY the raw JSON.

Use "${tl}" key for ${englishName} content in all Bilingual fields. Do NOT include a "vocabulary" field:
{
  "topic": {"${tl}": "...", "pl": "..."},
  "subtitle": {"${tl}": "...", "pl": "..."},
  "emoji": "${defaultEmoji}",
  "tags": ["tag1", "tag2", "tag3"],
  "difficulty_level": "B1",
  "estimated_reading_minutes": 12,
  "introduction": {"${tl}": "...", "pl": "..."},
  "key_takeaways": [{"${tl}": "...", "pl": "..."}, {"${tl}": "...", "pl": "..."}, {"${tl}": "...", "pl": "..."}],
  "trivia": {"${tl}": "...", "pl": "..."},
  "regional_notes": {"${tl}": "...", "pl": "..."},
  "deep_dive_title": {"${tl}": "...", "pl": "..."},
  "deep_dive": {"${tl}": "...", "pl": "..."},
  "grammar": [
    {
      "title": {"${tl}": "...", "pl": "..."},
      "explanation": {"${tl}": "...", "pl": "..."},
      "pattern": "...",
      "examples": [{"${tl}": "...", "pl": "...", "breakdown": "..."}],
      "exceptions": [{"${tl}": "...", "pl": "..."}]
    }
  ],
  "common_mistakes": [
    {
      "category": "false_friend|grammar|pronunciation|usage|spelling",
      "wrong": "...", "correct": "...",
      "explanation": {"${tl}": "...", "pl": "..."},
      "mnemonic": {"${tl}": "...", "pl": "..."}
    }
  ],
  "useful_phrases": [
    {
      "expression": "...", "translation": "...",
      "register": "formal|informal|colloquial|literary|regional|vulgar",
      "context": {"${tl}": "...", "pl": "..."},
      "example_usage": {"${tl}": "...", "pl": "..."}
    }
  ],
  "mini_story": {
    "title": {"${tl}": "...", "pl": "..."},
    "text": {"${tl}": "...", "pl": "..."},
    "moral": {"${tl}": "...", "pl": "..."}
  },
  "dialogue": {
    "title": {"${tl}": "...", "pl": "..."},
    "setting": {"${tl}": "...", "pl": "..."},
    "lines": [
      {
        "speaker": "...", "text": {"${tl}": "...", "pl": "..."},
        "tone": "neutral|happy|surprised|formal|casual|ironic|questioning|emphatic",
        "annotation": {"${tl}": "...", "pl": "..."},
        "grammar_note": {"${tl}": "...", "pl": "..."}
      }
    ],
    "vocabulary_highlight": ["...", "..."]
  },
  "closing_reflection_title": {"${tl}": "...", "pl": "..."},
  "closing_reflection": {"${tl}": "...", "pl": "..."},
  "culture": {
    "title": {"${tl}": "...", "pl": "..."},
    "content": {"${tl}": "...", "pl": "..."},
    "did_you_know": {"${tl}": "...", "pl": "..."}
  },
  "cultural_notes": [
    {
      "icon": "🎭",
      "title": {"${tl}": "...", "pl": "..."},
      "content": {"${tl}": "...", "pl": "..."},
      "region": "..."
    }
  ],
  "proverb": {
    "text": "...",
    "translation": {"${tl}": "...", "pl": "..."},
    "meaning": {"${tl}": "...", "pl": "..."}
  },
  "idiom": {
    "phrase": "...",
    "literal": {"${tl}": "...", "pl": "..."},
    "meaning": {"${tl}": "...", "pl": "..."},
    "origin": {"${tl}": "...", "pl": "..."},
    "example_sentence": {"${tl}": "...", "pl": "..."}
  }
}

Remember: this resource must be so good that a learner could use it as their primary reference for this topic.`;
}

// ─── Vocabulary Generation ────────────────────────────────────────────────────

async function generateVocabulary(
  lessonData: Record<string, unknown>,
  targetLang: TargetLang,
  apiKey: string,
  model: string,
  client?: OpenAI
): Promise<import('../types').VocabularyItem[]> {
  const cfg = LANGUAGE_CONFIGS[targetLang];
  const c = client ?? new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey, dangerouslyAllowBrowser: true });
  const tl = cfg.code;

  const lessonSummary = JSON.stringify({
    topic: lessonData.topic,
    tags: lessonData.tags,
    difficulty_level: lessonData.difficulty_level,
    introduction: lessonData.introduction,
    deep_dive: lessonData.deep_dive,
    grammar: lessonData.grammar,
    mini_story: lessonData.mini_story,
    dialogue: lessonData.dialogue,
  });

  const englishTranslationField = cfg.hasEnglishTranslation
    ? '\n- english_translation: English translation of the word'
    : '';
  const englishTranslationJson = cfg.hasEnglishTranslation
    ? '\n      "english_translation": "...",'
    : '';

  const response = await c.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: `You are a specialist ${cfg.englishName} lexicographer and vocabulary teacher for Polish speakers. You create precise, detailed, encyclopedic vocabulary entries for language learners. Your entries are accurate, pedagogically rich, and directly relevant to the topic at hand.${cfg.vocabSystemNote}`,
      },
      {
        role: "user",
        content: `Based on the following ${cfg.englishName} lesson content, generate a vocabulary list of EXACTLY 15 to 25 items (no fewer than 15, no more than 25). Choose the most important, topic-relevant ${cfg.englishName} words and phrases — a mix of nouns, verbs, adjectives, adverbs, and set phrases. Prioritise words that actually appear or are strongly implied in the lesson text.

LESSON CONTENT:
${lessonSummary}

For each vocabulary item provide:
- word: ${cfg.vocabWordNote}
- ipa: full IPA phonetic transcription
- gender: "m", "f", "pl", or "invariant" (for nouns)
- plural: plural form (for nouns)
- part_of_speech: one of noun|verb|adjective|adverb|phrase|interjection|conjunction|preposition
- register: one of formal|informal|colloquial|literary|regional|vulgar
- translation: Polish translation (primary meaning, with nuances noted)${englishTranslationField}
- definition: {"${tl}": "2–3 sentence definition in ${cfg.englishName} explaining usage and nuances", "pl": "2–3 sentence definition in Polish"}
- context_sentence: {"${tl}": "A vivid, culturally specific ${cfg.englishName} example sentence", "pl": "Polish translation of the sentence"}
- audio_hint: ${cfg.vocabAudioHintExample}
- etymology: {"${tl}": "2+ sentence etymology in ${cfg.englishName}", "pl": "2+ sentence etymology in Polish"}
- synonyms: array of 3–4 ${cfg.englishName} synonyms with register notes
- antonyms: array of 2–3 ${cfg.englishName} antonyms (if applicable)
- word_family: array of 3–4 related forms: [{"form": "...", "type": "noun/verb/adj", "translation": "Polish gloss"}]

CRITICAL: Respond with ONLY a raw JSON object in this exact format:
{
  "vocabulary": [
    {
      "word": "...", "ipa": "...", "gender": "m|f|pl|invariant", "plural": "...",
      "part_of_speech": "noun|verb|...",
      "register": "formal|informal|...",
      "translation": "...",${englishTranslationJson}
      "definition": {"${tl}": "...", "pl": "..."},
      "context_sentence": {"${tl}": "...", "pl": "..."},
      "audio_hint": "...",
      "etymology": {"${tl}": "...", "pl": "..."},
      "synonyms": ["...", "..."],
      "antonyms": ["...", "..."],
      "word_family": [{"form": "...", "type": "...", "translation": "..."}]
    }
  ]
}`,
      },
    ],
    response_format: { type: "json_object" },
    // OpenRouter extensions: heal malformed JSON; route only to JSON-capable providers
    plugins: [{ id: "response-healing" }],
    provider: { require_parameters: true },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  const vocabText = response.choices[0]?.message?.content;
  if (!vocabText) return [];
  try {
    const parsed = JSON.parse(vocabText);
    return parsed.vocabulary ?? [];
  } catch {
    return [];
  }
}

// ─── Unified Lesson Generation ────────────────────────────────────────────────

export const generateLesson = async (
  topic: string,
  targetLang: TargetLang = 'it',
  apiKey: string,
  model?: string
): Promise<Lesson> => {
  const cfg = LANGUAGE_CONFIGS[targetLang];
  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const response = await client.chat.completions.create({
    model: model || getSavedModel() || DEFAULT_MODEL,
    messages: [
      { role: "system", content: buildSystemPrompt(cfg) },
      { role: "user", content: buildUserPrompt(topic, cfg) },
    ],
    response_format: { type: "json_object" },
    // OpenRouter extensions: heal malformed JSON; route only to JSON-capable providers
    plugins: [{ id: "response-healing" }],
    provider: { require_parameters: true },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("Empty response from API");

  const data = tryParseJSON(text);

  // Validate required fields
  const REQUIRED = ['topic','subtitle','emoji','tags','difficulty_level','introduction','key_takeaways','grammar','common_mistakes','useful_phrases','mini_story','dialogue','closing_reflection','culture','cultural_notes','proverb','idiom'];
  const missing = findMissingRequiredFields(data, REQUIRED);
  if (missing.length > 0) {
    throw new Error(`Incomplete lesson JSON — missing fields: ${missing.join(', ')}`);
  }

  // Normalize difficulty level to single CEFR code
  data.difficulty_level = normalizeDifficultyLevel(data.difficulty_level);

  // Generate vocabulary as a separate request with full lesson context
  const vocabulary = await generateVocabulary(data, targetLang, apiKey, model || getSavedModel() || DEFAULT_MODEL, client);

  return {
    ...data,
    vocabulary,
    id: typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: Date.now(),
    targetLang,
  } as Lesson;
};

// ─── Image Analysis for Lesson Generation ─────────────────────────────────────

/**
 * Analyzes an image and returns a suitable lesson topic derived from its content.
 * @param imageData - base64 data URL (e.g. "data:image/jpeg;base64,...")
 * @param targetLang - target language code ('it', 'en', 'fr', etc.)
 * @param contextHint - optional user-provided context text
 * @param apiKey - OpenRouter API key
 * @param model - optional model ID
 */
export async function analyzeImageForLesson(
  imageData: string,
  targetLang: string,
  contextHint: string,
  apiKey: string,
  model?: string
): Promise<string> {
  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const langName = LANG_NAME_EN[targetLang] || 'Italian';
  const contextNote = contextHint?.trim()
    ? ` The user also provided this context: "${contextHint.trim()}".`
    : '';

  const response = await (client.chat.completions.create as Function)({
    model: model || getSavedModel() || DEFAULT_MODEL,
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageData } },
          {
            type: "text",
            text: `Look at this image carefully and suggest a specific, interesting topic for a ${langName} language learning lesson.${contextNote}

The topic should be derived from what you actually see in the image — an object, scene, concept, activity, food, place, or cultural element visible in the photo.

Respond with ONLY a JSON object, no other text:
{"topic": "a clear, specific topic name in ${langName} suitable for a language lesson (2-6 words)", "topic_pl": "Polish translation of the topic"}`,
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 150,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from image analysis");

  try {
    const parsed = JSON.parse(content);
    return parsed.topic || parsed.topic_pl || contextHint || "Image-based lesson";
  } catch {
    return contextHint || "Image-based lesson";
  }
}

// ─── Text Correction Service ───────────────────────────────────────────────────

export type CorrectionMode = 'quick' | 'detailed';

export interface QuickCorrectionResult {
  mode: 'quick';
  original: string;
  corrected: string;
  has_errors: boolean;
  language_detected: string;
}

export interface DetailedCorrectionResult {
  mode: 'detailed';
  original: string;
  corrected: string;
  language_detected: string;
  has_errors: boolean;
  score: number;
  overall_assessment_pl: string;
  register?: string;
  errors: Array<{
    type: 'grammar' | 'spelling' | 'style' | 'punctuation' | 'vocabulary' | 'syntax';
    original: string;
    corrected: string;
    context_before?: string;
    context_after?: string;
    explanation_pl: string;
    rule?: string;
  }>;
}

export type CorrectionResult = QuickCorrectionResult | DetailedCorrectionResult;

/**
 * Corrects text using AI. Two modes:
 * - 'quick': returns just the corrected text
 * - 'detailed': returns structured JSON with per-error analysis
 */
export async function correctText(
  text: string,
  targetLang: string,
  mode: CorrectionMode,
  apiKey: string,
  model?: string
): Promise<CorrectionResult> {
  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const resolvedModel = model || getSavedModel() || DEFAULT_MODEL;
  const langName = LANG_NAME_EN[targetLang] || 'Italian';

  if (mode === 'quick') {
    const response = await client.chat.completions.create({
      model: resolvedModel,
      messages: [
        {
          role: "system",
          content: `You are an expert ${langName} language corrector. Your task is to correct text written in ${langName}, fixing all grammar, spelling, punctuation, vocabulary, and style errors. Return ONLY a JSON object.`,
        },
        {
          role: "user",
          content: `Correct the following ${langName} text. Fix all errors (grammar, spelling, punctuation, vocabulary, style) and return the improved version.

Text to correct:
"""
${text}
"""

Respond with ONLY this JSON object:
{
  "original": "the original text verbatim",
  "corrected": "the fully corrected text",
  "has_errors": true or false,
  "language_detected": "name of the detected language in Polish (e.g. 'włoski', 'angielski')"
}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2048,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response");
    const parsed = JSON.parse(content);
    return {
      mode: 'quick',
      original: text,
      corrected: parsed.corrected || text,
      has_errors: parsed.has_errors ?? false,
      language_detected: parsed.language_detected || langName,
    };

  } else {
    // Detailed mode
    const response = await client.chat.completions.create({
      model: resolvedModel,
      messages: [
        {
          role: "system",
          content: `You are an expert ${langName} language teacher and corrector specializing in helping Polish speakers. Analyze text written in ${langName} and provide a thorough, pedagogical correction with detailed explanations in Polish. Return ONLY a JSON object.`,
        },
        {
          role: "user",
          content: `Perform a detailed correction of the following ${langName} text. Identify ALL errors (grammar, spelling, punctuation, vocabulary, style, syntax) and explain each one thoroughly in Polish.

Text to correct:
"""
${text}
"""

Respond with ONLY this JSON object:
{
  "original": "the original text verbatim",
  "corrected": "the fully corrected text",
  "language_detected": "name of the detected language in Polish (e.g. 'włoski', 'angielski')",
  "has_errors": true or false,
  "score": 0-100 (quality score: 100 = perfect, 0 = very poor),
  "overall_assessment_pl": "2-3 sentence overall assessment of the text quality and main issues, in Polish",
  "register": "formal|informal|colloquial|literary|mixed",
  "errors": [
    {
      "type": "grammar|spelling|style|punctuation|vocabulary|syntax",
      "original": "the exact incorrect phrase or word from the text",
      "corrected": "the correct version",
      "context_before": "up to 5 words before the error for context",
      "context_after": "up to 5 words after the error for context",
      "explanation_pl": "2-4 sentence explanation in Polish: what is wrong, why it's wrong, what rule applies, how to remember",
      "rule": "the grammar/spelling rule name or principle (brief, in Polish)"
    }
  ]
}

If there are no errors, return an empty errors array and score of 100.`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response");
    const parsed = JSON.parse(content);
    return {
      mode: 'detailed',
      original: text,
      corrected: parsed.corrected || text,
      language_detected: parsed.language_detected || langName,
      has_errors: parsed.has_errors ?? (parsed.errors?.length > 0),
      score: parsed.score ?? 100,
      overall_assessment_pl: parsed.overall_assessment_pl || '',
      register: parsed.register,
      errors: Array.isArray(parsed.errors) ? parsed.errors : [],
    };
  }
}
