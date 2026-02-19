// ─── Primitives ───────────────────────────────────────────────────────────────

export type Lang = 'it' | 'pl' | 'en';
export type TargetLang = 'it' | 'en'; // język docelowy nauki

export interface Bilingual {
  it?: string;
  en?: string;
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
  targetLang?: TargetLang; // 'it' (domyślnie) lub 'en'
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
