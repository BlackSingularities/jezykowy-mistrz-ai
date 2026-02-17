export interface Bilingual {
  it: string;
  pl: string;
}

export interface VocabularyItem {
  word: string;
  gender?: 'm' | 'f' | 'pl' | 'invariant';
  plural?: string;
  translation: string;
  definition: Bilingual;
  context_sentence: Bilingual;
  audio_hint?: string; // e.g. phonetic help
}

export interface GrammarSection {
  title: Bilingual;
  content: Bilingual;
  examples: Bilingual[];
}

export interface MistakeAlert {
  wrong: string;
  correct: string;
  explanation: Bilingual;
}

export interface Phrase {
  expression: string;
  translation: string;
  context: Bilingual;
}

export interface DialogueLine {
  speaker: string;
  text: Bilingual;
  annotation?: Bilingual; // e.g. "spoken angrily" or "formal tone"
}

export interface Lesson {
  id: string;
  timestamp: number;
  topic: Bilingual;
  emoji: string;
  difficulty_level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  introduction: Bilingual;
  vocabulary: VocabularyItem[];
  grammar: GrammarSection[];
  common_mistakes: MistakeAlert[];
  useful_phrases: Phrase[];
  dialogue: {
    title: Bilingual;
    lines: DialogueLine[];
  };
  culture: {
    title: Bilingual;
    content: Bilingual;
  };
  idiom: {
    phrase: string;
    literal: Bilingual;
    meaning: Bilingual;
    origin?: Bilingual;
  };
  trivia?: Bilingual; // Fun fact
}

export interface GenerationState {
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
}