import OpenAI from "openai";
import { Lesson } from "../types";

// ─── Schema Primitives ────────────────────────────────────────────────────────

const B = {
  type: "object",
  properties: {
    it: { type: "string" },
    pl: { type: "string" },
  },
  required: ["it", "pl"],
};

const optB = B; // alias for clarity in context

// ─── Full Lesson JSON Schema ──────────────────────────────────────────────────

const lessonSchema = {
  type: "object",
  properties: {

    // ── Meta ────────────────────────────────────────────────────────────────
    topic: { ...B, description: "Topic name in Italian and Polish." },
    subtitle: { ...B, description: "A short, evocative magazine-style subtitle/deck." },
    emoji: { type: "string", description: "Single emoji representing the topic." },
    tags: {
      type: "array",
      description: "3–5 short Italian thematic tags, e.g. ['gastronomia','storia','arte'].",
      items: { type: "string" },
    },
    difficulty_level: {
      type: "string",
      enum: ["A1", "A2", "B1", "B2", "C1"],
    },
    estimated_reading_minutes: {
      type: "number",
      description: "Estimated reading time in minutes (integer, realistic).",
    },

    // ── Intro ────────────────────────────────────────────────────────────────
    introduction: { ...B, description: "Rich, magazine-quality editorial introduction: minimum 6–8 sentences in each language. Set the cultural scene, explain why this topic matters to Italian life, give historical depth, and make the reader excited to learn. This is the hook — write it with literary flair." },
    key_takeaways: {
      type: "array",
      description: "Exactly 3 key takeaways. Each must be a full, informative sentence (not bullet-point fragments) — explain WHAT the reader will learn AND why it matters linguistically or culturally.",
      items: { ...B },
      minItems: 3,
      maxItems: 3,
    },
    trivia: { ...optB, description: "A detailed 'Did you know?' fun fact — at least 3 sentences, surprising and specific, with historical or cultural depth." },
    regional_notes: { ...optB, description: "Detailed regional variations in Italy — minimum 4 sentences. Mention specific regions, dialects, and how usage/meaning/custom differs across the peninsula." },

    // ── Deep-dive blocks ────────────────────────────────────────────────────
    deep_dive_title: {
      ...B,
      description: "A precise, encyclopedic section title for the deep-dive section — factual and topic-specific, like an encyclopedia chapter heading. Should be concise (3–7 words) and directly name the subject matter, e.g. 'Storia e origini della cucina napoletana' or 'Anatomia del gesto italiano'. No fluff, no 'journey' metaphors.",
    },
    deep_dive: {
      ...B,
      description: "An authoritative, encyclopedic in-depth analysis of the topic — minimum 250 words per language. Written in the style of a reference work or scholarly essay: factual, structured, with specific data, dates, names, and regional distinctions. Avoid any narrative framing of 'a lesson' or 'a journey'; write as if for an encyclopedia or cultural dictionary. Go beyond the introduction into the historical, linguistic, and socio-cultural dimensions of the topic.",
    },
    closing_reflection_title: {
      ...B,
      description: "A precise, encyclopedic section title for the closing reflection — factual and thematic, like a conclusion chapter in a reference book. E.g. 'Rilievo linguistico e prospettive' or 'Sintesi culturale e note comparate'. No motivational or journey-based phrasing.",
    },
    closing_reflection: {
      ...B,
      description: "A substantive closing synthesis — minimum 200 words per language. Written in a scholarly, encyclopedic register: synthesise the linguistic, cultural, and grammatical dimensions of the topic, draw comparisons with Polish, and point toward further study. Tone: authoritative, precise, intellectually rigorous. Avoid narrative frameworks like 'we have now completed our journey'; write as an expert summing up a reference entry.",
    },

    // ── Vocabulary ───────────────────────────────────────────────────────────
    vocabulary: {
      type: "array",
      description: "EXACTLY 10 core vocabulary items PLUS 5–10 bonus items for a total of 15–20 entries (never fewer than 15, never more than 20). The first 10 are essential, high-frequency words; the bonus 5–10 are deeper/rarer but still highly relevant. Mix nouns, verbs, adjectives, adverbs, and idiomatic phrases.",
      minItems: 15,
      maxItems: 20,
      items: {
        type: "object",
        properties: {
          word: { type: "string" },
          ipa: { type: "string", description: "Full IPA phonetic transcription, e.g. /laˈvoːro/." },
          gender: { type: "string", enum: ["m", "f", "pl", "invariant"] },
          plural: { type: "string" },
          part_of_speech: {
            type: "string",
            enum: ["noun", "verb", "adjective", "adverb", "phrase", "interjection", "conjunction", "preposition"],
          },
          register: {
            type: "string",
            enum: ["formal", "informal", "colloquial", "literary", "regional", "vulgar"],
          },
          translation: { type: "string", description: "Primary Polish translation with any nuances noted." },
          definition: { ...B, description: "Comprehensive, precise definition — at least 2–3 sentences in each language. Explain usage nuances, connotations, and how this word differs from close synonyms." },
          context_sentence: { ...B, description: "A vivid, natural example sentence set in Italian daily life — not generic, but culturally specific and memorably illustrative." },
          audio_hint: { type: "string", description: "Specific, actionable pronunciation tip for Polish speakers, e.g. 'gli = ʎ, podobnie do polskiego ль — nie wymawiaj jak 'gl'." },
          etymology: { ...optB, description: "Engaging etymology: Latin/Arabic/French/Germanic roots, how meaning evolved, cross-linguistic comparisons. Minimum 2 sentences." },
          synonyms: { type: "array", items: { type: "string" }, description: "3–4 Italian synonyms with register differences noted." },
          antonyms: { type: "array", items: { type: "string" }, description: "2–3 Italian antonyms if applicable." },
          word_family: {
            type: "array",
            description: "3–4 related word forms showing morphological richness.",
            items: {
              type: "object",
              properties: {
                form: { type: "string" },
                type: { type: "string" },
                translation: { type: "string" },
              },
              required: ["form", "type", "translation"],
            },
          },
        },
        required: ["word", "part_of_speech", "translation", "definition", "context_sentence"],
      },
    },

    // ── Grammar ──────────────────────────────────────────────────────────────
    grammar: {
      type: "array",
      description: "3 comprehensive grammar focus sections, highly relevant to the topic. Each must go deep — not just state the rule but explain the WHY, compare with Polish grammar, and provide rich examples.",
      items: {
        type: "object",
        properties: {
          title: { ...B },
          explanation: { ...B, description: "Thorough grammatical explanation — minimum 5–6 sentences in each language. Explain the rule, its scope, exceptions, why it exists, how it differs from Polish grammar, and common interference errors. Use metalinguistic commentary where helpful." },
          pattern: { type: "string", description: "Clear structural formula, e.g. 'avere/essere + participio passato'. Include variants if applicable." },
          examples: {
            type: "array",
            description: "Minimum 4 varied example sentence pairs — from simple to complex. Each should illustrate a different facet of the rule.",
            items: {
              type: "object",
              properties: {
                it: { type: "string" },
                pl: { type: "string" },
                breakdown: { type: "string", description: "Structural annotation labelling each grammatical element, e.g. '[sogg.] [aus.] [part.pass.]'." },
              },
              required: ["it", "pl"],
            },
          },
          exceptions: { type: "array", items: { ...B }, description: "All notable exceptions with examples — do not omit irregular forms or edge cases." },
        },
        required: ["title", "explanation", "examples"],
      },
    },

    // ── Common Mistakes ──────────────────────────────────────────────────────
    common_mistakes: {
      type: "array",
      description: "5–6 specific, well-documented mistakes Polish speakers make on this topic. Cover all categories: false friends, grammar interference, pronunciation errors, usage mistakes, spelling. Be VERY specific — name real Polish words that cause interference.",
      items: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["false_friend", "grammar", "pronunciation", "usage", "spelling"],
          },
          wrong: { type: "string", description: "The incorrect Italian form as a Polish speaker would produce it." },
          correct: { type: "string", description: "The correct Italian form." },
          explanation: { ...B, description: "Deep, analytic explanation — minimum 3–4 sentences in each language. Explain WHY Polish speakers make this mistake (which Polish structure/word is interfering), what the wrong form sounds like to native Italians, and the rule to follow." },
          mnemonic: { ...optB, description: "A creative, memorable trick to cement the correct form — a story, acronym, rhyme, or visual association. Minimum 2 sentences." },
        },
        required: ["category", "wrong", "correct", "explanation"],
      },
    },

    // ── Phrases ──────────────────────────────────────────────────────────────
    useful_phrases: {
      type: "array",
      description: "8 practical, authentic Italian phrases spanning different registers (formal, informal, colloquial). Include set phrases, idioms, and conversational formulas a native speaker would actually use.",
      items: {
        type: "object",
        properties: {
          expression: { type: "string" },
          translation: { type: "string" },
          register: {
            type: "string",
            enum: ["formal", "informal", "colloquial", "literary", "regional", "vulgar"],
          },
          context: { ...B, description: "Detailed usage context — minimum 2–3 sentences in each language. Specify the social situation, who would say this, in which city/region it is common, and any pragmatic constraints (age, gender, formality level)." },
          example_usage: { ...optB, description: "A rich, natural example sentence or mini-dialogue fragment illustrating the phrase in authentic Italian context." },
        },
        required: ["expression", "translation", "register", "context"],
      },
    },

    // ── Mini Story ───────────────────────────────────────────────────────────
    mini_story: {
      type: "object",
      description: "A rich, immersive short story (200–250 words per language) set vividly in Italy, with named characters, a specific location, a narrative arc, and natural integration of at least 6 lesson vocabulary items. The Italian must be literary-quality — varied sentence structures, authentic idioms, sensory details.",
      properties: {
        title: { ...B },
        text: { ...B, description: "The story body — minimum 200 words per language. It must have a beginning (scene-setting), middle (situation/tension), and end (resolution or revelation). Use lesson vocabulary naturally — never artificially forced." },
        moral: { ...optB, description: "A thoughtful 2-sentence moral, cultural observation, or linguistic insight drawn from the story." },
      },
      required: ["title", "text"],
    },

    // ── Dialogue ─────────────────────────────────────────────────────────────
    dialogue: {
      type: "object",
      description: "A rich, cinematic 16–20 line dialogue between 2–3 named Italian characters. Must feel like a full dramatic scene from Italian daily life — not a quick exchange but a REAL conversation with development, twists, humour, emotion, and depth. Natural speech rhythms, contractions, southern/northern flavours, emotional texture. Every line should be substantive and advance the scene. Include sub-conversations, topic shifts, small conflicts or surprises.",
      properties: {
        title: { ...B },
        setting: { ...B, description: "Vivid, immersive scene description — 3–4 sentences placing the reader in a very specific Italian location at a specific time of day, with sensory details (smells, sounds, light)." },
        lines: {
          type: "array",
          description: "16–20 dialogue lines. Use realistic turn-taking, interruptions, overlapping ideas, register shifts. Include grammar annotations on at least 6 lines. Make lines long — each utterance should be 1–3 sentences.",
          items: {
            type: "object",
            properties: {
              speaker: { type: "string" },
              text: { ...B, description: "The dialogue line — must be a complete, natural utterance. Italian must be authentic, not textbook-stilted." },
              tone: {
                type: "string",
                enum: ["neutral","happy","surprised","formal","casual","ironic","questioning","emphatic"],
              },
              annotation: { ...optB, description: "Vivid stage direction or pragmatic note — 1–2 sentences conveying body language, subtext, or situational context." },
              grammar_note: { ...optB, description: "Insightful grammar annotation explaining why this structure is used — 2–3 sentences with comparison to Polish." },
            },
            required: ["speaker", "text"],
          },
        },
        vocabulary_highlight: {
          type: "array",
          items: { type: "string" },
          description: "5–7 Italian words or phrases from the dialogue that are particularly noteworthy, idiomatic, or lesson-relevant.",
        },
      },
      required: ["title", "setting", "lines"],
    },

    // ── Culture ──────────────────────────────────────────────────────────────
    culture: {
      type: "object",
      properties: {
        title: { ...B },
        content: { ...B, description: "Authoritative, nuanced cultural essay — minimum 250–300 words per language. Cover historical roots, contemporary reality, social significance, generational shifts, and how this topic shapes Italian identity. Write as a knowledgeable cultural journalist, not a textbook." },
        did_you_know: { ...B, description: "A genuinely surprising, specific, and memorable fact — minimum 3 sentences. Must be something most people don't know, with historical or anthropological depth." },
      },
      required: ["title", "content", "did_you_know"],
    },
    cultural_notes: {
      type: "array",
      description: "3–4 focused, substantive cultural observations — each covering a distinct dimension: historical, regional, social, or contemporary. Each content field must be minimum 3–4 sentences.",
      items: {
        type: "object",
        properties: {
          icon: { type: "string", description: "Emoji precisely representing the note's theme." },
          title: { ...B },
          content: { ...B, description: "Detailed, informative cultural note — minimum 3–4 sentences. Specific facts, dates, regions, or personalities where relevant." },
          region: { type: "string", description: "Specific Italian region (e.g. 'Campania', 'Piemonte') if regionally specific." },
        },
        required: ["icon", "title", "content"],
      },
    },

    // ── Proverb ──────────────────────────────────────────────────────────────
    proverb: {
      type: "object",
      description: "A REAL, well-known Italian proverb thematically connected to the topic. Must be verifiably authentic — not invented.",
      properties: {
        text: { type: "string", description: "The complete Italian proverb text." },
        translation: { ...B, description: "Precise, elegant translation in both languages." },
        meaning: { ...B, description: "Rich interpretation — minimum 4 sentences. Explain the figurative meaning, the wisdom it encodes, its historical/social context, and how Italians use it today. Compare with equivalent Polish proverbs where possible." },
      },
      required: ["text", "translation", "meaning"],
    },

    // ── Idiom ────────────────────────────────────────────────────────────────
    idiom: {
      type: "object",
      description: "A colourful, authentic Italian 'modo di dire' (idiom) related to the topic. Must be genuinely used — not a calque from English or Polish.",
      properties: {
        phrase: { type: "string" },
        literal: { ...B, description: "Word-for-word literal translation that reveals the idiom's imagery." },
        meaning: { ...B, description: "Full figurative meaning explanation — minimum 3 sentences. Include pragmatic usage notes: when, by whom, in what emotional register." },
        origin: { ...optB, description: "Fascinating origin story — minimum 3 sentences. Historical, culinary, maritime, agricultural roots? What does it reveal about Italian culture?" },
        example_sentence: { ...optB, description: "A natural, rich Italian sentence showing the idiom in authentic context, with Polish translation." },
      },
      required: ["phrase", "literal", "meaning"],
    },
  },

  required: [
    "topic","subtitle","emoji","tags","difficulty_level","estimated_reading_minutes",
    "introduction","key_takeaways",
    "deep_dive_title","deep_dive",
    "grammar","common_mistakes","useful_phrases",
    "mini_story","dialogue",
    "closing_reflection_title","closing_reflection",
    "culture","cultural_notes",
    "proverb","idiom",
  ],
};

// ─── JSON Parsing Helpers ─────────────────────────────────────────────────────

const VALID_DIFF_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;

/**
 * Tries to parse a JSON string. If parsing fails, attempts to extract a JSON
 * object by finding the first { ... } block. Returns the parsed object or
 * throws if no valid JSON can be recovered.
 */
function tryParseJSON(text: string): Record<string, unknown> {
  // First, try a direct parse
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    // Try to find a JSON object in the text (e.g. response wrapped in markdown)
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as Record<string, unknown>;
      } catch {
        // Incomplete JSON — try to recover by trimming to last complete value
        const raw = match[0];
        // Try progressively shorter substrings to find parseable JSON
        for (let i = raw.length - 1; i > 0; i--) {
          if (raw[i] === '}' || raw[i] === ']' || raw[i] === '"') {
            try {
              // Attempt to close all open braces/brackets
              const sub = raw.slice(0, i + 1);
              // Count unmatched braces to try auto-closing
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
  // Check for exact match first
  if ((VALID_DIFF_LEVELS as readonly string[]).includes(raw)) return raw;
  // Try to extract first valid level from compound strings like "B1-B2" or "B1/B2"
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

// ─── API Call ─────────────────────────────────────────────────────────────────

export const generateLesson = async (topic: string, apiKey: string, model?: string): Promise<Lesson> => {
  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const response = await client.chat.completions.create({
    model: model || getSavedModel() || DEFAULT_MODEL,
    messages: [
      {
        role: "system",
        content: `You are a world-class bilingual (Italian/Polish) editorial expert, cultural authority, and master language educator with 30 years of experience teaching Italian to Polish speakers.

You produce premium, literary-quality learning resources that feel like an issue of a prestigious culture magazine combined with a rigorous academic reference.

Your guiding principles:
— DEPTH over brevity: every field must be thorough, substantive, and information-dense. Short answers are a failure.
— CULTURAL AUTHENTICITY: Italy is not monolithic — mention regions, dialects, social classes, historical periods.
— LINGUISTIC PRECISION: distinguish registers, connotations, and pragmatic constraints scrupulously.
— POLISH SPEAKER FOCUS: always identify specifically which Polish structures or words cause interference.
— LITERARY QUALITY: your Italian must be native, varied, and beautiful. Your Polish must be elegant and precise.
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

DO NOT produce shortened, telegraphic, or bullet-point-style content in any field that requests prose.`,
      },
      {
        role: "user",
        content: `Create a comprehensive, premium bilingual (Italian–Polish) learning resource on the topic: "${topic}".

Target audience: Polish adults learning Italian (B1–B2 level).
Tone: Engaging, magazine-quality, culturally immersive, intellectually serious.

MANDATORY requirements — failure to meet ANY of these is unacceptable:
1. ALL prose fields must be long and substantive — see the length requirements in the system prompt.
2. ALL explanations and prose must be provided in BOTH Italian and Polish — every "Bilingual" field has "it" and "pl" keys.
3. DO NOT include a "vocabulary" field — vocabulary is generated separately.
4. Grammar: 3 sections minimum, each with ≥ 5-sentence explanations and ≥ 4 example pairs.
5. Common mistakes: SPECIFIC to Polish speakers — name the Polish word causing interference. ≥ 5 mistakes total.
6. Mini-story: ≥ 200 words per language, literary quality, named Italian characters, specific Italian location.
7. Dialogue: ≥ 16 lines, authentic native Italian, multi-sentence utterances, grammar notes on ≥ 6 lines. This must feel like a complete dramatic scene, not a textbook exchange.
8. Culture content: ≥ 250 words per language — historical depth, regional specifics, contemporary relevance.
9. Cultural notes: 3–4 notes, each ≥ 3 sentences per language.
10. Proverb: must be a REAL Italian proverb. Meaning field ≥ 4 sentences per language.
11. Idiom: genuine "modo di dire". Origin story required (≥ 3 sentences per language).
12. Phrases: 8 items, each with detailed context ≥ 2–3 sentences per language.
13. deep_dive_title: concise encyclopedic section title (3–7 words, topic-specific, like an encyclopedia chapter). deep_dive: ≥ 250 words per language — authoritative, encyclopedic analysis. NO "lesson/journey" framing — write as a reference work.
14. closing_reflection_title: concise encyclopedic section title. closing_reflection: ≥ 200 words per language — scholarly synthesis of linguistic, cultural and grammatical dimensions. NO "lesson/journey" framing.

CRITICAL — You MUST respond with a single valid JSON object. No markdown, no code fences, no extra text — ONLY the raw JSON.

The JSON must match this exact structure (do NOT include a "vocabulary" field — it is generated separately):
{
  "topic": {"it": "...", "pl": "..."},
  "subtitle": {"it": "...", "pl": "..."},
  "emoji": "🍕",
  "tags": ["tag1", "tag2", "tag3"],
  "difficulty_level": "B1",
  "estimated_reading_minutes": 12,
  "introduction": {"it": "...", "pl": "..."},
  "key_takeaways": [{"it": "...", "pl": "..."}, {"it": "...", "pl": "..."}, {"it": "...", "pl": "..."}],
  "trivia": {"it": "...", "pl": "..."},
  "regional_notes": {"it": "...", "pl": "..."},
  "deep_dive_title": {"it": "...", "pl": "..."},
  "deep_dive": {"it": "...", "pl": "..."},
  "grammar": [
    {
      "title": {"it": "...", "pl": "..."},
      "explanation": {"it": "...", "pl": "..."},
      "pattern": "...",
      "examples": [{"it": "...", "pl": "...", "breakdown": "..."}],
      "exceptions": [{"it": "...", "pl": "..."}]
    }
  ],
  "common_mistakes": [
    {
      "category": "false_friend|grammar|pronunciation|usage|spelling",
      "wrong": "...", "correct": "...",
      "explanation": {"it": "...", "pl": "..."},
      "mnemonic": {"it": "...", "pl": "..."}
    }
  ],
  "useful_phrases": [
    {
      "expression": "...", "translation": "...",
      "register": "formal|informal|colloquial|literary|regional|vulgar",
      "context": {"it": "...", "pl": "..."},
      "example_usage": {"it": "...", "pl": "..."}
    }
  ],
  "mini_story": {
    "title": {"it": "...", "pl": "..."},
    "text": {"it": "...", "pl": "..."},
    "moral": {"it": "...", "pl": "..."}
  },
  "dialogue": {
    "title": {"it": "...", "pl": "..."},
    "setting": {"it": "...", "pl": "..."},
    "lines": [
      {
        "speaker": "...", "text": {"it": "...", "pl": "..."},
        "tone": "neutral|happy|surprised|formal|casual|ironic|questioning|emphatic",
        "annotation": {"it": "...", "pl": "..."},
        "grammar_note": {"it": "...", "pl": "..."}
      }
    ],
    "vocabulary_highlight": ["...", "..."]
  },
  "closing_reflection_title": {"it": "...", "pl": "..."},
  "closing_reflection": {"it": "...", "pl": "..."},
  "culture": {
    "title": {"it": "...", "pl": "..."},
    "content": {"it": "...", "pl": "..."},
    "did_you_know": {"it": "...", "pl": "..."}
  },
  "cultural_notes": [
    {
      "icon": "🎭",
      "title": {"it": "...", "pl": "..."},
      "content": {"it": "...", "pl": "..."},
      "region": "..."
    }
  ],
  "proverb": {
    "text": "...",
    "translation": {"it": "...", "pl": "..."},
    "meaning": {"it": "...", "pl": "..."}
  },
  "idiom": {
    "phrase": "...",
    "literal": {"it": "...", "pl": "..."},
    "meaning": {"it": "...", "pl": "..."},
    "origin": {"it": "...", "pl": "..."},
    "example_sentence": {"it": "...", "pl": "..."}
  }
}

Remember: this resource must be so good that a learner could use it as their primary reference for this topic.`,
      },
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
  const vocabulary = await generateItalianVocabulary(data, apiKey, model || getSavedModel() || DEFAULT_MODEL, client);

  return {
    ...data,
    vocabulary,
    id: typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: Date.now(),
    targetLang: 'it' as const,
  } as Lesson;
};

// ─── Italian Vocabulary Generation ────────────────────────────────────────────

async function generateItalianVocabulary(
  lessonData: Record<string, unknown>,
  apiKey: string,
  model: string,
  client?: OpenAI
): Promise<import('../types').VocabularyItem[]> {
  const c = client ?? new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey, dangerouslyAllowBrowser: true });

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

  const response = await c.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: `You are a specialist Italian lexicographer and vocabulary teacher for Polish speakers. You create precise, detailed, encyclopedic vocabulary entries for language learners. Your entries are accurate, pedagogically rich, and directly relevant to the topic at hand. You also provide English translations for each item.`,
      },
      {
        role: "user",
        content: `Based on the following Italian lesson content, generate a vocabulary list of EXACTLY 15 to 25 items (no fewer than 15, no more than 25). Choose the most important, topic-relevant Italian words and phrases — a mix of nouns, verbs, adjectives, adverbs, and set phrases. Prioritise words that actually appear or are strongly implied in the lesson text.

LESSON CONTENT:
${lessonSummary}

For each vocabulary item provide:
- word: the Italian word/phrase
- ipa: full IPA phonetic transcription (e.g. /laˈvoːro/)
- gender: "m", "f", "pl", or "invariant" (for nouns)
- plural: plural form (for nouns)
- part_of_speech: one of noun|verb|adjective|adverb|phrase|interjection|conjunction|preposition
- register: one of formal|informal|colloquial|literary|regional|vulgar
- translation: Polish translation (primary meaning, with nuances noted)
- english_translation: English translation of the word
- definition: {"it": "2–3 sentence definition in Italian explaining usage and nuances", "pl": "2–3 sentence definition in Polish"}
- context_sentence: {"it": "A vivid, culturally specific Italian example sentence", "pl": "Polish translation of the sentence"}
- audio_hint: pronunciation tip for Polish speakers (e.g. "gli = ʎ, jak polskie ль")
- etymology: {"it": "2+ sentence etymology in Italian", "pl": "2+ sentence etymology in Polish"}
- synonyms: array of 3–4 Italian synonyms with register notes
- antonyms: array of 2–3 Italian antonyms (if applicable)
- word_family: array of 3–4 related forms: [{"form": "...", "type": "noun/verb/adj", "translation": "Polish gloss"}]

CRITICAL: Respond with ONLY a raw JSON object in this exact format:
{
  "vocabulary": [
    {
      "word": "...", "ipa": "...", "gender": "m|f|pl|invariant", "plural": "...",
      "part_of_speech": "noun|verb|...",
      "register": "formal|informal|...",
      "translation": "...",
      "english_translation": "...",
      "definition": {"it": "...", "pl": "..."},
      "context_sentence": {"it": "...", "pl": "..."},
      "audio_hint": "...",
      "etymology": {"it": "...", "pl": "..."},
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

// ─── English Lesson Schema ────────────────────────────────────────────────────

const englishLessonSchema = {
  ...lessonSchema,
  properties: {
    ...lessonSchema.properties,
    topic: { type: "object", properties: { en: { type: "string" }, pl: { type: "string" } }, required: ["en", "pl"] },
    subtitle: { type: "object", properties: { en: { type: "string" }, pl: { type: "string" } }, required: ["en", "pl"] },
  },
};

// ─── Generate English Lesson ──────────────────────────────────────────────────

export const generateEnglishLesson = async (topic: string, apiKey: string, model?: string): Promise<Lesson> => {
  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const response = await client.chat.completions.create({
    model: model || getSavedModel() || DEFAULT_MODEL,
    messages: [
      {
        role: "system",
        content: `You are a world-class bilingual (English/Polish) editorial expert, cultural authority, and master language educator with 30 years of experience teaching English to Polish speakers.

You produce premium, literary-quality learning resources that feel like an issue of a prestigious culture magazine combined with a rigorous academic reference.

Your guiding principles:
— DEPTH over brevity: every field must be thorough, substantive, and information-dense. Short answers are a failure.
— CULTURAL AUTHENTICITY: English-speaking world is diverse — mention British, American, Australian, and other varieties.
— LINGUISTIC PRECISION: distinguish registers, connotations, and pragmatic constraints scrupulously.
— POLISH SPEAKER FOCUS: always identify specifically which Polish structures or words cause interference.
— LITERARY QUALITY: your English must be native, varied, and beautiful. Your Polish must be elegant and precise.
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

IMPORTANT: All bilingual fields use "en" (not "it") for the English content, and "pl" for Polish.
DO NOT produce shortened, telegraphic, or bullet-point-style content in any field that requests prose.`,
      },
      {
        role: "user",
        content: `Create a comprehensive, premium bilingual (English–Polish) learning resource on the topic: "${topic}".

Target audience: Polish adults learning English (B1–B2 level).
Tone: Engaging, magazine-quality, culturally immersive, intellectually serious.

MANDATORY requirements — failure to meet ANY of these is unacceptable:
1. ALL prose fields must be long and substantive.
2. ALL explanations and prose must be provided in BOTH English and Polish — every "Bilingual" field has "en" and "pl" keys (NOT "it").
3. DO NOT include a "vocabulary" field — vocabulary is generated separately.
4. Grammar: 3 sections minimum, each with ≥ 5-sentence explanations and ≥ 4 example pairs.
5. Common mistakes: SPECIFIC to Polish speakers — name the Polish word causing interference. ≥ 5 mistakes total.
6. Mini-story: ≥ 200 words per language, literary quality, named characters.
7. Dialogue: ≥ 16 lines, authentic native English, multi-sentence utterances, grammar notes on ≥ 6 lines.
8. Culture content: ≥ 250 words per language — historical depth, regional specifics, contemporary relevance (British vs American perspective where relevant).
9. Cultural notes: 3–4 notes, each ≥ 3 sentences per language.
10. Proverb: must be a REAL English proverb. Meaning field ≥ 4 sentences per language.
11. Idiom: genuine English idiom. Origin story required (≥ 3 sentences per language).
12. Phrases: 8 items, each with detailed context ≥ 2–3 sentences per language.
13. deep_dive_title: concise encyclopedic section title (3–7 words). deep_dive: ≥ 250 words per language — authoritative, encyclopedic analysis. NO "lesson/journey" framing.
14. closing_reflection_title: concise encyclopedic section title. closing_reflection: ≥ 200 words per language — scholarly synthesis. NO "lesson/journey" framing.

CRITICAL — You MUST respond with a single valid JSON object. No markdown, no code fences, no extra text — ONLY the raw JSON.

Use "en" key (not "it") for English content in all Bilingual fields. Do NOT include a "vocabulary" field:
{
  "topic": {"en": "...", "pl": "..."},
  "subtitle": {"en": "...", "pl": "..."},
  "emoji": "🇬🇧",
  "tags": ["tag1", "tag2", "tag3"],
  "difficulty_level": "B1",
  "estimated_reading_minutes": 12,
  "introduction": {"en": "...", "pl": "..."},
  "key_takeaways": [{"en": "...", "pl": "..."}, {"en": "...", "pl": "..."}, {"en": "...", "pl": "..."}],
  "trivia": {"en": "...", "pl": "..."},
  "regional_notes": {"en": "...", "pl": "..."},
  "deep_dive_title": {"en": "...", "pl": "..."},
  "deep_dive": {"en": "...", "pl": "..."},
  "grammar": [
    {
      "title": {"en": "...", "pl": "..."},
      "explanation": {"en": "...", "pl": "..."},
      "pattern": "...",
      "examples": [{"en": "...", "pl": "...", "breakdown": "..."}],
      "exceptions": [{"en": "...", "pl": "..."}]
    }
  ],
  "common_mistakes": [
    {
      "category": "false_friend|grammar|pronunciation|usage|spelling",
      "wrong": "...", "correct": "...",
      "explanation": {"en": "...", "pl": "..."},
      "mnemonic": {"en": "...", "pl": "..."}
    }
  ],
  "useful_phrases": [
    {
      "expression": "...", "translation": "...",
      "register": "formal|informal|colloquial|literary|regional|vulgar",
      "context": {"en": "...", "pl": "..."},
      "example_usage": {"en": "...", "pl": "..."}
    }
  ],
  "mini_story": {
    "title": {"en": "...", "pl": "..."},
    "text": {"en": "...", "pl": "..."},
    "moral": {"en": "...", "pl": "..."}
  },
  "dialogue": {
    "title": {"en": "...", "pl": "..."},
    "setting": {"en": "...", "pl": "..."},
    "lines": [
      {
        "speaker": "...", "text": {"en": "...", "pl": "..."},
        "tone": "neutral|happy|surprised|formal|casual|ironic|questioning|emphatic",
        "annotation": {"en": "...", "pl": "..."},
        "grammar_note": {"en": "...", "pl": "..."}
      }
    ],
    "vocabulary_highlight": ["...", "..."]
  },
  "closing_reflection_title": {"en": "...", "pl": "..."},
  "closing_reflection": {"en": "...", "pl": "..."},
  "culture": {
    "title": {"en": "...", "pl": "..."},
    "content": {"en": "...", "pl": "..."},
    "did_you_know": {"en": "...", "pl": "..."}
  },
  "cultural_notes": [
    {
      "icon": "🎭",
      "title": {"en": "...", "pl": "..."},
      "content": {"en": "...", "pl": "..."},
      "region": "..."
    }
  ],
  "proverb": {
    "text": "...",
    "translation": {"en": "...", "pl": "..."},
    "meaning": {"en": "...", "pl": "..."}
  },
  "idiom": {
    "phrase": "...",
    "literal": {"en": "...", "pl": "..."},
    "meaning": {"en": "...", "pl": "..."},
    "origin": {"en": "...", "pl": "..."},
    "example_sentence": {"en": "...", "pl": "..."}
  }
}

Remember: this resource must be so good that a learner could use it as their primary reference for this topic.`,
      },
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
  const vocabulary = await generateEnglishVocabulary(data, apiKey, model || getSavedModel() || DEFAULT_MODEL, client);

  return {
    ...data,
    vocabulary,
    id: typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: Date.now(),
    targetLang: 'en' as const,
  } as Lesson;
};

// ─── English Vocabulary Generation ────────────────────────────────────────────

async function generateEnglishVocabulary(
  lessonData: Record<string, unknown>,
  apiKey: string,
  model: string,
  client?: OpenAI
): Promise<import('../types').VocabularyItem[]> {
  const c = client ?? new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey, dangerouslyAllowBrowser: true });

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

  const response = await c.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: `You are a specialist English lexicographer and vocabulary teacher for Polish speakers. You create precise, detailed, encyclopedic vocabulary entries for language learners. Your entries are accurate, pedagogically rich, and directly relevant to the topic at hand.`,
      },
      {
        role: "user",
        content: `Based on the following English lesson content, generate a vocabulary list of EXACTLY 15 to 25 items (no fewer than 15, no more than 25). Choose the most important, topic-relevant English words and phrases — a mix of nouns, verbs, adjectives, adverbs, and set phrases. Prioritise words that actually appear or are strongly implied in the lesson text.

LESSON CONTENT:
${lessonSummary}

For each vocabulary item provide:
- word: the English word/phrase
- ipa: full IPA phonetic transcription
- part_of_speech: one of noun|verb|adjective|adverb|phrase|interjection|conjunction|preposition
- register: one of formal|informal|colloquial|literary|regional|vulgar
- translation: Polish translation (primary meaning, with nuances noted)
- definition: {"en": "2–3 sentence definition in English explaining usage and nuances", "pl": "2–3 sentence definition in Polish"}
- context_sentence: {"en": "A vivid, culturally specific English example sentence", "pl": "Polish translation of the sentence"}
- audio_hint: pronunciation tip for Polish speakers
- etymology: {"en": "2+ sentence etymology in English", "pl": "2+ sentence etymology in Polish"}
- synonyms: array of 3–4 English synonyms with register notes
- antonyms: array of 2–3 English antonyms (if applicable)
- word_family: array of 3–4 related forms: [{"form": "...", "type": "noun/verb/adj", "translation": "Polish gloss"}]

CRITICAL: Respond with ONLY a raw JSON object in this exact format:
{
  "vocabulary": [
    {
      "word": "...", "ipa": "...",
      "part_of_speech": "noun|verb|...",
      "register": "formal|informal|...",
      "translation": "...",
      "definition": {"en": "...", "pl": "..."},
      "context_sentence": {"en": "...", "pl": "..."},
      "audio_hint": "...",
      "etymology": {"en": "...", "pl": "..."},
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
};

// ─── Generate French Lesson ───────────────────────────────────────────────────

export const generateFrenchLesson = async (topic: string, apiKey: string, model?: string): Promise<Lesson> => {
  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const response = await client.chat.completions.create({
    model: model || getSavedModel() || DEFAULT_MODEL,
    messages: [
      {
        role: "system",
        content: `You are a world-class bilingual (French/Polish) editorial expert, cultural authority, and master language educator with 30 years of experience teaching French to Polish speakers.

You produce premium, literary-quality learning resources that feel like an issue of a prestigious culture magazine combined with a rigorous academic reference.

Your guiding principles:
— DEPTH over brevity: every field must be thorough, substantive, and information-dense. Short answers are a failure.
— CULTURAL AUTHENTICITY: French-speaking world is diverse — mention France, Belgium, Switzerland, Quebec, and Francophone Africa where relevant.
— LINGUISTIC PRECISION: distinguish registers, connotations, and pragmatic constraints scrupulously.
— POLISH SPEAKER FOCUS: always identify specifically which Polish structures or words cause interference.
— LITERARY QUALITY: your French must be native, varied, and beautiful. Your Polish must be elegant and precise.
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

IMPORTANT: All bilingual fields use "fr" (not "it" or "en") for the French content, and "pl" for Polish.
DO NOT produce shortened, telegraphic, or bullet-point-style content in any field that requests prose.`,
      },
      {
        role: "user",
        content: `Create a comprehensive, premium bilingual (French–Polish) learning resource on the topic: "${topic}".

Target audience: Polish adults learning French (B1–B2 level).
Tone: Engaging, magazine-quality, culturally immersive, intellectually serious.

MANDATORY requirements — failure to meet ANY of these is unacceptable:
1. ALL prose fields must be long and substantive.
2. ALL explanations and prose must be provided in BOTH French and Polish — every "Bilingual" field has "fr" and "pl" keys (NOT "it" or "en").
3. DO NOT include a "vocabulary" field — vocabulary is generated separately.
4. Grammar: 3 sections minimum, each with ≥ 5-sentence explanations and ≥ 4 example pairs.
5. Common mistakes: SPECIFIC to Polish speakers — name the Polish word causing interference. ≥ 5 mistakes total.
6. Mini-story: ≥ 200 words per language, literary quality, named characters set in a French-speaking country.
7. Dialogue: ≥ 16 lines, authentic native French, multi-sentence utterances, grammar notes on ≥ 6 lines.
8. Culture content: ≥ 250 words per language — historical depth, regional specifics, contemporary relevance (French vs Belgian vs Quebec perspective where relevant).
9. Cultural notes: 3–4 notes, each ≥ 3 sentences per language.
10. Proverb: must be a REAL French proverb. Meaning field ≥ 4 sentences per language.
11. Idiom: genuine French idiom ("expression idiomatique"). Origin story required (≥ 3 sentences per language).
12. Phrases: 8 items, each with detailed context ≥ 2–3 sentences per language.
13. deep_dive_title: concise encyclopedic section title (3–7 words). deep_dive: ≥ 250 words per language — authoritative, encyclopedic analysis. NO "lesson/journey" framing.
14. closing_reflection_title: concise encyclopedic section title. closing_reflection: ≥ 200 words per language — scholarly synthesis. NO "lesson/journey" framing.

CRITICAL — You MUST respond with a single valid JSON object. No markdown, no code fences, no extra text — ONLY the raw JSON.

Use "fr" key (not "it" or "en") for French content in all Bilingual fields. Do NOT include a "vocabulary" field:
{
  "topic": {"fr": "...", "pl": "..."},
  "subtitle": {"fr": "...", "pl": "..."},
  "emoji": "🇫🇷",
  "tags": ["tag1", "tag2", "tag3"],
  "difficulty_level": "B1",
  "estimated_reading_minutes": 12,
  "introduction": {"fr": "...", "pl": "..."},
  "key_takeaways": [{"fr": "...", "pl": "..."}, {"fr": "...", "pl": "..."}, {"fr": "...", "pl": "..."}],
  "trivia": {"fr": "...", "pl": "..."},
  "regional_notes": {"fr": "...", "pl": "..."},
  "deep_dive_title": {"fr": "...", "pl": "..."},
  "deep_dive": {"fr": "...", "pl": "..."},
  "grammar": [
    {
      "title": {"fr": "...", "pl": "..."},
      "explanation": {"fr": "...", "pl": "..."},
      "pattern": "...",
      "examples": [{"fr": "...", "pl": "...", "breakdown": "..."}],
      "exceptions": [{"fr": "...", "pl": "..."}]
    }
  ],
  "common_mistakes": [
    {
      "category": "false_friend|grammar|pronunciation|usage|spelling",
      "wrong": "...", "correct": "...",
      "explanation": {"fr": "...", "pl": "..."},
      "mnemonic": {"fr": "...", "pl": "..."}
    }
  ],
  "useful_phrases": [
    {
      "expression": "...", "translation": "...",
      "register": "formal|informal|colloquial|literary|regional|vulgar",
      "context": {"fr": "...", "pl": "..."},
      "example_usage": {"fr": "...", "pl": "..."}
    }
  ],
  "mini_story": {
    "title": {"fr": "...", "pl": "..."},
    "text": {"fr": "...", "pl": "..."},
    "moral": {"fr": "...", "pl": "..."}
  },
  "dialogue": {
    "title": {"fr": "...", "pl": "..."},
    "setting": {"fr": "...", "pl": "..."},
    "lines": [
      {
        "speaker": "...", "text": {"fr": "...", "pl": "..."},
        "tone": "neutral|happy|surprised|formal|casual|ironic|questioning|emphatic",
        "annotation": {"fr": "...", "pl": "..."},
        "grammar_note": {"fr": "...", "pl": "..."}
      }
    ],
    "vocabulary_highlight": ["...", "..."]
  },
  "closing_reflection_title": {"fr": "...", "pl": "..."},
  "closing_reflection": {"fr": "...", "pl": "..."},
  "culture": {
    "title": {"fr": "...", "pl": "..."},
    "content": {"fr": "...", "pl": "..."},
    "did_you_know": {"fr": "...", "pl": "..."}
  },
  "cultural_notes": [
    {
      "icon": "🎭",
      "title": {"fr": "...", "pl": "..."},
      "content": {"fr": "...", "pl": "..."},
      "region": "..."
    }
  ],
  "proverb": {
    "text": "...",
    "translation": {"fr": "...", "pl": "..."},
    "meaning": {"fr": "...", "pl": "..."}
  },
  "idiom": {
    "phrase": "...",
    "literal": {"fr": "...", "pl": "..."},
    "meaning": {"fr": "...", "pl": "..."},
    "origin": {"fr": "...", "pl": "..."},
    "example_sentence": {"fr": "...", "pl": "..."}
  }
}

Remember: this resource must be so good that a learner could use it as their primary reference for this topic.`,
      },
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
  const vocabulary = await generateFrenchVocabulary(data, apiKey, model || getSavedModel() || DEFAULT_MODEL, client);

  return {
    ...data,
    vocabulary,
    id: typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: Date.now(),
    targetLang: 'fr' as const,
  } as Lesson;
};

// ─── French Vocabulary Generation ─────────────────────────────────────────────

async function generateFrenchVocabulary(
  lessonData: Record<string, unknown>,
  apiKey: string,
  model: string,
  client?: OpenAI
): Promise<import('../types').VocabularyItem[]> {
  const c = client ?? new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey, dangerouslyAllowBrowser: true });

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

  const response = await c.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: `You are a specialist French lexicographer and vocabulary teacher for Polish speakers. You create precise, detailed, encyclopedic vocabulary entries for language learners. Your entries are accurate, pedagogically rich, and directly relevant to the topic at hand.`,
      },
      {
        role: "user",
        content: `Based on the following French lesson content, generate a vocabulary list of EXACTLY 15 to 25 items (no fewer than 15, no more than 25). Choose the most important, topic-relevant French words and phrases — a mix of nouns, verbs, adjectives, adverbs, and set phrases. Prioritise words that actually appear or are strongly implied in the lesson text.

LESSON CONTENT:
${lessonSummary}

For each vocabulary item provide:
- word: the French word/phrase
- ipa: full IPA phonetic transcription
- gender: "m", "f", "pl", or "invariant" (for nouns)
- plural: plural form (for nouns)
- part_of_speech: one of noun|verb|adjective|adverb|phrase|interjection|conjunction|preposition
- register: one of formal|informal|colloquial|literary|regional|vulgar
- translation: Polish translation (primary meaning, with nuances noted)
- definition: {"fr": "2–3 sentence definition in French explaining usage and nuances", "pl": "2–3 sentence definition in Polish"}
- context_sentence: {"fr": "A vivid, culturally specific French example sentence", "pl": "Polish translation of the sentence"}
- audio_hint: pronunciation tip for Polish speakers (e.g. "ou = /u/, jak polskie 'u' — nie wymawiaj jak 'ou' w polskim")
- etymology: {"fr": "2+ sentence etymology in French", "pl": "2+ sentence etymology in Polish"}
- synonyms: array of 3–4 French synonyms with register notes
- antonyms: array of 2–3 French antonyms (if applicable)
- word_family: array of 3–4 related forms: [{"form": "...", "type": "noun/verb/adj", "translation": "Polish gloss"}]

CRITICAL: Respond with ONLY a raw JSON object in this exact format:
{
  "vocabulary": [
    {
      "word": "...", "ipa": "...", "gender": "m|f|pl|invariant", "plural": "...",
      "part_of_speech": "noun|verb|...",
      "register": "formal|informal|...",
      "translation": "...",
      "definition": {"fr": "...", "pl": "..."},
      "context_sentence": {"fr": "...", "pl": "..."},
      "audio_hint": "...",
      "etymology": {"fr": "...", "pl": "..."},
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

// ─── Generate Spanish Lesson ──────────────────────────────────────────────────

export const generateSpanishLesson = async (topic: string, apiKey: string, model?: string): Promise<Lesson> => {
  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const response = await client.chat.completions.create({
    model: model || getSavedModel() || DEFAULT_MODEL,
    messages: [
      {
        role: "system",
        content: `You are a world-class bilingual (Spanish/Polish) editorial expert, cultural authority, and master language educator with 30 years of experience teaching Spanish to Polish speakers.

You produce premium, literary-quality learning resources that feel like an issue of a prestigious culture magazine combined with a rigorous academic reference.

Your guiding principles:
— DEPTH over brevity: every field must be thorough, substantive, and information-dense. Short answers are a failure.
— CULTURAL AUTHENTICITY: Spanish-speaking world is diverse — mention Spain, Mexico, Argentina, Colombia, and other regions where relevant.
— LINGUISTIC PRECISION: distinguish registers, connotations, and pragmatic constraints scrupulously.
— POLISH SPEAKER FOCUS: always identify specifically which Polish structures or words cause interference.
— LITERARY QUALITY: your Spanish must be native, varied, and beautiful. Your Polish must be elegant and precise.
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

IMPORTANT: All bilingual fields use "es" (not "it", "en", or "fr") for the Spanish content, and "pl" for Polish.
DO NOT produce shortened, telegraphic, or bullet-point-style content in any field that requests prose.`,
      },
      {
        role: "user",
        content: `Create a comprehensive, premium bilingual (Spanish–Polish) learning resource on the topic: "${topic}".

Target audience: Polish adults learning Spanish (B1–B2 level).
Tone: Engaging, magazine-quality, culturally immersive, intellectually serious.

MANDATORY requirements — failure to meet ANY of these is unacceptable:
1. ALL prose fields must be long and substantive.
2. ALL explanations and prose must be provided in BOTH Spanish and Polish — every "Bilingual" field has "es" and "pl" keys (NOT "it", "en", or "fr").
3. DO NOT include a "vocabulary" field — vocabulary is generated separately.
4. Grammar: 3 sections minimum, each with ≥ 5-sentence explanations and ≥ 4 example pairs.
5. Common mistakes: SPECIFIC to Polish speakers — name the Polish word causing interference. ≥ 5 mistakes total.
6. Mini-story: ≥ 200 words per language, literary quality, named characters set in a Spanish-speaking country.
7. Dialogue: ≥ 16 lines, authentic native Spanish, multi-sentence utterances, grammar notes on ≥ 6 lines.
8. Culture content: ≥ 250 words per language — historical depth, regional specifics, contemporary relevance (Spain vs Latin America perspective where relevant).
9. Cultural notes: 3–4 notes, each ≥ 3 sentences per language.
10. Proverb: must be a REAL Spanish proverb. Meaning field ≥ 4 sentences per language.
11. Idiom: genuine Spanish idiom ("expresión idiomática"). Origin story required (≥ 3 sentences per language).
12. Phrases: 8 items, each with detailed context ≥ 2–3 sentences per language.
13. deep_dive_title: concise encyclopedic section title (3–7 words). deep_dive: ≥ 250 words per language — authoritative, encyclopedic analysis. NO "lesson/journey" framing.
14. closing_reflection_title: concise encyclopedic section title. closing_reflection: ≥ 200 words per language — scholarly synthesis. NO "lesson/journey" framing.

CRITICAL — You MUST respond with a single valid JSON object. No markdown, no code fences, no extra text — ONLY the raw JSON.

Use "es" key (not "it", "en", or "fr") for Spanish content in all Bilingual fields. Do NOT include a "vocabulary" field:
{
  "topic": {"es": "...", "pl": "..."},
  "subtitle": {"es": "...", "pl": "..."},
  "emoji": "🇪🇸",
  "tags": ["tag1", "tag2", "tag3"],
  "difficulty_level": "B1",
  "estimated_reading_minutes": 12,
  "introduction": {"es": "...", "pl": "..."},
  "key_takeaways": [{"es": "...", "pl": "..."}, {"es": "...", "pl": "..."}, {"es": "...", "pl": "..."}],
  "trivia": {"es": "...", "pl": "..."},
  "regional_notes": {"es": "...", "pl": "..."},
  "deep_dive_title": {"es": "...", "pl": "..."},
  "deep_dive": {"es": "...", "pl": "..."},
  "grammar": [...],
  "common_mistakes": [...],
  "useful_phrases": [...],
  "mini_story": {"title": {"es": "...", "pl": "..."}, "text": {"es": "...", "pl": "..."}, "moral": {"es": "...", "pl": "..."}},
  "dialogue": {"title": {"es": "...", "pl": "..."}, "setting": {"es": "...", "pl": "..."}, "lines": [...], "vocabulary_highlight": ["..."]},
  "closing_reflection_title": {"es": "...", "pl": "..."},
  "closing_reflection": {"es": "...", "pl": "..."},
  "culture": {"title": {"es": "...", "pl": "..."}, "content": {"es": "...", "pl": "..."}, "did_you_know": {"es": "...", "pl": "..."}},
  "cultural_notes": [{"icon": "🎭", "title": {"es": "...", "pl": "..."}, "content": {"es": "...", "pl": "..."}, "region": "..."}],
  "proverb": {"text": "...", "translation": {"es": "...", "pl": "..."}, "meaning": {"es": "...", "pl": "..."}},
  "idiom": {"phrase": "...", "literal": {"es": "...", "pl": "..."}, "meaning": {"es": "...", "pl": "..."}, "origin": {"es": "...", "pl": "..."}, "example_sentence": {"es": "...", "pl": "..."}}
}

Remember: this resource must be so good that a learner could use it as their primary reference for this topic.`,
      },
    ],
    response_format: { type: "json_object" },
    // OpenRouter extensions: heal malformed JSON; route only to JSON-capable providers
    plugins: [{ id: "response-healing" }],
    provider: { require_parameters: true },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  const spanishText = response.choices[0]?.message?.content;
  if (!spanishText) throw new Error("Empty response from API");

  const data = tryParseJSON(spanishText);

  // Validate required fields
  const REQUIRED = ['topic','subtitle','emoji','tags','difficulty_level','introduction','key_takeaways','grammar','common_mistakes','useful_phrases','mini_story','dialogue','closing_reflection','culture','cultural_notes','proverb','idiom'];
  const missing = findMissingRequiredFields(data, REQUIRED);
  if (missing.length > 0) {
    throw new Error(`Incomplete lesson JSON — missing fields: ${missing.join(', ')}`);
  }

  // Normalize difficulty level to single CEFR code
  data.difficulty_level = normalizeDifficultyLevel(data.difficulty_level);

  // Generate vocabulary as a separate request with full lesson context
  const vocabulary = await generateSpanishVocabulary(data, apiKey, model || getSavedModel() || DEFAULT_MODEL, client);

  return {
    ...data,
    vocabulary,
    id: typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: Date.now(),
    targetLang: 'es' as const,
  } as Lesson;
};

// ─── Spanish Vocabulary Generation ────────────────────────────────────────────

async function generateSpanishVocabulary(
  lessonData: Record<string, unknown>,
  apiKey: string,
  model: string,
  client?: OpenAI
): Promise<import('../types').VocabularyItem[]> {
  const c = client ?? new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey, dangerouslyAllowBrowser: true });

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

  const response = await c.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: `You are a specialist Spanish lexicographer and vocabulary teacher for Polish speakers. You create precise, detailed, encyclopedic vocabulary entries for language learners. Your entries are accurate, pedagogically rich, and directly relevant to the topic at hand.`,
      },
      {
        role: "user",
        content: `Based on the following Spanish lesson content, generate a vocabulary list of EXACTLY 15 to 25 items (no fewer than 15, no more than 25). Choose the most important, topic-relevant Spanish words and phrases — a mix of nouns, verbs, adjectives, adverbs, and set phrases.

LESSON CONTENT:
${lessonSummary}

For each vocabulary item provide:
- word: the Spanish word/phrase
- ipa: full IPA phonetic transcription
- gender: "m", "f", "pl", or "invariant" (for nouns)
- plural: plural form (for nouns)
- part_of_speech: one of noun|verb|adjective|adverb|phrase|interjection|conjunction|preposition
- register: one of formal|informal|colloquial|literary|regional|vulgar
- translation: Polish translation
- definition: {"es": "2–3 sentence definition in Spanish", "pl": "2–3 sentence definition in Polish"}
- context_sentence: {"es": "A vivid Spanish example sentence", "pl": "Polish translation"}
- audio_hint: pronunciation tip for Polish speakers
- etymology: {"es": "etymology in Spanish", "pl": "etymology in Polish"}
- synonyms: array of 3–4 Spanish synonyms
- antonyms: array of 2–3 Spanish antonyms
- word_family: array of 3–4 related forms: [{"form": "...", "type": "...", "translation": "..."}]

CRITICAL: Respond with ONLY a raw JSON object:
{
  "vocabulary": [
    {
      "word": "...", "ipa": "...", "gender": "m|f|pl|invariant", "plural": "...",
      "part_of_speech": "noun|verb|...", "register": "formal|informal|...",
      "translation": "...",
      "definition": {"es": "...", "pl": "..."},
      "context_sentence": {"es": "...", "pl": "..."},
      "audio_hint": "...",
      "etymology": {"es": "...", "pl": "..."},
      "synonyms": ["...", "..."], "antonyms": ["...", "..."],
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

// ─── German Lesson Generation ─────────────────────────────────────────────────

export const generateGermanLesson = async (topic: string, apiKey: string, model?: string): Promise<Lesson> => {
  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const response = await client.chat.completions.create({
    model: model || getSavedModel() || DEFAULT_MODEL,
    messages: [
      {
        role: "system",
        content: `You are a world-class bilingual (German/Polish) editorial expert, cultural authority, and master language educator with 30 years of experience teaching German to Polish speakers.

You produce premium, literary-quality learning resources that feel like an issue of a prestigious culture magazine combined with a rigorous academic reference.

Your guiding principles:
— DEPTH over brevity: every field must be thorough, substantive, and information-dense. Short answers are a failure.
— CULTURAL AUTHENTICITY: German-speaking world is diverse — mention Germany, Austria, Switzerland, and other German-speaking regions where relevant.
— LINGUISTIC PRECISION: distinguish registers, connotations, and pragmatic constraints scrupulously. Pay special attention to German case system, verb position, and compound words.
— POLISH SPEAKER FOCUS: always identify specifically which Polish structures or words cause interference. Note where German and Polish grammar overlap (e.g. cases) and where they diverge.
— LITERARY QUALITY: your German must be native, varied, and beautiful. Your Polish must be elegant and precise.
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

IMPORTANT: All bilingual fields use "de" (not "it", "en", "fr", or "es") for the German content, and "pl" for Polish.
DO NOT produce shortened, telegraphic, or bullet-point-style content in any field that requests prose.`,
      },
      {
        role: "user",
        content: `Create a comprehensive, premium bilingual (German–Polish) learning resource on the topic: "${topic}".

Target audience: Polish adults learning German (B1–B2 level).
Tone: Engaging, magazine-quality, culturally immersive, intellectually serious.

MANDATORY requirements — failure to meet ANY of these is unacceptable:
1. ALL prose fields must be long and substantive.
2. ALL explanations and prose must be provided in BOTH German and Polish — every "Bilingual" field has "de" and "pl" keys (NOT "it", "en", "fr", or "es").
3. DO NOT include a "vocabulary" field — vocabulary is generated separately.
4. Grammar: 3 sections minimum, each with ≥ 5-sentence explanations and ≥ 4 example pairs. Focus on German-specific structures (cases, verb-second order, separable verbs, modal verbs, etc.).
5. Common mistakes: SPECIFIC to Polish speakers — name the Polish word causing interference. ≥ 5 mistakes total.
6. Mini-story: ≥ 200 words per language, literary quality, named characters set in a German-speaking country.
7. Dialogue: ≥ 16 lines, authentic native German, multi-sentence utterances, grammar notes on ≥ 6 lines.
8. Culture content: ≥ 250 words per language — historical depth, regional specifics, contemporary relevance (Germany vs Austria vs Switzerland perspective where relevant).
9. Cultural notes: 3–4 notes, each ≥ 3 sentences per language.
10. Proverb: must be a REAL German proverb (Sprichwort). Meaning field ≥ 4 sentences per language.
11. Idiom: genuine German idiom (Redewendung). Origin story required (≥ 3 sentences per language).
12. Phrases: 8 items, each with detailed context ≥ 2–3 sentences per language.
13. deep_dive_title: concise encyclopedic section title (3–7 words). deep_dive: ≥ 250 words per language — authoritative, encyclopedic analysis. NO "lesson/journey" framing.
14. closing_reflection_title: concise encyclopedic section title. closing_reflection: ≥ 200 words per language — scholarly synthesis. NO "lesson/journey" framing.

CRITICAL — You MUST respond with a single valid JSON object. No markdown, no code fences, no extra text — ONLY the raw JSON.

Use "de" key (not "it", "en", "fr", or "es") for German content in all Bilingual fields. Do NOT include a "vocabulary" field:
{
  "topic": {"de": "...", "pl": "..."},
  "subtitle": {"de": "...", "pl": "..."},
  "emoji": "🇩🇪",
  "tags": ["tag1", "tag2", "tag3"],
  "difficulty_level": "B1",
  "estimated_reading_minutes": 12,
  "introduction": {"de": "...", "pl": "..."},
  "key_takeaways": [{"de": "...", "pl": "..."}, {"de": "...", "pl": "..."}, {"de": "...", "pl": "..."}],
  "trivia": {"de": "...", "pl": "..."},
  "regional_notes": {"de": "...", "pl": "..."},
  "deep_dive_title": {"de": "...", "pl": "..."},
  "deep_dive": {"de": "...", "pl": "..."},
  "grammar": [...],
  "common_mistakes": [...],
  "useful_phrases": [...],
  "mini_story": {"title": {"de": "...", "pl": "..."}, "text": {"de": "...", "pl": "..."}, "moral": {"de": "...", "pl": "..."}},
  "dialogue": {"title": {"de": "...", "pl": "..."}, "setting": {"de": "...", "pl": "..."}, "lines": [...], "vocabulary_highlight": ["..."]},
  "closing_reflection_title": {"de": "...", "pl": "..."},
  "closing_reflection": {"de": "...", "pl": "..."},
  "culture": {"title": {"de": "...", "pl": "..."}, "content": {"de": "...", "pl": "..."}, "did_you_know": {"de": "...", "pl": "..."}},
  "cultural_notes": [{"icon": "🏰", "title": {"de": "...", "pl": "..."}, "content": {"de": "...", "pl": "..."}, "region": "..."}],
  "proverb": {"text": "...", "translation": {"de": "...", "pl": "..."}, "meaning": {"de": "...", "pl": "..."}},
  "idiom": {"phrase": "...", "literal": {"de": "...", "pl": "..."}, "meaning": {"de": "...", "pl": "..."}, "origin": {"de": "...", "pl": "..."}, "example_sentence": {"de": "...", "pl": "..."}}
}

Remember: this resource must be so good that a learner could use it as their primary reference for this topic.`,
      },
    ],
    response_format: { type: "json_object" },
    // OpenRouter extensions: heal malformed JSON; route only to JSON-capable providers
    plugins: [{ id: "response-healing" }],
    provider: { require_parameters: true },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  const germanText = response.choices[0]?.message?.content;
  if (!germanText) throw new Error("Empty response from API");

  const data = tryParseJSON(germanText);

  // Validate required fields
  const REQUIRED = ['topic','subtitle','emoji','tags','difficulty_level','introduction','key_takeaways','grammar','common_mistakes','useful_phrases','mini_story','dialogue','closing_reflection','culture','cultural_notes','proverb','idiom'];
  const missing = findMissingRequiredFields(data, REQUIRED);
  if (missing.length > 0) {
    throw new Error(`Incomplete lesson JSON — missing fields: ${missing.join(', ')}`);
  }

  // Normalize difficulty level to single CEFR code
  data.difficulty_level = normalizeDifficultyLevel(data.difficulty_level);

  // Generate vocabulary as a separate request with full lesson context
  const vocabulary = await generateGermanVocabulary(data, apiKey, model || getSavedModel() || DEFAULT_MODEL, client);

  return {
    ...data,
    vocabulary,
    id: typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: Date.now(),
    targetLang: 'de' as const,
  } as Lesson;
};

// ─── German Vocabulary Generation ────────────────────────────────────────────

async function generateGermanVocabulary(
  lessonData: Record<string, unknown>,
  apiKey: string,
  model: string,
  client?: OpenAI
): Promise<import('../types').VocabularyItem[]> {
  const c = client ?? new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey, dangerouslyAllowBrowser: true });

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

  const response = await c.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: `You are a specialist German lexicographer and vocabulary teacher for Polish speakers. You create precise, detailed, encyclopedic vocabulary entries for language learners. Your entries are accurate, pedagogically rich, and directly relevant to the topic at hand. Pay special attention to German noun genders (der/die/das), plural forms, and separable verb prefixes.`,
      },
      {
        role: "user",
        content: `Based on the following German lesson content, generate a vocabulary list of EXACTLY 15 to 25 items (no fewer than 15, no more than 25). Choose the most important, topic-relevant German words and phrases — a mix of nouns, verbs, adjectives, adverbs, and set phrases.

LESSON CONTENT:
${lessonSummary}

For each vocabulary item provide:
- word: the German word/phrase (for nouns include the article: der/die/das)
- ipa: full IPA phonetic transcription
- gender: "m" (der), "f" (die), or "pl" for nouns; use "invariant" for neuter (das) nouns and for verbs/adjectives/adverbs
- plural: plural form (for nouns)
- part_of_speech: one of noun|verb|adjective|adverb|phrase|interjection|conjunction|preposition
- register: one of formal|informal|colloquial|literary|regional|vulgar
- translation: Polish translation
- definition: {"de": "2-3 sentence definition in German", "pl": "2-3 sentence definition in Polish"}
- context_sentence: {"de": "A vivid German example sentence", "pl": "Polish translation"}
- audio_hint: pronunciation tip for Polish speakers (e.g. German ch/sch/st/sp sounds, umlauts ae/oe/ue)
- etymology: {"de": "etymology in German", "pl": "etymology in Polish"}
- synonyms: array of 3-4 German synonyms
- antonyms: array of 2-3 German antonyms
- word_family: array of 3-4 related forms: [{"form": "...", "type": "...", "translation": "..."}]

CRITICAL: Respond with ONLY a raw JSON object:
{
  "vocabulary": [
    {
      "word": "...", "ipa": "...", "gender": "m|f|pl|invariant", "plural": "...",
      "part_of_speech": "noun|verb|...", "register": "formal|informal|...",
      "translation": "...",
      "definition": {"de": "...", "pl": "..."},
      "context_sentence": {"de": "...", "pl": "..."},
      "audio_hint": "...",
      "etymology": {"de": "...", "pl": "..."},
      "synonyms": ["...", "..."], "antonyms": ["...", "..."],
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

// ─── Czech Lesson Generation ──────────────────────────────────────────────────

export const generateCzechLesson = async (topic: string, apiKey: string, model?: string): Promise<Lesson> => {
  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const response = await client.chat.completions.create({
    model: model || getSavedModel() || DEFAULT_MODEL,
    messages: [
      {
        role: "system",
        content: `You are a world-class bilingual (Czech/Polish) editorial expert, cultural authority, and master language educator with 30 years of experience teaching Czech to Polish speakers.

You produce premium, literary-quality learning resources that feel like an issue of a prestigious culture magazine combined with a rigorous academic reference.

Your guiding principles:
— DEPTH over brevity: every field must be thorough, substantive, and information-dense. Short answers are a failure.
— CULTURAL AUTHENTICITY: Czech-speaking world is diverse — mention Bohemia, Moravia, Silesia, and Slovak connections where relevant. Reference Czech history, literature, music, and cuisine with authority.
— LINGUISTIC PRECISION: distinguish registers, connotations, and pragmatic constraints scrupulously. Pay special attention to Czech aspect pairs (perfective/imperfective), declension, and the soft/hard consonant distinction.
— POLISH SPEAKER FOCUS: always identify specifically which Polish structures or words cause interference. Note where Czech and Polish are close (Slavic cognates) and where they diverge (false friends such as "čerstvý" vs. "czerstwy", "hrozný" vs. "groźny", "zápach" vs. "zapach"). The Czech letter "ř", vowel length marks (á/é/í/ó/ú/ů), and verbal aspects are key challenges.
— LITERARY QUALITY: your Czech must be native, varied, and beautiful. Your Polish must be elegant and precise.
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

IMPORTANT: All bilingual fields use "cs" (not "it", "en", "fr", "es", or "de") for the Czech content, and "pl" for Polish.
DO NOT produce shortened, telegraphic, or bullet-point-style content in any field that requests prose.`,
      },
      {
        role: "user",
        content: `Create a comprehensive, premium bilingual (Czech–Polish) learning resource on the topic: "${topic}".

Target audience: Polish adults learning Czech (B1–B2 level).
Tone: Engaging, magazine-quality, culturally immersive, intellectually serious.

MANDATORY requirements — failure to meet ANY of these is unacceptable:
1. ALL prose fields must be long and substantive.
2. ALL explanations and prose must be provided in BOTH Czech and Polish — every "Bilingual" field has "cs" and "pl" keys (NOT "it", "en", "fr", "es", or "de").
3. DO NOT include a "vocabulary" field — vocabulary is generated separately.
4. Grammar: 3 sections minimum, each with ≥ 5-sentence explanations and ≥ 4 example pairs. Focus on Czech-specific structures (aspect pairs, declension cases, verbal prefixes, word order, negation with genitive).
5. Common mistakes: SPECIFIC to Polish speakers — name the Polish word causing interference, especially Czech-Polish false friends ("čerstvý"/"czerstwy", "hrozný"/"groźny", "zápach"/"zapach", etc.). ≥ 5 mistakes total.
6. Mini-story: ≥ 200 words per language, literary quality, named characters set in Czech Republic (Praha, Brno, Český Krumlov, etc.).
7. Dialogue: ≥ 16 lines, authentic native Czech, multi-sentence utterances, grammar notes on ≥ 6 lines.
8. Culture content: ≥ 250 words per language — historical depth, regional specifics, contemporary relevance (Bohemia vs. Moravia perspective where relevant, Czech national identity, Hussite heritage, Kafka, Dvořák, etc.).
9. Cultural notes: 3–4 notes, each ≥ 3 sentences per language.
10. Proverb: must be a REAL Czech proverb (přísloví). Meaning field ≥ 4 sentences per language.
11. Idiom: genuine Czech idiom (idiom/rčení). Origin story required (≥ 3 sentences per language).
12. Phrases: 8 items, each with detailed context ≥ 2–3 sentences per language.
13. deep_dive_title: concise encyclopedic section title (3–7 words). deep_dive: ≥ 250 words per language — authoritative, encyclopedic analysis. NO "lesson/journey" framing.
14. closing_reflection_title: concise encyclopedic section title. closing_reflection: ≥ 200 words per language — scholarly synthesis. NO "lesson/journey" framing.

CRITICAL — You MUST respond with a single valid JSON object. No markdown, no code fences, no extra text — ONLY the raw JSON.

Use "cs" key (not "it", "en", "fr", "es", or "de") for Czech content in all Bilingual fields. Do NOT include a "vocabulary" field:
{
  "topic": {"cs": "...", "pl": "..."},
  "subtitle": {"cs": "...", "pl": "..."},
  "emoji": "🇨🇿",
  "tags": ["tag1", "tag2", "tag3"],
  "difficulty_level": "B1",
  "estimated_reading_minutes": 12,
  "introduction": {"cs": "...", "pl": "..."},
  "key_takeaways": [{"cs": "...", "pl": "..."}, {"cs": "...", "pl": "..."}, {"cs": "...", "pl": "..."}],
  "trivia": {"cs": "...", "pl": "..."},
  "regional_notes": {"cs": "...", "pl": "..."},
  "deep_dive_title": {"cs": "...", "pl": "..."},
  "deep_dive": {"cs": "...", "pl": "..."},
  "grammar": [...],
  "common_mistakes": [...],
  "useful_phrases": [...],
  "mini_story": {"title": {"cs": "...", "pl": "..."}, "text": {"cs": "...", "pl": "..."}, "moral": {"cs": "...", "pl": "..."}},
  "dialogue": {"title": {"cs": "...", "pl": "..."}, "setting": {"cs": "...", "pl": "..."}, "lines": [...], "vocabulary_highlight": ["..."]},
  "closing_reflection_title": {"cs": "...", "pl": "..."},
  "closing_reflection": {"cs": "...", "pl": "..."},
  "culture": {"title": {"cs": "...", "pl": "..."}, "content": {"cs": "...", "pl": "..."}, "did_you_know": {"cs": "...", "pl": "..."}},
  "cultural_notes": [{"icon": "🏰", "title": {"cs": "...", "pl": "..."}, "content": {"cs": "...", "pl": "..."}, "region": "..."}],
  "proverb": {"text": "...", "translation": {"cs": "...", "pl": "..."}, "meaning": {"cs": "...", "pl": "..."}},
  "idiom": {"phrase": "...", "literal": {"cs": "...", "pl": "..."}, "meaning": {"cs": "...", "pl": "..."}, "origin": {"cs": "...", "pl": "..."}, "example_sentence": {"cs": "...", "pl": "..."}}
}

Remember: this resource must be so good that a learner could use it as their primary reference for this topic.`,
      },
    ],
    response_format: { type: "json_object" },
    // OpenRouter extensions: heal malformed JSON; route only to JSON-capable providers
    plugins: [{ id: "response-healing" }],
    provider: { require_parameters: true },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  const czechText = response.choices[0]?.message?.content;
  if (!czechText) throw new Error("Empty response from API");

  const data = tryParseJSON(czechText);

  // Validate required fields
  const REQUIRED = ['topic','subtitle','emoji','tags','difficulty_level','introduction','key_takeaways','grammar','common_mistakes','useful_phrases','mini_story','dialogue','closing_reflection','culture','cultural_notes','proverb','idiom'];
  const missing = findMissingRequiredFields(data, REQUIRED);
  if (missing.length > 0) {
    throw new Error(`Incomplete lesson JSON — missing fields: ${missing.join(', ')}`);
  }

  // Normalize difficulty level to single CEFR code
  data.difficulty_level = normalizeDifficultyLevel(data.difficulty_level);

  // Generate vocabulary as a separate request with full lesson context
  const vocabulary = await generateCzechVocabulary(data, apiKey, model || getSavedModel() || DEFAULT_MODEL, client);

  return {
    ...data,
    vocabulary,
    id: typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: Date.now(),
    targetLang: 'cs' as const,
  } as Lesson;
};

// ─── Czech Vocabulary Generation ─────────────────────────────────────────────

async function generateCzechVocabulary(
  lessonData: Record<string, unknown>,
  apiKey: string,
  model: string,
  client?: OpenAI
): Promise<import('../types').VocabularyItem[]> {
  const c = client ?? new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey, dangerouslyAllowBrowser: true });

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

  const response = await c.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: `You are a specialist Czech lexicographer and vocabulary teacher for Polish speakers. You create precise, detailed, encyclopedic vocabulary entries for language learners. Your entries are accurate, pedagogically rich, and directly relevant to the topic at hand. Pay special attention to Czech noun genders (masculine animate/inanimate, feminine, neuter), aspect pairs (imperfective/perfective), and the characteristic Czech sounds (ř, č, š, ž, long vowels á/é/í/ó/ú/ů).`,
      },
      {
        role: "user",
        content: `Based on the following Czech lesson content, generate a vocabulary list of EXACTLY 15 to 25 items (no fewer than 15, no more than 25). Choose the most important, topic-relevant Czech words and phrases — a mix of nouns, verbs, adjectives, adverbs, and set phrases.

LESSON CONTENT:
${lessonSummary}

For each vocabulary item provide:
- word: the Czech word/phrase (for nouns include gender hint in brackets if helpful, e.g. "ten/ta/to")
- ipa: full IPA phonetic transcription
- gender: "m" (masculine animate/inanimate), "f" (feminine), or "pl" for plural nouns; use "invariant" for neuter nouns and for verbs/adjectives/adverbs
- plural: plural form (for nouns)
- part_of_speech: one of noun|verb|adjective|adverb|phrase|interjection|conjunction|preposition
- register: one of formal|informal|colloquial|literary|regional|vulgar
- translation: Polish translation
- definition: {"cs": "2-3 sentence definition in Czech", "pl": "2-3 sentence definition in Polish"}
- context_sentence: {"cs": "A vivid Czech example sentence", "pl": "Polish translation"}
- audio_hint: pronunciation tip for Polish speakers (e.g. Czech ř sound, long vowels, háček letters č/š/ž, soft/hard consonants, word stress always on first syllable)
- etymology: {"cs": "etymology in Czech", "pl": "etymology in Polish"}
- synonyms: array of 3-4 Czech synonyms
- antonyms: array of 2-3 Czech antonyms
- word_family: array of 3-4 related forms: [{"form": "...", "type": "...", "translation": "..."}]

CRITICAL: Respond with ONLY a raw JSON object:
{
  "vocabulary": [
    {
      "word": "...", "ipa": "...", "gender": "m|f|pl|invariant", "plural": "...",
      "part_of_speech": "noun|verb|...", "register": "formal|informal|...",
      "translation": "...",
      "definition": {"cs": "...", "pl": "..."},
      "context_sentence": {"cs": "...", "pl": "..."},
      "audio_hint": "...",
      "etymology": {"cs": "...", "pl": "..."},
      "synonyms": ["...", "..."], "antonyms": ["...", "..."],
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

// ─── Russian Lesson Generation ────────────────────────────────────────────────

export const generateRussianLesson = async (topic: string, apiKey: string, model?: string): Promise<Lesson> => {
  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const response = await client.chat.completions.create({
    model: model || getSavedModel() || DEFAULT_MODEL,
    messages: [
      {
        role: "system",
        content: `You are a world-class bilingual (Russian/Polish) editorial expert, cultural authority, and master language educator with 30 years of experience teaching Russian to Polish speakers.

You produce premium, literary-quality learning resources that feel like an issue of a prestigious culture magazine combined with a rigorous academic reference.

Your guiding principles:
— DEPTH over brevity: every field must be thorough, substantive, and information-dense. Short answers are a failure.
— CULTURAL AUTHENTICITY: the Russian-speaking world is vast and diverse — mention Russia, its regions (Siberia, the Urals, the Caucasus, the Far East), as well as connections to Soviet history, literature (Pushkin, Tolstoy, Dostoevsky, Chekhov), music, ballet, and cuisine with authority.
— LINGUISTIC PRECISION: Russian has three grammatical genders, six cases, verbal aspects (perfective/imperfective), and a non-Latin script (Cyrillic). Distinguish registers, connotations, and pragmatic constraints scrupulously.
— POLISH SPEAKER FOCUS: always identify specifically which Polish structures or words cause interference. Note where Russian and Polish are close (Slavic cognates) and where they diverge sharply (false friends such as "урод" vs. "uroda", "неделя" vs. "niedziela"). The Cyrillic alphabet, the absence of articles, the case system, and verbal aspects are key challenges for Polish learners.
— LITERARY QUALITY: your Russian must be native, varied, and beautiful. Your Polish must be elegant and precise.
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

IMPORTANT: All bilingual fields use "ru" (not "it", "en", "fr", "es", "de", or "cs") for the Russian content, and "pl" for Polish.
DO NOT produce shortened, telegraphic, or bullet-point-style content in any field that requests prose.`,
      },
      {
        role: "user",
        content: `Create a comprehensive, premium bilingual (Russian–Polish) learning resource on the topic: "${topic}".

Target audience: Polish adults learning Russian (B1–B2 level).
Tone: Engaging, magazine-quality, culturally immersive, intellectually serious.

MANDATORY requirements — failure to meet ANY of these is unacceptable:
1. ALL prose fields must be long and substantive.
2. ALL explanations and prose must be provided in BOTH Russian and Polish — every "Bilingual" field has "ru" and "pl" keys (NOT "it", "en", "fr", "es", "de", or "cs").
3. DO NOT include a "vocabulary" field — vocabulary is generated separately.
4. Grammar: 3 sections minimum, each with ≥ 5-sentence explanations and ≥ 4 example pairs. Focus on Russian-specific structures (verbal aspects, case government, motion verbs, negation with genitive, short-form adjectives, reflexive verbs with -ся/-сь).
5. Common mistakes: SPECIFIC to Polish speakers — name the Polish word causing interference, especially Russian-Polish false friends ("урод"/"uroda", "неделя"/"niedziela", "запах"/"zapach" meaning difference, "вонь"/"woń", etc.). ≥ 5 mistakes total.
6. Mini-story: ≥ 200 words per language, literary quality, named characters set in Russia (Москва, Санкт-Петербург, Байкал, Сибирь, etc.).
7. Dialogue: ≥ 16 lines, authentic native Russian, multi-sentence utterances, grammar notes on ≥ 6 lines.
8. Culture content: ≥ 250 words per language — historical depth, regional specifics, contemporary relevance (Soviet legacy, Russian literature, Orthodox traditions, regional cuisine, Slavic mythology, folk traditions).
9. Cultural notes: 3–4 notes, each ≥ 3 sentences per language.
10. Proverb: must be a REAL Russian proverb (пословица). Meaning field ≥ 4 sentences per language.
11. Idiom: genuine Russian idiom (идиома/фразеологизм). Origin story required (≥ 3 sentences per language).
12. Phrases: 8 items, each with detailed context ≥ 2–3 sentences per language.
13. deep_dive_title: concise encyclopedic section title (3–7 words). deep_dive: ≥ 250 words per language — authoritative, encyclopedic analysis. NO "lesson/journey" framing.
14. closing_reflection_title: concise encyclopedic section title. closing_reflection: ≥ 200 words per language — scholarly synthesis. NO "lesson/journey" framing.

CRITICAL — You MUST respond with a single valid JSON object. No markdown, no code fences, no extra text — ONLY the raw JSON.

Use "ru" key (not "it", "en", "fr", "es", "de", or "cs") for Russian content in all Bilingual fields. Do NOT include a "vocabulary" field:
{
  "topic": {"ru": "...", "pl": "..."},
  "subtitle": {"ru": "...", "pl": "..."},
  "emoji": "🇷🇺",
  "tags": ["tag1", "tag2", "tag3"],
  "difficulty_level": "B1",
  "estimated_reading_minutes": 12,
  "introduction": {"ru": "...", "pl": "..."},
  "key_takeaways": [{"ru": "...", "pl": "..."}, {"ru": "...", "pl": "..."}, {"ru": "...", "pl": "..."}],
  "trivia": {"ru": "...", "pl": "..."},
  "regional_notes": {"ru": "...", "pl": "..."},
  "deep_dive_title": {"ru": "...", "pl": "..."},
  "deep_dive": {"ru": "...", "pl": "..."},
  "grammar": [...],
  "common_mistakes": [...],
  "useful_phrases": [...],
  "mini_story": {"title": {"ru": "...", "pl": "..."}, "text": {"ru": "...", "pl": "..."}, "moral": {"ru": "...", "pl": "..."}},
  "dialogue": {"title": {"ru": "...", "pl": "..."}, "setting": {"ru": "...", "pl": "..."}, "lines": [...], "vocabulary_highlight": ["..."]},
  "closing_reflection_title": {"ru": "...", "pl": "..."},
  "closing_reflection": {"ru": "...", "pl": "..."},
  "culture": {"title": {"ru": "...", "pl": "..."}, "content": {"ru": "...", "pl": "..."}, "did_you_know": {"ru": "...", "pl": "..."}},
  "cultural_notes": [{"icon": "🏛️", "title": {"ru": "...", "pl": "..."}, "content": {"ru": "...", "pl": "..."}, "region": "..."}],
  "proverb": {"text": "...", "translation": {"ru": "...", "pl": "..."}, "meaning": {"ru": "...", "pl": "..."}},
  "idiom": {"phrase": "...", "literal": {"ru": "...", "pl": "..."}, "meaning": {"ru": "...", "pl": "..."}, "origin": {"ru": "...", "pl": "..."}, "example_sentence": {"ru": "...", "pl": "..."}}
}

Remember: this resource must be so good that a learner could use it as their primary reference for this topic.`,
      },
    ],
    response_format: { type: "json_object" },
    // OpenRouter extensions: heal malformed JSON; route only to JSON-capable providers
    plugins: [{ id: "response-healing" }],
    provider: { require_parameters: true },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  const russianText = response.choices[0]?.message?.content;
  if (!russianText) throw new Error("Empty response from API");

  const data = tryParseJSON(russianText);

  // Validate required fields
  const REQUIRED = ['topic','subtitle','emoji','tags','difficulty_level','introduction','key_takeaways','grammar','common_mistakes','useful_phrases','mini_story','dialogue','closing_reflection','culture','cultural_notes','proverb','idiom'];
  const missing = findMissingRequiredFields(data, REQUIRED);
  if (missing.length > 0) {
    throw new Error(`Incomplete lesson JSON — missing fields: ${missing.join(', ')}`);
  }

  // Normalize difficulty level to single CEFR code
  data.difficulty_level = normalizeDifficultyLevel(data.difficulty_level);

  // Generate vocabulary as a separate request with full lesson context
  const vocabulary = await generateRussianVocabulary(data, apiKey, model || getSavedModel() || DEFAULT_MODEL, client);

  return {
    ...data,
    vocabulary,
    id: typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: Date.now(),
    targetLang: 'ru' as const,
  } as Lesson;
};

// ─── Russian Vocabulary Generation ───────────────────────────────────────────

async function generateRussianVocabulary(
  lessonData: Record<string, unknown>,
  apiKey: string,
  model: string,
  client?: OpenAI
): Promise<import('../types').VocabularyItem[]> {
  const c = client ?? new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey, dangerouslyAllowBrowser: true });

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

  const response = await c.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: `You are a specialist Russian lexicographer and vocabulary teacher for Polish speakers. You create precise, detailed, encyclopedic vocabulary entries for language learners. Your entries are accurate, pedagogically rich, and directly relevant to the topic at hand. Pay special attention to Russian noun genders (masculine, feminine, neuter), number (singular/plural), case declension patterns, verbal aspects (imperfective/perfective pairs), and the stress patterns that are so characteristic of Russian. Always write Russian words in Cyrillic script.`,
      },
      {
        role: "user",
        content: `Based on the following Russian lesson content, generate a vocabulary list of EXACTLY 15 to 25 items (no fewer than 15, no more than 25). Choose the most important, topic-relevant Russian words and phrases — a mix of nouns, verbs, adjectives, adverbs, and set phrases.

LESSON CONTENT:
${lessonSummary}

For each vocabulary item provide:
- word: the Russian word/phrase in Cyrillic (for nouns include gender hint if helpful, e.g. "[м]", "[ж]", "[ср]"; for verbs give the infinitive)
- ipa: full IPA phonetic transcription (include stress mark ˈ)
- gender: "m" (masculine), "f" (feminine), "pl" for plural-only nouns; use "invariant" for neuter nouns and for verbs/adjectives/adverbs
- plural: plural nominative form (for nouns)
- part_of_speech: one of noun|verb|adjective|adverb|phrase|interjection|conjunction|preposition
- register: one of formal|informal|colloquial|literary|regional|vulgar
- translation: Polish translation
- definition: {"ru": "2-3 sentence definition in Russian", "pl": "2-3 sentence definition in Polish"}
- context_sentence: {"ru": "A vivid Russian example sentence in Cyrillic", "pl": "Polish translation"}
- audio_hint: pronunciation tip for Polish speakers (e.g. Russian stress, reduction of unstressed vowels o->a and e->i, palatalization, rolled r, hard/soft consonants, Cyrillic letters that look like Latin but sound different: p=/r/, H=/n/, C=/s/, etc.)
- etymology: {"ru": "etymology in Russian", "pl": "etymology in Polish"}
- synonyms: array of 3-4 Russian synonyms (in Cyrillic)
- antonyms: array of 2-3 Russian antonyms (in Cyrillic)
- word_family: array of 3-4 related forms: [{"form": "...", "type": "...", "translation": "..."}]

CRITICAL: Respond with ONLY a raw JSON object:
{
  "vocabulary": [
    {
      "word": "...", "ipa": "...", "gender": "m|f|pl|invariant", "plural": "...",
      "part_of_speech": "noun|verb|...", "register": "formal|informal|...",
      "translation": "...",
      "definition": {"ru": "...", "pl": "..."},
      "context_sentence": {"ru": "...", "pl": "..."},
      "audio_hint": "...",
      "etymology": {"ru": "...", "pl": "..."},
      "synonyms": ["...", "..."], "antonyms": ["...", "..."],
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
