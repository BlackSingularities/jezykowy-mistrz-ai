import OpenAI from "openai";
import { Lesson } from "../types";

const apiKey = process.env.API_KEY || "";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey,
  dangerouslyAllowBrowser: true,
});

const bilingualSchema = {
  type: "object",
  properties: {
    it: { type: "string", description: "Italian text" },
    pl: { type: "string", description: "Polish translation" },
  },
  required: ["it", "pl"],
};

const lessonJsonSchema = {
  type: "object",
  properties: {
    topic: { ...bilingualSchema },
    emoji: { type: "string" },
    difficulty_level: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1"] },
    introduction: {
      ...bilingualSchema,
      description: "A comprehensive, engaging magazine-style introduction.",
    },
    trivia: {
      ...bilingualSchema,
      description: "A short, interesting 'Did you know?' fact related to the topic.",
    },
    vocabulary: {
      type: "array",
      description: "8-10 rich vocabulary items. MUST include gender/plural for nouns.",
      items: {
        type: "object",
        properties: {
          word: { type: "string" },
          gender: { type: "string", enum: ["m", "f", "pl", "invariant"], description: "Gender of the noun" },
          plural: { type: "string", description: "The plural form of the word" },
          translation: { type: "string", description: "Polish translation" },
          definition: { ...bilingualSchema, description: "Detailed definition" },
          context_sentence: { ...bilingualSchema, description: "Complex example sentence" },
          audio_hint: { type: "string", description: "Phonetic pronunciation tip (e.g. 'chi' -> 'ki')" },
        },
        required: ["word", "translation", "definition", "context_sentence"],
      },
    },
    useful_phrases: {
      type: "array",
      description: "5 practical, ready-to-use phrases or idioms related to the topic",
      items: {
        type: "object",
        properties: {
          expression: { type: "string" },
          translation: { type: "string" },
          context: { ...bilingualSchema, description: "When to use this phrase" },
        },
        required: ["expression", "translation", "context"],
      },
    },
    grammar: {
      type: "array",
      description: "2 detailed grammar points.",
      items: {
        type: "object",
        properties: {
          title: { ...bilingualSchema },
          content: { ...bilingualSchema, description: "Detailed explanation" },
          examples: {
            type: "array",
            items: { ...bilingualSchema },
          },
        },
        required: ["title", "content", "examples"],
      },
    },
    common_mistakes: {
      type: "array",
      description: "3 common mistakes Polish speakers make regarding this topic (false friends, grammar errors).",
      items: {
        type: "object",
        properties: {
          wrong: { type: "string", description: "The incorrect usage" },
          correct: { type: "string", description: "The correct usage" },
          explanation: { ...bilingualSchema },
        },
        required: ["wrong", "correct", "explanation"],
      },
    },
    dialogue: {
      type: "object",
      description: "A script-like conversation.",
      properties: {
        title: { ...bilingualSchema },
        lines: {
          type: "array",
          items: {
            type: "object",
            properties: {
              speaker: { type: "string" },
              text: { ...bilingualSchema },
              annotation: { ...bilingualSchema, description: "Tone or context note (e.g. 'Ironico')" },
            },
            required: ["speaker", "text"],
          },
        },
      },
      required: ["title", "lines"],
    },
    culture: {
      type: "object",
      description: "Deep dive into Italian culture.",
      properties: {
        title: { ...bilingualSchema },
        content: { ...bilingualSchema, description: "Long, article-style content." },
      },
      required: ["title", "content"],
    },
    idiom: {
      type: "object",
      description: "A star idiom.",
      properties: {
        phrase: { type: "string" },
        literal: { ...bilingualSchema },
        meaning: { ...bilingualSchema },
        origin: { ...bilingualSchema, description: "Origin story of the idiom" },
      },
      required: ["phrase", "literal", "meaning"],
    },
  },
  required: ["topic", "emoji", "introduction", "vocabulary", "grammar", "dialogue", "culture", "idiom", "common_mistakes", "useful_phrases"],
};

export const generateLesson = async (topic: string): Promise<Lesson> => {
  try {
    const response = await client.chat.completions.create({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: "You are an expert bilingual editor (Italian/Polish). You provide sophisticated, accurate, and culturally rich content. You highlight false friends and common grammatical errors.",
        },
        {
          role: "user",
          content: `Create a premium, magazine-quality bilingual (Italian-Polish) learning resource for topic: "${topic}".

Target Audience: Polish speakers.
Goal: Provide deep linguistic nuance, cultural context, and practical usage.

Requirements:
1. **Bilingual:** All explanations must be available in Polish and Italian.
2. **Deep:** Include "Common Mistakes" (specifically for Polish speakers, e.g., false friends).
3. **Practical:** Include "Useful Phrases" that aren't just single words.
4. **Rich:** Include Gender and Plural forms for vocabulary.
5. **No Quizzes:** This is a reference article/lesson.`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "lesson",
          schema: lessonJsonSchema,
        },
      },
    });

    const text = response.choices[0].message.content;
    if (!text) {
      throw new Error("No response generated");
    }

    const data = JSON.parse(text);

    return {
      ...data,
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).substring(7),
      timestamp: Date.now(),
    };

  } catch (error) {
    console.error("OpenRouter API Error:", error);
    throw error;
  }
};
