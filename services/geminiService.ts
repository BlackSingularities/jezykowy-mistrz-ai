import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Lesson } from "../types";

const apiKey = process.env.API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

// Helper for bilingual schema parts
const bilingualProp = {
  type: Type.OBJECT,
  properties: {
    it: { type: Type.STRING, description: "Italian text" },
    pl: { type: Type.STRING, description: "Polish translation" },
  },
  required: ["it", "pl"],
};

const lessonSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    topic: bilingualProp,
    emoji: { type: Type.STRING },
    difficulty_level: { type: Type.STRING, enum: ['A1', 'A2', 'B1', 'B2', 'C1'] },
    introduction: { 
      ...bilingualProp, 
      description: "A comprehensive, engaging magazine-style introduction." 
    },
    trivia: {
      ...bilingualProp,
      description: "A short, interesting 'Did you know?' fact related to the topic."
    },
    vocabulary: {
      type: Type.ARRAY,
      description: "8-10 rich vocabulary items. MUST include gender/plural for nouns.",
      items: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          gender: { type: Type.STRING, enum: ['m', 'f', 'pl', 'invariant'], description: "Gender of the noun" },
          plural: { type: Type.STRING, description: "The plural form of the word" },
          translation: { type: Type.STRING, description: "Polish translation" },
          definition: { ...bilingualProp, description: "Detailed definition" },
          context_sentence: { ...bilingualProp, description: "Complex example sentence" },
          audio_hint: { type: Type.STRING, description: "Phonetic pronunciation tip (e.g. 'chi' -> 'ki')" },
        },
        required: ["word", "translation", "definition", "context_sentence"],
      },
    },
    useful_phrases: {
      type: Type.ARRAY,
      description: "5 practical, ready-to-use phrases or idioms related to the topic",
      items: {
        type: Type.OBJECT,
        properties: {
          expression: { type: Type.STRING },
          translation: { type: Type.STRING },
          context: { ...bilingualProp, description: "When to use this phrase" }
        },
        required: ["expression", "translation", "context"]
      }
    },
    grammar: {
      type: Type.ARRAY,
      description: "2 detailed grammar points.",
      items: {
        type: Type.OBJECT,
        properties: {
          title: bilingualProp,
          content: { ...bilingualProp, description: "Detailed explanation" },
          examples: { 
            type: Type.ARRAY, 
            items: bilingualProp,
          },
        },
        required: ["title", "content", "examples"],
      },
    },
    common_mistakes: {
      type: Type.ARRAY,
      description: "3 common mistakes Polish speakers make regarding this topic (false friends, grammar errors).",
      items: {
        type: Type.OBJECT,
        properties: {
          wrong: { type: Type.STRING, description: "The incorrect usage" },
          correct: { type: Type.STRING, description: "The correct usage" },
          explanation: bilingualProp
        },
        required: ["wrong", "correct", "explanation"]
      }
    },
    dialogue: {
      type: Type.OBJECT,
      description: "A script-like conversation.",
      properties: {
        title: bilingualProp,
        lines: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              speaker: { type: Type.STRING },
              text: bilingualProp,
              annotation: { ...bilingualProp, description: "Tone or context note (e.g. 'Ironico')" }
            },
            required: ["speaker", "text"],
          },
        },
      },
      required: ["title", "lines"],
    },
    culture: {
      type: Type.OBJECT,
      description: "Deep dive into Italian culture.",
      properties: {
        title: bilingualProp,
        content: { ...bilingualProp, description: "Long, article-style content." },
      },
      required: ["title", "content"],
    },
    idiom: {
      type: Type.OBJECT,
      description: "A star idiom.",
      properties: {
        phrase: { type: Type.STRING },
        literal: { ...bilingualProp },
        meaning: { ...bilingualProp },
        origin: { ...bilingualProp, description: "Origin story of the idiom" }
      },
      required: ["phrase", "literal", "meaning"],
    },
  },
  required: ["topic", "emoji", "introduction", "vocabulary", "grammar", "dialogue", "culture", "idiom", "common_mistakes", "useful_phrases"],
};

export const generateLesson = async (topic: string): Promise<Lesson> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Create a premium, magazine-quality bilingual (Italian-Polish) learning resource topic: "${topic}".
      
      Target Audience: Polish speakers.
      Goal: Provide deep linguistic nuance, cultural context, and practical usage.
      
      Requirements:
      1. **Bilingual:** All explanations must be available in Polish and Italian.
      2. **Deep:** Include "Common Mistakes" (specifically for Polish speakers, e.g., false friends).
      3. **Practical:** Include "Useful Phrases" that aren't just single words.
      4. **Rich:** Include Gender and Plural forms for vocabulary.
      5. **No Quizzes:** This is a reference article/lesson.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: lessonSchema,
        systemInstruction: "You are an expert bilingual editor (Italian/Polish). You provide sophisticated, accurate, and culturally rich content. You highlight false friends and common grammatical errors.",
      },
    });

    const text = response.text;
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
    console.error("Gemini API Error:", error);
    throw error;
  }
};