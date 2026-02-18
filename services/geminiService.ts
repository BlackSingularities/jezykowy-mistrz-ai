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

    // ── Vocabulary ───────────────────────────────────────────────────────────
    vocabulary: {
      type: "array",
      description: "EXACTLY 10 vocabulary items — no more, no fewer. Mix nouns, verbs, adjectives, and idiomatic phrases. Prioritise high-frequency and culturally significant words.",
      minItems: 10,
      maxItems: 10,
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
      description: "A rich, authentic 10–12 line dialogue between 2 named Italian characters. Must feel like a scene from Italian daily life — natural speech rhythms, contractions, regional flavour, emotional texture. Each line should be substantive (not just one word answers).",
      properties: {
        title: { ...B },
        setting: { ...B, description: "Vivid, specific scene description — 2–3 sentences placing the reader in a concrete Italian location at a specific time of day." },
        lines: {
          type: "array",
          description: "10–12 dialogue lines. Use realistic turn-taking, interruptions, register shifts. Include grammar annotations on at least 4 lines.",
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
    "vocabulary",
    "grammar","common_mistakes","useful_phrases",
    "mini_story","dialogue","culture","cultural_notes",
    "proverb","idiom",
  ],
};

// ─── OpenRouter model type ────────────────────────────────────────────────────

export interface ORModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: { prompt: string; completion: string };
  top_provider?: { context_length?: number };
}

export const DEFAULT_MODEL = "google/gemini-2.5-flash";
const MODEL_STORAGE_KEY = "openrouter_model";

export function getSavedModel(): string {
  return localStorage.getItem(MODEL_STORAGE_KEY) || DEFAULT_MODEL;
}

export function saveModel(modelId: string) {
  localStorage.setItem(MODEL_STORAGE_KEY, modelId);
}

export async function loadModels(apiKey: string): Promise<ORModel[]> {
  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error("Failed to load models");
  const json = await res.json();
  // Filtrujemy wyłącznie modele chat (text → text)
  return (json.data as ORModel[]).filter(
    (m) => m.id && !m.id.includes(":free") === false || m.id
  );
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

• culture content: ≥ 250 words per language
• cultural_notes content: ≥ 3 sentences per language each
• mini_story text: ≥ 200 words per language
• dialogue: ≥ 10 lines total
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
2. ALL explanations and prose must be provided in BOTH Italian and Polish.
3. Vocabulary: EXACTLY 10 items (minItems=10, maxItems=10). IPA, gender/plural for all nouns, register, etymology (minimum 2 sentences), synonyms (3+), word family (3+), rich definitions (2–3 sentences).
4. Grammar: 3 sections minimum, each with ≥ 5-sentence explanations and ≥ 4 example pairs.
5. Common mistakes: SPECIFIC to Polish speakers — name the Polish word causing interference. ≥ 5 mistakes total.
6. Mini-story: ≥ 200 words per language, literary quality, named Italian characters, specific Italian location.
7. Dialogue: ≥ 10 lines, authentic native Italian, grammar notes on ≥ 4 lines.
8. Culture content: ≥ 250 words per language — historical depth, regional specifics, contemporary relevance.
9. Cultural notes: 3–4 notes, each ≥ 3 sentences per language.
10. Proverb: must be a REAL Italian proverb. Meaning field ≥ 4 sentences per language.
11. Idiom: genuine "modo di dire". Origin story required (≥ 3 sentences per language).
12. Phrases: 8 items, each with detailed context ≥ 2–3 sentences per language.

Remember: this resource must be so good that a learner could use it as their primary reference for this topic.`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "italian_lesson",
        strict: false,
        schema: lessonSchema,
      },
    },
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("Empty response from API");

  const data = JSON.parse(text);

  return {
    ...data,
    id: typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: Date.now(),
  };
};
