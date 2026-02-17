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
    introduction: { ...B, description: "3–4 sentence rich magazine-style introduction." },
    key_takeaways: {
      type: "array",
      description: "Exactly 3 key takeaways / highlights of this lesson (short sentences).",
      items: { ...B },
      minItems: 3,
      maxItems: 3,
    },
    trivia: { ...optB, description: "A 'Did you know?' fun fact related to the topic." },
    regional_notes: { ...optB, description: "Notable regional variations in Italy regarding this topic." },

    // ── Vocabulary ───────────────────────────────────────────────────────────
    vocabulary: {
      type: "array",
      description: "8–10 vocabulary items, rich with metadata. Include nouns with gender & plural, verbs with usage notes.",
      items: {
        type: "object",
        properties: {
          word: { type: "string" },
          ipa: { type: "string", description: "IPA phonetic transcription, e.g. /laˈvoːro/." },
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
          translation: { type: "string", description: "Primary Polish translation." },
          definition: { ...B, description: "Detailed definition." },
          context_sentence: { ...B, description: "A rich example sentence in context." },
          audio_hint: { type: "string", description: "Pronunciation tip, e.g. 'gli = ʎ, like Polish ль'." },
          etymology: { ...optB, description: "Brief etymology / word origin." },
          synonyms: { type: "array", items: { type: "string" }, description: "2–3 Italian synonyms." },
          antonyms: { type: "array", items: { type: "string" }, description: "2–3 Italian antonyms if applicable." },
          word_family: {
            type: "array",
            description: "2–3 related word forms (e.g. verb from a noun).",
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

    // ── Pronunciation ────────────────────────────────────────────────────────
    pronunciation_tips: {
      type: "array",
      description: "2–3 pronunciation tips specifically relevant to this topic's vocabulary, targeting Polish speakers.",
      items: {
        type: "object",
        properties: {
          sound: { type: "string", description: "The Italian grapheme/sound, e.g. 'gli', 'gn', 'sc'." },
          description: { ...B, description: "How to produce the sound." },
          example_word: { type: "string", description: "Example word from the lesson's vocabulary." },
          example_sentence: { type: "string", description: "Short Italian sentence showcasing the sound." },
          common_mistake: { ...optB, description: "What Polish speakers typically do wrong." },
        },
        required: ["sound", "description", "example_word"],
      },
    },

    // ── Grammar ──────────────────────────────────────────────────────────────
    grammar: {
      type: "array",
      description: "2 detailed grammar points highly relevant to the topic.",
      items: {
        type: "object",
        properties: {
          title: { ...B },
          explanation: { ...B, description: "Clear, detailed explanation." },
          pattern: { type: "string", description: "Formula, e.g. 'avere/essere + participio passato'." },
          examples: {
            type: "array",
            items: {
              type: "object",
              properties: {
                it: { type: "string" },
                pl: { type: "string" },
                breakdown: { type: "string", description: "Optional structural annotation." },
              },
              required: ["it", "pl"],
            },
          },
          exceptions: { type: "array", items: { ...B }, description: "Notable exceptions to the rule." },
        },
        required: ["title", "explanation", "examples"],
      },
    },

    // ── Common Mistakes ──────────────────────────────────────────────────────
    common_mistakes: {
      type: "array",
      description: "4 mistakes Polish speakers make on this topic — false friends, grammar, pronunciation or usage errors.",
      items: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["false_friend", "grammar", "pronunciation", "usage", "spelling"],
          },
          wrong: { type: "string", description: "The incorrect form." },
          correct: { type: "string", description: "The correct form." },
          explanation: { ...B },
          mnemonic: { ...optB, description: "A memory trick to remember the correct form." },
        },
        required: ["category", "wrong", "correct", "explanation"],
      },
    },

    // ── Phrases ──────────────────────────────────────────────────────────────
    useful_phrases: {
      type: "array",
      description: "6 practical, ready-to-use phrases related to the topic.",
      items: {
        type: "object",
        properties: {
          expression: { type: "string" },
          translation: { type: "string" },
          register: {
            type: "string",
            enum: ["formal", "informal", "colloquial", "literary", "regional", "vulgar"],
          },
          context: { ...B, description: "When / how to use this phrase." },
          example_usage: { ...optB, description: "Example sentence using this phrase." },
        },
        required: ["expression", "translation", "register", "context"],
      },
    },

    // ── Mini Story ───────────────────────────────────────────────────────────
    mini_story: {
      type: "object",
      description: "A short (~120 word) narrative in Italian and Polish, set in an Italian context, using topic vocabulary naturally.",
      properties: {
        title: { ...B },
        text: { ...B, description: "The story body (100–150 words per language)." },
        moral: { ...optB, description: "A one-sentence moral or takeaway (optional)." },
      },
      required: ["title", "text"],
    },

    // ── Dialogue ─────────────────────────────────────────────────────────────
    dialogue: {
      type: "object",
      description: "A realistic, contextualised dialogue of 6–8 lines.",
      properties: {
        title: { ...B },
        setting: { ...B, description: "Brief scene description." },
        lines: {
          type: "array",
          items: {
            type: "object",
            properties: {
              speaker: { type: "string" },
              text: { ...B },
              tone: {
                type: "string",
                enum: ["neutral","happy","surprised","formal","casual","ironic","questioning","emphatic"],
              },
              annotation: { ...optB, description: "Stage direction or tone note." },
              grammar_note: { ...optB, description: "Grammar point worth highlighting in this line." },
            },
            required: ["speaker", "text"],
          },
        },
        vocabulary_highlight: {
          type: "array",
          items: { type: "string" },
          description: "3–5 Italian words from the dialogue worth noting.",
        },
      },
      required: ["title", "setting", "lines"],
    },

    // ── Culture ──────────────────────────────────────────────────────────────
    culture: {
      type: "object",
      properties: {
        title: { ...B },
        content: { ...B, description: "Rich cultural context, 150–200 words per language." },
        did_you_know: { ...B, description: "A surprising or little-known fact." },
      },
      required: ["title", "content", "did_you_know"],
    },
    cultural_notes: {
      type: "array",
      description: "2–3 focused cultural observations — regional, historical, or social.",
      items: {
        type: "object",
        properties: {
          icon: { type: "string", description: "Emoji representing the note." },
          title: { ...B },
          content: { ...B },
          region: { type: "string", description: "Italian region if regional (e.g. 'Sicilia')." },
        },
        required: ["icon", "title", "content"],
      },
    },

    // ── Proverb ──────────────────────────────────────────────────────────────
    proverb: {
      type: "object",
      description: "An authentic Italian proverb related to the topic.",
      properties: {
        text: { type: "string", description: "The Italian proverb text." },
        translation: { ...B, description: "Translation." },
        meaning: { ...B, description: "Explanation of the proverb's meaning." },
      },
      required: ["text", "translation", "meaning"],
    },

    // ── Idiom ────────────────────────────────────────────────────────────────
    idiom: {
      type: "object",
      description: "A colourful Italian idiom or modo di dire related to the topic.",
      properties: {
        phrase: { type: "string" },
        literal: { ...B, description: "Literal translation." },
        meaning: { ...B, description: "Actual figurative meaning." },
        origin: { ...optB, description: "Origin story." },
        example_sentence: { ...optB, description: "Example sentence using the idiom." },
      },
      required: ["phrase", "literal", "meaning"],
    },
  },

  required: [
    "topic","subtitle","emoji","tags","difficulty_level","estimated_reading_minutes",
    "introduction","key_takeaways",
    "vocabulary","pronunciation_tips",
    "grammar","common_mistakes","useful_phrases",
    "mini_story","dialogue","culture","cultural_notes",
    "proverb","idiom",
  ],
};

// ─── API Call ─────────────────────────────────────────────────────────────────

export const generateLesson = async (topic: string, apiKey: string): Promise<Lesson> => {
  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const response = await client.chat.completions.create({
    model: "google/gemini-2.5-flash",
    messages: [
      {
        role: "system",
        content: `You are a bilingual (Italian/Polish) editorial expert, cultural authority, and language educator.
You produce premium, magazine-quality learning resources for Polish speakers learning Italian.
Your content is nuanced, accurate, culturally rich, and linguistically precise.
You always highlight false friends and grammatical traps for Polish speakers.
You write with warmth and depth — every lesson feels like a curated cultural experience.`,
      },
      {
        role: "user",
        content: `Create a comprehensive, premium bilingual (Italian–Polish) learning resource on the topic: "${topic}".

Target audience: Polish adults learning Italian (intermediate level).
Tone: Engaging, magazine-quality, culturally immersive.

Key requirements:
1. ALL explanations must be available in BOTH Italian and Polish.
2. Vocabulary must include IPA, gender/plural for nouns, part of speech, register, etymology, synonyms, word family.
3. Grammar sections must have clear patterns and multiple examples with breakdowns.
4. Common mistakes must be SPECIFIC to Polish speakers (false friends, false cognates, structural interference).
5. The mini-story must use lesson vocabulary naturally in an Italian setting (~120 words).
6. Dialogue must feel authentic — native-level Italian with appropriate tone markers.
7. Cultural notes must be specific, surprising, and geographically grounded.
8. Pronunciation tips must target sounds Polish speakers find difficult in Italian.
9. Proverb must be a REAL, well-known Italian proverb.
10. The idiom must be a genuine Italian "modo di dire" (not a literal translation from Polish/English).`,
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
