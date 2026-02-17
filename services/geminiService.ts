import { Lesson } from "../types";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash-preview";

const systemPrompt = `You are an expert bilingual editor (Italian/Polish). You provide sophisticated, accurate, and culturally rich content. You highlight false friends and common grammatical errors.
You MUST respond with a valid JSON object. Do not include any text outside the JSON.`;

const buildUserPrompt = (topic: string) => `Create a premium, magazine-quality bilingual (Italian-Polish) learning resource for the topic: "${topic}".

Target Audience: Polish speakers.
Goal: Provide deep linguistic nuance, cultural context, and practical usage.

Requirements:
1. All explanations must be available in Polish and Italian.
2. Include "Common Mistakes" specifically for Polish speakers (e.g., false friends).
3. Include "Useful Phrases" that are practical, ready-to-use expressions.
4. Include Gender and Plural forms for vocabulary.
5. This is a reference article/lesson, not a quiz.

Respond ONLY with a JSON object matching this exact structure:
{
  "topic": {"it": "...", "pl": "..."},
  "emoji": "...",
  "difficulty_level": "A1",
  "introduction": {"it": "...", "pl": "..."},
  "trivia": {"it": "...", "pl": "..."},
  "vocabulary": [
    {
      "word": "...",
      "gender": "m",
      "plural": "...",
      "translation": "...",
      "definition": {"it": "...", "pl": "..."},
      "context_sentence": {"it": "...", "pl": "..."},
      "audio_hint": "..."
    }
  ],
  "useful_phrases": [
    {
      "expression": "...",
      "translation": "...",
      "context": {"it": "...", "pl": "..."}
    }
  ],
  "grammar": [
    {
      "title": {"it": "...", "pl": "..."},
      "content": {"it": "...", "pl": "..."},
      "examples": [{"it": "...", "pl": "..."}]
    }
  ],
  "common_mistakes": [
    {
      "wrong": "...",
      "correct": "...",
      "explanation": {"it": "...", "pl": "..."}
    }
  ],
  "dialogue": {
    "title": {"it": "...", "pl": "..."},
    "lines": [
      {
        "speaker": "...",
        "text": {"it": "...", "pl": "..."},
        "annotation": {"it": "...", "pl": "..."}
      }
    ]
  },
  "culture": {
    "title": {"it": "...", "pl": "..."},
    "content": {"it": "...", "pl": "..."}
  },
  "idiom": {
    "phrase": "...",
    "literal": {"it": "...", "pl": "..."},
    "meaning": {"it": "...", "pl": "..."},
    "origin": {"it": "...", "pl": "..."}
  }
}

Include exactly: 8-10 vocabulary items, 5 useful phrases, 2 grammar points, 3 common mistakes, a dialogue with 4-6 lines.
difficulty_level must be one of: A1, A2, B1, B2, C1.
gender must be one of: m, f, pl, invariant.`;

export const generateLesson = async (topic: string, apiKey: string): Promise<Lesson> => {
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "Włoski Mistrz AI",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: buildUserPrompt(topic) },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = (errorData as any)?.error?.message || `Błąd API: ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  const text = (data as any).choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("Brak odpowiedzi z API");
  }

  const lessonData = JSON.parse(text);

  return {
    ...lessonData,
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString() + Math.random().toString(36).substring(7),
    timestamp: Date.now(),
  };
};
