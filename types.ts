// ─── Primitives ───────────────────────────────────────────────────────────────

export type Lang = 'it' | 'pl' | 'en' | 'fr' | 'es' | 'de' | 'cs' | 'ru' | 'pt' | 'el';
export type TargetLang = 'it' | 'en' | 'fr' | 'es' | 'de' | 'cs' | 'ru' | 'pt' | 'el'; // język docelowy nauki

export interface Bilingual {
  it?: string;
  en?: string;
  fr?: string;
  es?: string;
  de?: string;
  cs?: string;
  ru?: string;
  pt?: string;
  el?: string;
  pl: string;
}

export type DifficultyLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
export type PartOfSpeech = 'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase' | 'interjection' | 'conjunction' | 'preposition';
export type Register = 'formal' | 'informal' | 'colloquial' | 'literary' | 'regional' | 'vulgar';
export type NounGender = 'm' | 'f' | 'pl' | 'invariant';
export type MistakeCategory = 'false_friend' | 'grammar' | 'pronunciation' | 'usage' | 'spelling';
export type DialogueTone = 'neutral' | 'happy' | 'surprised' | 'formal' | 'casual' | 'ironic' | 'questioning' | 'emphatic';

// ─── Vocabulary ───────────────────────────────────────────────────────────────

export interface WordFamily {
  form: string;          // e.g. "amare" (verb form of "amore")
  type: string;          // e.g. "verb", "adjective"
  translation: string;   // Polish gloss
}

export interface VocabularyItem {
  word: string;
  ipa?: string;                     // e.g. "/laˈvoːro/"
  gender?: NounGender;
  plural?: string;
  part_of_speech: PartOfSpeech;
  register?: Register;
  translation: string;              // main Polish translation
  english_translation?: string;     // English translation (for Italian lessons)
  definition: Bilingual;
  context_sentence: Bilingual;
  audio_hint?: string;              // phonetic tip e.g. "gn -> ń"
  etymology?: Bilingual;
  synonyms?: string[];
  antonyms?: string[];
  word_family?: WordFamily[];
}

// ─── Grammar ─────────────────────────────────────────────────────────────────

export interface GrammarExample {
  it?: string;
  en?: string;
  fr?: string;
  es?: string;
  de?: string;
  cs?: string;
  ru?: string;
  pt?: string;
  el?: string;
  pl: string;
  breakdown?: string;               // e.g. "soggetto + ausiliare + participio"
}

export interface GrammarSection {
  title: Bilingual;
  explanation: Bilingual;
  pattern?: string;                 // formula e.g. "avere/essere + participio passato"
  examples: GrammarExample[];
  exceptions?: Bilingual[];
}

// ─── Mistakes ─────────────────────────────────────────────────────────────────

export interface MistakeAlert {
  category: MistakeCategory;
  wrong: string;
  correct: string;
  explanation: Bilingual;
  mnemonic?: Bilingual;             // memory trick
}

// ─── Phrases ──────────────────────────────────────────────────────────────────

export interface Phrase {
  expression: string;
  translation: string;
  register: Register;
  context: Bilingual;               // when to use
  example_usage?: Bilingual;        // example sentence using this phrase
}

// ─── Pronunciation ────────────────────────────────────────────────────────────

export interface PronunciationTip {
  sound: string;                    // e.g. "gli", "gn", "sc"
  description: Bilingual;
  example_word: string;
  example_sentence?: string;        // Italian sentence showing the sound
  common_mistake?: Bilingual;       // what Polish speakers do wrong
}

// ─── Dialogue ─────────────────────────────────────────────────────────────────

export interface DialogueLine {
  speaker: string;
  text: Bilingual;
  tone?: DialogueTone;
  annotation?: Bilingual;           // stage direction / tone note
  grammar_note?: Bilingual;         // grammar point highlighted in this line
}

// ─── Culture ──────────────────────────────────────────────────────────────────

export interface CulturalNote {
  icon: string;                     // emoji
  title: Bilingual;
  content: Bilingual;
  region?: string;                  // e.g. "Toscana", "Sicilia"
}

// ─── Root Lesson Object ───────────────────────────────────────────────────────

export interface Lesson {
  // meta
  id: string;
  timestamp: number;
  targetLang?: TargetLang; // 'it' (domyślnie), 'en' lub 'fr'
  emoji: string;
  topic: Bilingual;
  subtitle: Bilingual;              // magazine-style deck subtitle
  tags: string[];                   // e.g. ["gastronomia","storia","arte"]
  difficulty_level: DifficultyLevel;
  estimated_reading_minutes: number;

  // intro
  introduction: Bilingual;
  key_takeaways: Bilingual[];       // 3 bullet-point highlights

  // vocabulary
  vocabulary: VocabularyItem[];

  // pronunciation
  pronunciation_tips: PronunciationTip[];

  // grammar & mistakes
  grammar: GrammarSection[];
  common_mistakes: MistakeAlert[];

  // phrases
  useful_phrases: Phrase[];

  // narrative
  mini_story: {
    title: Bilingual;
    text: Bilingual;                // ~100-150 word story
    moral?: Bilingual;
  };

  // dialogue
  dialogue: {
    title: Bilingual;
    setting: Bilingual;             // scene description
    lines: DialogueLine[];
    vocabulary_highlight?: string[]; // Italian words worth noticing in dialogue
  };

  // culture
  culture: {
    title: Bilingual;
    content: Bilingual;
    did_you_know: Bilingual;
  };
  cultural_notes: CulturalNote[];   // 2-3 additional cultural snippets

  // linguistic gems
  proverb: {
    text: string;                   // Italian original
    translation: Bilingual;
    meaning: Bilingual;
  };
  idiom: {
    phrase: string;
    literal: Bilingual;
    meaning: Bilingual;
    origin?: Bilingual;
    example_sentence?: Bilingual;
  };

  // extras
  trivia?: Bilingual;
  regional_notes?: Bilingual;

  // deep reading blocks — two extended thematic prose sections
  deep_dive?: Bilingual;               // after vocabulary: in-depth thematic exploration
  deep_dive_title?: Bilingual;         // AI-generated section title for deep dive
  closing_reflection?: Bilingual;      // after dialogue: reflective / narrative closing
  closing_reflection_title?: Bilingual; // AI-generated section title for closing reflection
}

// ─── App State ────────────────────────────────────────────────────────────────

export interface GenerationState {
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
}

// ─── Exercise System ──────────────────────────────────────────────────────────

export type ExerciseType =
  | 'multiple_choice'      // Wybór wielokrotny
  | 'fill_blank'           // Uzupełnij lukę
  | 'translation_tl_pl'    // Przetłumacz z TL na PL
  | 'translation_pl_tl'    // Przetłumacz z PL na TL
  | 'matching'             // Dopasuj pary
  | 'word_order'           // Ułóż słowa w zdanie
  | 'true_false'           // Prawda/Fałsz
  | 'error_correction'     // Popraw błąd
  | 'conjugation'          // Podaj formę odmiany
  | 'gap_fill_wordbank'    // Uzupełnij z bankiem słów
  | 'dialogue_completion'  // Uzupełnij dialog
  | 'definition_match';    // Dopasuj do definicji

export type ExerciseDifficulty = 'easy' | 'medium' | 'hard';

export interface ExerciseBase {
  id: string;
  difficulty: ExerciseDifficulty;
  focus: string;              // e.g. "słownictwo: cibo", "gramatyka: passato prossimo"
  instruction_pl: string;     // instruction in Polish
  instruction_tl?: string;    // instruction in target language
  explanation_pl?: string;    // explanation shown after answering (Polish)
  explanation_tl?: string;    // explanation in target language
}

export type Exercise = ExerciseBase & (
  | {
      type: 'multiple_choice';
      question: string;         // question in target lang
      question_pl?: string;     // optional Polish translation
      options: string[];        // 4 options
      correct_index: number;
    }
  | {
      type: 'fill_blank';
      sentence: string;         // sentence with ___ for blank
      correct: string;          // correct word/phrase
      hint?: string;            // grammar hint e.g. "czasownik 'essere', 3. os. l.mn."
    }
  | {
      type: 'translation_tl_pl';
      source: string;           // source sentence in target lang
      correct: string;          // correct Polish translation
      acceptable?: string[];    // alternative correct translations
    }
  | {
      type: 'translation_pl_tl';
      source: string;           // Polish source sentence
      correct: string;          // correct target lang translation
      acceptable?: string[];    // alternative correct translations
    }
  | {
      type: 'matching';
      pairs: Array<{ id: string; left: string; right: string }>;  // left = TL word, right = PL meaning
    }
  | {
      type: 'word_order';
      words: string[];          // shuffled words in target lang
      correct: string;          // correct sentence
      translation_hint?: string; // Polish meaning as hint
    }
  | {
      type: 'true_false';
      statement: string;        // statement in target lang
      statement_pl?: string;    // optional Polish translation
      is_true: boolean;
      correction?: string;      // correct version if statement is false
    }
  | {
      type: 'error_correction';
      incorrect_sentence: string;
      correct_sentence: string;
      error_type: string;       // e.g. "błąd gramatyczny – rodzaj rzeczownika"
    }
  | {
      type: 'conjugation';
      verb: string;             // infinitive
      tense: string;            // tense name in Polish
      pronoun: string;          // e.g. "io", "tu", "lui/lei"
      pronoun_pl: string;       // e.g. "ja", "ty", "on/ona"
      correct: string;          // correct conjugated form
    }
  | {
      type: 'gap_fill_wordbank';
      text: string;             // text with _1_, _2_ etc. markers
      word_bank: string[];      // words including distractors
      correct_answers: string[]; // ordered correct answers for each gap
    }
  | {
      type: 'dialogue_completion';
      context_pl: string;       // brief description of context in Polish
      dialogue: Array<{
        speaker: string;
        text: string;
        is_blank?: boolean;     // this line needs to be filled
      }>;
      options: string[];        // multiple choice options
      correct_index: number;
    }
  | {
      type: 'definition_match';
      definition: string;       // definition in target lang
      definition_pl?: string;   // definition in Polish
      options: string[];        // 4 words to choose from
      correct_index: number;
    }
);

export interface ExerciseSet {
  lessonId: string;
  lessonEmoji: string;
  lessonTopic: Bilingual;
  lessonSubtitle?: Bilingual;
  targetLang: TargetLang;
  difficulty_level: DifficultyLevel;
  generatedAt: number;
  exercises: Exercise[];
}

export interface ExerciseAttempt {
  exerciseId: string;
  correct: boolean;
  userAnswer?: string;
}
