import OpenAI from "openai";
import { Lesson, Exercise, ExerciseSet, TargetLang } from "../types";
import { getSavedModel } from "./geminiService";

const DEFAULT_MODEL = "google/gemini-2.5-pro-preview-03-25";
const MAX_EXERCISES = 20;

/** Build a distribution string for the given count */
function buildDistributionPrompt(count: number, langNamePl: string, tl: string): string {
  if (count >= 20) {
    return `OBOWIĄZKOWY rozkład typów ćwiczeń:
- 3x multiple_choice (wybór wielokrotny – pytanie w języku ${langNamePl} lub PL)
- 2x fill_blank (uzupełnij lukę w zdaniu – zdanie w języku ${langNamePl})
- 2x translation_tl_pl (przetłumacz z ${langNamePl} na polski)
- 2x translation_pl_tl (przetłumacz z polskiego na ${langNamePl})
- 1x matching (dopasuj 5 par: słowo ${langNamePl} ↔ polskie znaczenie)
- 1x word_order (ułóż słowa w zdanie – słowa w ${langNamePl})
- 2x true_false (prawda/fałsz – zdanie w ${langNamePl})
- 1x error_correction (popraw błąd w zdaniu ${langNamePl})
- 1x conjugation (podaj formę czasownika w ${langNamePl})
- 1x gap_fill_wordbank (uzupełnij tekst z bankiem słów – tekst w ${langNamePl})
- 1x dialogue_completion (uzupełnij brakującą kwestię dialogu w ${langNamePl})
- 2x definition_match (dopasuj słowo do definicji – definicja w ${langNamePl})
= 20 ćwiczeń łącznie`;
  } else if (count >= 10) {
    return `Rozkład typów ćwiczeń (łącznie ${count}):
Użyj różnych typów. Wymagane: przynajmniej 1x multiple_choice, 1x fill_blank, 1x translation_tl_pl, 1x translation_pl_tl, 1x true_false, 1x matching lub word_order. Pozostałe dobierz według własnego uznania spośród: error_correction, conjugation, gap_fill_wordbank, dialogue_completion, definition_match.`;
  } else {
    return `Rozkład typów ćwiczeń (łącznie ${count}):
Użyj jak najbardziej zróżnicowanych typów. Wymagane: przynajmniej 1x multiple_choice, 1x translation_tl_pl lub translation_pl_tl, 1x fill_blank. Pozostałe dobierz swobodnie.`;
  }
}

// ─── Lesson summary builder ───────────────────────────────────────────────────

function buildLessonSummary(lesson: Lesson): string {
  const tl = lesson.targetLang || "it";

  const topicTl = (lesson.topic as Record<string, string>)[tl] ?? lesson.topic.pl;
  const subtitleTl =
    lesson.subtitle
      ? (lesson.subtitle as Record<string, string>)[tl] ?? lesson.subtitle.pl
      : "";

  const vocab = (lesson.vocabulary || [])
    .map((v) => `${v.word} [${v.ipa ?? ""}] = ${v.translation} (${v.part_of_speech})`)
    .join("\n");

  const grammar = (lesson.grammar || [])
    .map((g) => {
      const titleTl = (g.title as Record<string, string>)[tl] ?? g.title.pl;
      const exampleLines = (g.examples || [])
        .slice(0, 3)
        .map((ex) => {
          const exTl = (ex as Record<string, string>)[tl] ?? "";
          return `  ${exTl} → ${ex.pl}`;
        })
        .join("\n");
      return `• ${titleTl}${g.pattern ? ` (${g.pattern})` : ""}\n${exampleLines}`;
    })
    .join("\n");

  const phrases = (lesson.useful_phrases || [])
    .map((p) => `"${p.expression}" = "${p.translation}"`)
    .join(", ");

  const mistakes = (lesson.common_mistakes || [])
    .slice(0, 5)
    .map((m) => `Błąd: "${m.wrong}" → poprawnie: "${m.correct}"`)
    .join("; ");

  const dialogueLines = (lesson.dialogue?.lines || [])
    .slice(0, 6)
    .map((dl) => {
      const dlTl = (dl.text as Record<string, string>)[tl] ?? "";
      return `${dl.speaker}: ${dlTl}`;
    })
    .join("\n");

  return `TEMAT: ${topicTl} / ${lesson.topic.pl}
PODTYTUŁ: ${subtitleTl}
POZIOM: ${lesson.difficulty_level}
JĘZYK DOCELOWY: ${tl}

SŁOWNICTWO (${(lesson.vocabulary || []).length} słów):
${vocab}

GRAMATYKA:
${grammar}

PRZYDATNE ZWROTY:
${phrases}

TYPOWE BŁĘDY POLSKICH UCZNIÓW:
${mistakes}

FRAGMENT DIALOGU:
${dialogueLines}`;
}

// ─── JSON helpers ──────────────────────────────────────────────────────────────

function tryParseJSON(raw: string): unknown | null {
  // Strip markdown code fences if present
  const stripped = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(stripped);
  } catch {
    // Try to find the first [ ... ] block
    const start = stripped.indexOf("[");
    const end = stripped.lastIndexOf("]");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(stripped.slice(start, end + 1));
      } catch { /* fall through */ }
    }
    return null;
  }
}

// ─── Exercise validation ───────────────────────────────────────────────────────

function isValidExercise(ex: unknown): ex is Exercise {
  if (!ex || typeof ex !== "object") return false;
  const e = ex as Record<string, unknown>;
  if (!e.id || !e.type || !e.difficulty || !e.instruction_pl) return false;

  switch (e.type) {
    case "multiple_choice":
      return (
        typeof e.question === "string" &&
        Array.isArray(e.options) &&
        e.options.length >= 3 &&
        typeof e.correct_index === "number"
      );
    case "fill_blank":
      return typeof e.sentence === "string" && typeof e.correct === "string";
    case "translation_tl_pl":
    case "translation_pl_tl":
      return typeof e.source === "string" && typeof e.correct === "string";
    case "matching":
      return Array.isArray(e.pairs) && e.pairs.length >= 3;
    case "word_order":
      return Array.isArray(e.words) && e.words.length >= 3 && typeof e.correct === "string";
    case "true_false":
      return typeof e.statement === "string" && typeof e.is_true === "boolean";
    case "error_correction":
      return (
        typeof e.incorrect_sentence === "string" &&
        typeof e.correct_sentence === "string"
      );
    case "conjugation":
      return (
        typeof e.verb === "string" &&
        typeof e.tense === "string" &&
        typeof e.pronoun === "string" &&
        typeof e.correct === "string"
      );
    case "gap_fill_wordbank":
      return (
        typeof e.text === "string" &&
        Array.isArray(e.word_bank) &&
        Array.isArray(e.correct_answers)
      );
    case "dialogue_completion":
      return (
        Array.isArray(e.dialogue) &&
        Array.isArray(e.options) &&
        e.options.length >= 2 &&
        typeof e.correct_index === "number"
      );
    case "definition_match":
      return (
        typeof e.definition === "string" &&
        Array.isArray(e.options) &&
        e.options.length >= 3 &&
        typeof e.correct_index === "number"
      );
    default:
      return false;
  }
}

// ─── Main generation function ─────────────────────────────────────────────────

export async function generateExercises(
  lesson: Lesson,
  apiKey: string,
  model?: string,
  count: number = MAX_EXERCISES,
  existingExerciseIds: string[] = []
): Promise<ExerciseSet> {
  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const tl = lesson.targetLang || "it";
  const lessonSummary = buildLessonSummary(lesson);
  const resolvedModel = model || getSavedModel() || DEFAULT_MODEL;

  // Language labels for the prompt
  const langLabel: Record<string, string> = {
    it: "włoski",
    en: "angielski",
    fr: "francuski",
    es: "hiszpański",
    de: "niemiecki",
    cs: "czeski",
    ru: "rosyjski",
    pt: "portugalski",
    el: "grecki",
  };
  const langNamePl = langLabel[tl] ?? tl;

  const actualCount = Math.min(Math.max(count, 1), 50);
  const existingNote = existingExerciseIds.length > 0
    ? `\nUWAGA: Poniższe ćwiczenia już istnieją w zestawie — wygeneruj NOWE, INNE ćwiczenia, które NIE powielają poniższych. Istniejące ID: ${existingExerciseIds.join(', ')}.`
    : '';
  const startId = existingExerciseIds.length + 1;

  const prompt = `Jesteś ekspertem dydaktyki językowej. Na podstawie poniższej lekcji stwórz dokładnie ${actualCount} zróżnicowanych ćwiczeń językowych.${existingNote}

=== MATERIAŁ LEKCJI ===
${lessonSummary}

=== WYMAGANIA ===

Język docelowy lekcji: ${langNamePl} (${tl})
Stwórz dokładnie ${actualCount} ćwiczeń (numeruj ID od ex_${startId} do ex_${startId + actualCount - 1}).

${buildDistributionPrompt(actualCount, langNamePl, tl)}

Ćwiczenia muszą być:
- Bardzo zróżnicowane pod względem formatu i treści
- Oparty na materiale z lekcji (słownictwo, gramatyka, zwroty, dialog)
- Stopniowane trudnością (easy → medium → hard)
- Pedagogicznie wartościowe: każde ćwiczenie ucząc czegoś konkretnego

=== FORMAT JSON ===

Odpowiedz WYŁĄCZNIE obiektem JSON w formie: {"exercises": [...]}
Każde ćwiczenie ma pola bazowe + pola specyficzne dla typu.

POLA BAZOWE (wymagane dla każdego ćwiczenia):
{
  "id": "ex_${startId}",    // ex_${startId} do ex_${startId + actualCount - 1}
  "type": "...",            // jeden z typów powyżej
  "difficulty": "easy|medium|hard",
  "focus": "...",           // co to ćwiczenie sprawdza, np. "słownictwo – jedzenie", "gramatyka – passato prossimo"
  "instruction_pl": "...",  // krótka instrukcja po polsku
  "instruction_tl": "...",  // ta sama instrukcja w języku ${langNamePl}
  "explanation_pl": "...",  // wyjaśnienie poprawnej odpowiedzi po polsku (2-3 zdania)
  "explanation_tl": "..."   // to samo wyjaśnienie w języku ${langNamePl}
}

POLA SPECYFICZNE DLA KAŻDEGO TYPU:

multiple_choice:
{
  "question": "...",        // pytanie w ${langNamePl} LUB polskim
  "question_pl": "...",     // jeśli pytanie jest po ${langNamePl}, dodaj polskie tłumaczenie
  "options": ["A", "B", "C", "D"],  // 4 opcje (TYLKO tekst, bez liter A/B/C/D)
  "correct_index": 0        // indeks poprawnej odpowiedzi (0-3)
}

fill_blank:
{
  "sentence": "Io ___ (mangiare) la pizza ogni giorno.",  // ___ to puste miejsce
  "correct": "mangio",      // słowo które pasuje w lukę
  "hint": "czasownik 'mangiare', 1. osoba l.poj., presente indicativo"
}

translation_tl_pl:
{
  "source": "zdanie w ${langNamePl}",
  "correct": "polskie tłumaczenie",
  "acceptable": ["inne poprawne tłumaczenie", "jeszcze jedno"]  // opcjonalne
}

translation_pl_tl:
{
  "source": "polskie zdanie",
  "correct": "tłumaczenie w ${langNamePl}",
  "acceptable": ["inna poprawna wersja"]  // opcjonalne
}

matching:
{
  "pairs": [
    {"id": "p1", "left": "słowo w ${langNamePl}", "right": "polskie znaczenie"},
    {"id": "p2", "left": "...", "right": "..."},
    {"id": "p3", "left": "...", "right": "..."},
    {"id": "p4", "left": "...", "right": "..."},
    {"id": "p5", "left": "...", "right": "..."}
  ]
}

word_order:
{
  "words": ["słowo1", "słowo2", "słowo3", "słowo4", "słowo5"],  // POMIESZANE słowa
  "correct": "Słowo1 słowo2 słowo3 słowo4 słowo5.",  // poprawne zdanie
  "translation_hint": "polskie tłumaczenie zdania"
}

true_false:
{
  "statement": "zdanie w ${langNamePl}",
  "statement_pl": "polskie tłumaczenie (opcjonalne)",
  "is_true": true,
  "correction": "poprawna wersja jeśli zdanie jest fałszywe"  // tylko gdy is_true=false
}

error_correction:
{
  "incorrect_sentence": "zdanie z błędem w ${langNamePl}",
  "correct_sentence": "poprawna wersja",
  "error_type": "opis błędu po polsku"
}

conjugation:
{
  "verb": "bezokolicznik",
  "tense": "nazwa czasu po polsku",
  "pronoun": "zaimek w ${langNamePl}, np. io",
  "pronoun_pl": "zaimek po polsku, np. ja",
  "correct": "poprawna forma"
}

gap_fill_wordbank:
{
  "text": "Zdanie z _1_ i kolejną _2_ luką.",  // _1_, _2_ itd. jako markery luk
  "word_bank": ["słowo1", "słowo2", "słowo3", "słowo4", "słowo5"],  // zawiera poprawne + rozpraszające
  "correct_answers": ["słowo_do_luki_1", "słowo_do_luki_2"]  // po kolei
}

dialogue_completion:
{
  "context_pl": "opis sytuacji dialogu po polsku",
  "dialogue": [
    {"speaker": "Osoba A", "text": "zdanie"},
    {"speaker": "Osoba B", "text": "___", "is_blank": true},
    {"speaker": "Osoba A", "text": "odpowiedź"}
  ],
  "options": ["opcja A", "opcja B", "opcja C", "opcja D"],
  "correct_index": 0
}

definition_match:
{
  "definition": "definicja słowa w ${langNamePl}",
  "definition_pl": "definicja po polsku (opcjonalne)",
  "options": ["słowo1", "słowo2", "słowo3", "słowo4"],
  "correct_index": 0
}

=== WAŻNE ===
- Zwróć obiekt: {"exercises": [...array of ${actualCount} exercises...]}
- Każde id unikalne: ex_${startId}, ex_${startId + 1}, ..., ex_${startId + actualCount - 1}
- Wszystkie polskie instrukcje płynne i poprawne językowo
- Sprawdź poprawność merytoryczną każdego ćwiczenia
- Ćwiczenia muszą bazować na materiale z lekcji, nie być wymyślone z powietrza`;

  const response = await client.chat.completions.create({
    model: resolvedModel,
    messages: [
      {
        role: "system",
        content:
          'Jesteś ekspertem tworzenia ćwiczeń językowych. Odpowiadasz WYŁĄCZNIE obiektem JSON w postaci {"exercises": [...]} bez żadnych komentarzy, markdown ani code fences.',
      },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    max_tokens: 8192,
  });

  const rawContent = response.choices[0]?.message?.content ?? "[]";

  // The model may return a JSON object with an array field instead of a raw array
  // Handle both cases
  let parsed = tryParseJSON(rawContent);
  let exercisesRaw: unknown[] = [];

  if (Array.isArray(parsed)) {
    exercisesRaw = parsed;
  } else if (parsed && typeof parsed === "object") {
    // Find the first array value
    const vals = Object.values(parsed as Record<string, unknown>);
    const arr = vals.find(Array.isArray);
    if (arr) exercisesRaw = arr as unknown[];
  }

  // Filter to valid exercises only
  const exercises = exercisesRaw
    .filter(isValidExercise)
    .slice(0, actualCount) as Exercise[];

  if (exercises.length === 0) {
    throw new Error("AI returned no valid exercises. Please try again.");
  }

  const topicTl = (lesson.topic as Record<string, string>)[tl] ?? lesson.topic.pl;

  const exerciseSet: ExerciseSet = {
    lessonId: lesson.id,
    lessonEmoji: lesson.emoji,
    lessonTopic: {
      pl: lesson.topic.pl,
      [tl]: topicTl,
    } as import("../types").Bilingual,
    lessonSubtitle: lesson.subtitle,
    targetLang: tl as TargetLang,
    difficulty_level: lesson.difficulty_level,
    generatedAt: Date.now(),
    exercises,
  };

  return exerciseSet;
}

// ─── Append more exercises to existing set ────────────────────────────────────

/**
 * Generates additional exercises and merges them into the existing ExerciseSet.
 * Returns a new ExerciseSet with both old and new exercises.
 */
export async function appendExercises(
  lesson: Lesson,
  existingSet: ExerciseSet,
  count: number,
  apiKey: string,
  model?: string
): Promise<ExerciseSet> {
  const existingIds = existingSet.exercises.map(e => e.id);
  const newSet = await generateExercises(lesson, apiKey, model, count, existingIds);

  return {
    ...existingSet,
    generatedAt: Date.now(),
    exercises: [...existingSet.exercises, ...newSet.exercises],
  };
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

export async function saveExerciseSet(set: ExerciseSet): Promise<void> {
  await fetch(`/api/exercises/${set.lessonId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(set),
  });
}

export async function loadExerciseSet(lessonId: string): Promise<ExerciseSet | null> {
  try {
    const res = await fetch(`/api/exercises/${lessonId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function loadAllExerciseSets(): Promise<ExerciseSet[]> {
  try {
    const res = await fetch("/api/exercises");
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function deleteExerciseSet(lessonId: string): Promise<void> {
  await fetch(`/api/exercises/${lessonId}`, { method: "DELETE" });
}
