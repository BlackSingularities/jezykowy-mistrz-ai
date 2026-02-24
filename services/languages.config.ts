// ─── Central Language Configuration ────────────────────────────────────────────
// Single source of truth for all language metadata.
// Adding a new language = one entry here + one SVG in Flag.tsx.

import type { TargetLang } from '../types';

export interface LangConfig {
  code: TargetLang;
  /** Polish name: "Włoski" */
  namePl: string;
  /** Native name: "Italiano" */
  nativeName: string;
  /** English name used in AI prompts: "Italian" */
  englishName: string;
  /** Full pair for system prompt: "Italian/Polish" */
  namePair: string;
  /** Full pair for user prompt: "Italian–Polish" */
  textPair: string;
  /** Learner qualifier for user prompt, e.g. "Italian" or "European Portuguese" */
  learnerLabel: string;
  /** CULTURAL AUTHENTICITY bullet text */
  culturalAuth: string;
  /** Extra LINGUISTIC PRECISION details (appended after standard line) */
  linguisticPrecision: string;
  /** Extra POLISH SPEAKER FOCUS details (appended after standard line) */
  polishFocus: string;
  /** Grammar instruction note (req. 4 in user prompt) */
  grammarNote: string;
  /** Common mistakes extra note (req. 5 in user prompt) */
  commonMistakesNote: string;
  /** Mini-story location/setting note */
  miniStoryLocation: string;
  /** Culture section details (req. 8) */
  cultureDetails: string;
  /** Proverb type label, e.g. 'REAL Italian proverb' */
  proverbTerm: string;
  /** Idiom type label, e.g. 'genuine "modo di dire"' */
  idiomTerm: string;
  /** Default emoji for JSON template */
  defaultEmoji: string;
  /** Whether vocab call should include english_translation field */
  hasEnglishTranslation: boolean;
  /** Polish aria-label for the flag: "Flaga Włoch" */
  flagLabelPl: string;
  /** Tooltip shown in BilingualBlock when text is in Polish (click to switch) */
  tooltipTL: string;
  /** CEFR level labels in this language */
  diffLabels: { A1: string; A2: string; B1: string; B2: string; C1: string };
  /** Error message for model loading failure (in this language) */
  modelLoadErrorMsg: string;
  // ── Vocabulary generation ──────────────────────────────────────────────────
  /** Extra note appended to the vocab lexicographer system prompt */
  vocabSystemNote: string;
  /** Description of how to write the 'word' field in vocab entries */
  vocabWordNote: string;
  /** Example text for the audio_hint field in vocab prompts */
  vocabAudioHintExample: string;
}

export const LANGUAGE_CONFIGS = {
  it: {
    code: 'it',
    namePl: 'Włoski',
    nativeName: 'Italiano',
    englishName: 'Italian',
    namePair: 'Italian/Polish',
    textPair: 'Italian–Polish',
    learnerLabel: 'Italian',
    culturalAuth: 'Italy is not monolithic — mention regions, dialects, social classes, historical periods.',
    linguisticPrecision: '',
    polishFocus: '',
    grammarNote: '',
    commonMistakesNote: '≥ 5 mistakes total.',
    miniStoryLocation: 'literary quality, named Italian characters, specific Italian location.',
    cultureDetails: 'historical depth, regional specifics, contemporary relevance.',
    proverbTerm: 'REAL Italian proverb',
    idiomTerm: 'genuine "modo di dire"',
    defaultEmoji: '🇮🇹',
    hasEnglishTranslation: true,
    flagLabelPl: 'Flaga Włoch',
    tooltipTL: 'Clicca → Italiano',
    diffLabels: { A1: 'Principiante', A2: 'Elementare', B1: 'Intermedio', B2: 'Intermedio sup.', C1: 'Avanzato' },
    modelLoadErrorMsg: 'Impossibile caricare i modelli.',
    vocabSystemNote: ' You also provide English translations for each item.',
    vocabWordNote: 'the Italian word/phrase',
    vocabAudioHintExample: 'pronunciation tip for Polish speakers (e.g. "gli = ʎ, jak polskie ль")',
  },
  en: {
    code: 'en',
    namePl: 'Angielski',
    nativeName: 'English',
    englishName: 'English',
    namePair: 'English/Polish',
    textPair: 'English–Polish',
    learnerLabel: 'English',
    culturalAuth: 'English-speaking world is diverse — mention British, American, Australian, and other varieties.',
    linguisticPrecision: '',
    polishFocus: '',
    grammarNote: '',
    commonMistakesNote: '≥ 5 mistakes total.',
    miniStoryLocation: 'literary quality, named characters.',
    cultureDetails: 'historical depth, regional specifics, contemporary relevance (British vs American perspective where relevant).',
    proverbTerm: 'REAL English proverb',
    idiomTerm: 'genuine English idiom',
    defaultEmoji: '🇬🇧',
    hasEnglishTranslation: false,
    flagLabelPl: 'Flaga Wielkiej Brytanii',
    tooltipTL: 'Click → English',
    diffLabels: { A1: 'Beginner', A2: 'Elementary', B1: 'Intermediate', B2: 'Upper-Intermediate', C1: 'Advanced' },
    modelLoadErrorMsg: 'Could not load models.',
    vocabSystemNote: '',
    vocabWordNote: 'the English word/phrase',
    vocabAudioHintExample: 'pronunciation tip for Polish speakers',
  },
  fr: {
    code: 'fr',
    namePl: 'Francuski',
    nativeName: 'Français',
    englishName: 'French',
    namePair: 'French/Polish',
    textPair: 'French–Polish',
    learnerLabel: 'French',
    culturalAuth: 'French-speaking world is diverse — mention France, Belgium, Switzerland, Quebec, and Francophone Africa where relevant.',
    linguisticPrecision: '',
    polishFocus: '',
    grammarNote: '',
    commonMistakesNote: '≥ 5 mistakes total.',
    miniStoryLocation: 'literary quality, named characters set in a French-speaking country.',
    cultureDetails: 'historical depth, regional specifics, contemporary relevance (French vs Belgian vs Quebec perspective where relevant).',
    proverbTerm: 'REAL French proverb',
    idiomTerm: 'genuine French idiom ("expression idiomatique")',
    defaultEmoji: '🇫🇷',
    hasEnglishTranslation: false,
    flagLabelPl: 'Flaga Francji',
    tooltipTL: 'Cliquez → Français',
    diffLabels: { A1: 'Débutant', A2: 'Élémentaire', B1: 'Intermédiaire', B2: 'Interm. supérieur', C1: 'Avancé' },
    modelLoadErrorMsg: 'Impossible de charger les modèles.',
    vocabSystemNote: '',
    vocabWordNote: 'the French word/phrase',
    vocabAudioHintExample: 'pronunciation tip for Polish speakers (e.g. "ou = /u/, jak polskie \'u\' — nie wymawiaj jak \'ou\' w polskim")',
  },
  es: {
    code: 'es',
    namePl: 'Hiszpański',
    nativeName: 'Español',
    englishName: 'Spanish',
    namePair: 'Spanish/Polish',
    textPair: 'Spanish–Polish',
    learnerLabel: 'Spanish',
    culturalAuth: 'Spanish-speaking world is diverse — mention Spain, Mexico, Argentina, Colombia, and other regions where relevant.',
    linguisticPrecision: '',
    polishFocus: '',
    grammarNote: '',
    commonMistakesNote: '≥ 5 mistakes total.',
    miniStoryLocation: 'literary quality, named characters set in a Spanish-speaking country.',
    cultureDetails: 'historical depth, regional specifics, contemporary relevance (Spain vs Latin America perspective where relevant).',
    proverbTerm: 'REAL Spanish proverb',
    idiomTerm: 'genuine Spanish idiom ("expresión idiomática")',
    defaultEmoji: '🇪🇸',
    hasEnglishTranslation: false,
    flagLabelPl: 'Flaga Hiszpanii',
    tooltipTL: 'Clic → Español',
    diffLabels: { A1: 'Principiante', A2: 'Elemental', B1: 'Intermedio', B2: 'Interm. superior', C1: 'Avanzado' },
    modelLoadErrorMsg: 'No se pudieron cargar los modelos.',
    vocabSystemNote: '',
    vocabWordNote: 'the Spanish word/phrase',
    vocabAudioHintExample: 'pronunciation tip for Polish speakers',
  },
  de: {
    code: 'de',
    namePl: 'Niemiecki',
    nativeName: 'Deutsch',
    englishName: 'German',
    namePair: 'German/Polish',
    textPair: 'German–Polish',
    learnerLabel: 'German',
    culturalAuth: 'German-speaking world is diverse — mention Germany, Austria, Switzerland, and other German-speaking regions where relevant.',
    linguisticPrecision: 'Pay special attention to German case system, verb position, and compound words.',
    polishFocus: 'Note where German and Polish grammar overlap (e.g. cases) and where they diverge.',
    grammarNote: 'Focus on German-specific structures (cases, verb-second order, separable verbs, modal verbs, etc.).',
    commonMistakesNote: '≥ 5 mistakes total.',
    miniStoryLocation: 'literary quality, named characters set in a German-speaking country.',
    cultureDetails: 'historical depth, regional specifics, contemporary relevance (Germany vs Austria vs Switzerland perspective where relevant).',
    proverbTerm: 'REAL German proverb (Sprichwort)',
    idiomTerm: 'genuine German idiom (Redewendung)',
    defaultEmoji: '🇩🇪',
    hasEnglishTranslation: false,
    flagLabelPl: 'Flaga Niemiec',
    tooltipTL: 'Klicken → Deutsch',
    diffLabels: { A1: 'Anfänger', A2: 'Grundkenntnisse', B1: 'Mittelstufe', B2: 'Gute Mittelstufe', C1: 'Fortgeschritten' },
    modelLoadErrorMsg: 'Modelle konnten nicht geladen werden.',
    vocabSystemNote: ' Pay special attention to German noun genders (der/die/das), plural forms, and separable verb prefixes.',
    vocabWordNote: 'the German word/phrase (for nouns include the article: der/die/das)',
    vocabAudioHintExample: 'pronunciation tip for Polish speakers (e.g. German ch/sch/st/sp sounds, umlauts ae/oe/ue)',
  },
  cs: {
    code: 'cs',
    namePl: 'Czeski',
    nativeName: 'Čeština',
    englishName: 'Czech',
    namePair: 'Czech/Polish',
    textPair: 'Czech–Polish',
    learnerLabel: 'Czech',
    culturalAuth: 'Czech-speaking world is diverse — mention Bohemia, Moravia, Silesia, and Slovak connections where relevant. Reference Czech history, literature, music, and cuisine with authority.',
    linguisticPrecision: 'Pay special attention to Czech aspect pairs (perfective/imperfective), declension, and the soft/hard consonant distinction.',
    polishFocus: 'Note where Czech and Polish are close (Slavic cognates) and where they diverge (false friends such as "čerstvý" vs. "czerstwy", "hrozný" vs. "groźny", "zápach" vs. "zapach"). The Czech letter "ř", vowel length marks (á/é/í/ó/ú/ů), and verbal aspects are key challenges.',
    grammarNote: 'Focus on Czech-specific structures (aspect pairs, declension cases, verbal prefixes, word order, negation with genitive).',
    commonMistakesNote: 'name the Polish word causing interference, especially Czech-Polish false friends ("čerstvý"/"czerstwy", "hrozný"/"groźny", "zápach"/"zapach", etc.). ≥ 5 mistakes total.',
    miniStoryLocation: 'literary quality, named characters set in the Czech Republic (Praha, Brno, Olomouc, Český Krumlov, etc.).',
    cultureDetails: 'historical depth, regional specifics, contemporary relevance (Czech literature, music, cuisine, and history).',
    proverbTerm: 'REAL Czech proverb (přísloví)',
    idiomTerm: 'genuine Czech idiom (rčení)',
    defaultEmoji: '🇨🇿',
    hasEnglishTranslation: false,
    flagLabelPl: 'Flaga Czech',
    tooltipTL: 'Klikněte → Česky',
    diffLabels: { A1: 'Začátečník', A2: 'Elementární', B1: 'Středně pokročilý', B2: 'Vyšší středně pokr.', C1: 'Pokročilý' },
    modelLoadErrorMsg: 'Nepodařilo se načíst modely.',
    vocabSystemNote: ' Pay special attention to Czech noun genders (masculine animate/inanimate, feminine, neuter), aspect pairs (imperfective/perfective), and the characteristic Czech sounds (ř, č, š, ž, long vowels á/é/í/ó/ú/ů).',
    vocabWordNote: 'the Czech word/phrase (for nouns include gender hint in brackets if helpful, e.g. "ten/ta/to")',
    vocabAudioHintExample: 'pronunciation tip for Polish speakers (e.g. Czech ř sound, long vowels, háček letters č/š/ž, soft/hard consonants, word stress always on first syllable)',
  },
  ru: {
    code: 'ru',
    namePl: 'Rosyjski',
    nativeName: 'Русский',
    englishName: 'Russian',
    namePair: 'Russian/Polish',
    textPair: 'Russian–Polish',
    learnerLabel: 'Russian',
    culturalAuth: 'the Russian-speaking world is vast and diverse — mention Russia, its regions (Siberia, the Urals, the Caucasus, the Far East), as well as connections to Soviet history, literature (Pushkin, Tolstoy, Dostoevsky, Chekhov), music, ballet, and cuisine with authority.',
    linguisticPrecision: 'Russian has three grammatical genders, six cases, verbal aspects (perfective/imperfective), and a non-Latin script (Cyrillic). Distinguish registers, connotations, and pragmatic constraints scrupulously.',
    polishFocus: 'Note where Russian and Polish are close (Slavic cognates) and where they diverge sharply (false friends such as "урод" vs. "uroda", "неделя" vs. "niedziela"). The Cyrillic alphabet, the absence of articles, the case system, and verbal aspects are key challenges for Polish learners.',
    grammarNote: 'Focus on Russian-specific structures (verbal aspects, case government, motion verbs, negation with genitive, short-form adjectives, reflexive verbs with -ся/-сь).',
    commonMistakesNote: 'name the Polish word causing interference, especially Russian-Polish false friends ("урод"/"uroda", "неделя"/"niedziela", "запах"/"zapach" meaning difference, "вонь"/"woń", etc.). ≥ 5 mistakes total.',
    miniStoryLocation: 'literary quality, named characters set in Russia (Москва, Санкт-Петербург, Байкал, Сибирь, etc.).',
    cultureDetails: 'historical depth, regional specifics, contemporary relevance (Russian literature, music, ballet, cuisine, and history).',
    proverbTerm: 'REAL Russian proverb (пословица)',
    idiomTerm: 'genuine Russian idiom (идиома/фразеологизм)',
    defaultEmoji: '🇷🇺',
    hasEnglishTranslation: false,
    flagLabelPl: 'Flaga Rosji',
    tooltipTL: 'Нажмите → Русский',
    diffLabels: { A1: 'Начинающий', A2: 'Элементарный', B1: 'Средний', B2: 'Выше среднего', C1: 'Продвинутый' },
    modelLoadErrorMsg: 'Не удалось загрузить модели.',
    vocabSystemNote: ' Pay special attention to Russian noun genders (masculine, feminine, neuter), number (singular/plural), case declension patterns, verbal aspects (imperfective/perfective pairs), and the stress patterns that are so characteristic of Russian. Always write Russian words in Cyrillic script.',
    vocabWordNote: 'the Russian word/phrase in Cyrillic (for nouns include gender hint if helpful, e.g. "[м]", "[ж]", "[ср]"; for verbs give the infinitive)',
    vocabAudioHintExample: 'pronunciation tip for Polish speakers (e.g. Russian stress, reduction of unstressed vowels o->a and e->i, palatalization, rolled r, hard/soft consonants, Cyrillic letters that look like Latin but sound different: p=/r/, H=/n/, C=/s/, etc.)',
  },
  pt: {
    code: 'pt',
    namePl: 'Portugalski',
    nativeName: 'Português',
    englishName: 'Portuguese',
    namePair: 'Portuguese/Polish',
    textPair: 'Portuguese–Polish',
    learnerLabel: 'European Portuguese',
    culturalAuth: 'Portugal is rich in history, literature (Camões, Pessoa, Saramago), music (fado), maritime heritage, and the lusophone world. Mention the Age of Discoveries, the Algarve, Lisbon, Porto, the Douro valley, the Azores, Madeira, and connections to Brazil and the Portuguese-speaking world where relevant.',
    linguisticPrecision: 'European Portuguese has nasal vowels, complex vowel reduction in unstressed syllables, the personal infinitive, the future subjunctive, and a rich system of clitic pronouns. Distinguish registers, including formal BP/EP differences where pedagogically useful.',
    polishFocus: 'Note where Polish and Portuguese share Latin roots (both have extensive Romance vocabulary through borrowings), and where they diverge. Key challenges for Polish speakers: nasal vowels (ã, ẽ, õ), the vowel reduction (unstressed o sounds like u, unstressed e is often swallowed), placing clitic pronouns, the personal infinitive, and the distinction between ser/estar.',
    grammarNote: 'Focus on Portuguese-specific structures (ser vs. estar, personal infinitive, future subjunctive, clitic pronouns, nasal vowels, the conjunctive/subjunctive mood, pretérito perfeito vs. imperfeito).',
    commonMistakesNote: 'Key false friends and traps: "borracha" (rubber, not drunk woman), "polvo" (octopus, not dust), "apelido" (surname, not appeal), "embaraçada" (entangled/embarrassed, NOT pregnant — that\'s "grávida"), the ser/estar confusion, clitic pronoun placement, nasal vowel pronunciation. ≥ 5 mistakes total.',
    miniStoryLocation: 'literary quality, named characters set in Portugal (Lisboa, Porto, Sintra, Algarve, Douro, Açores, Madeira, etc.).',
    cultureDetails: 'historical depth, regional specifics, contemporary relevance (fado, Age of Discoveries, Pastéis de Belém, Vinho Verde, Port wine, Fernando Pessoa, José Saramago, the saudade concept, Carnation Revolution).',
    proverbTerm: 'REAL Portuguese proverb (provérbio)',
    idiomTerm: 'genuine Portuguese idiom/expression',
    defaultEmoji: '🇵🇹',
    hasEnglishTranslation: false,
    flagLabelPl: 'Flaga Portugalii',
    tooltipTL: 'Clique → Português',
    diffLabels: { A1: 'Iniciante', A2: 'Elementar', B1: 'Intermédio', B2: 'Interm. superior', C1: 'Avançado' },
    modelLoadErrorMsg: 'Não foi possível carregar os modelos.',
    vocabSystemNote: ' Pay special attention to Portuguese noun genders (masculine/feminine), the distinction between ser and estar, verbal conjugation patterns (including irregular verbs), nasal vowels (ã, ẽ, õ, ão, ãe), and the European Portuguese pronunciation features that differ from Brazilian Portuguese (unstressed vowel reduction, final -e dropping, palatalization). Always use European Portuguese spelling and pronunciation.',
    vocabWordNote: 'the Portuguese word/phrase (for nouns include the definite article to show gender: "o/a")',
    vocabAudioHintExample: 'pronunciation tip for Polish speakers (e.g. nasal vowels ão/ã/ẽ, unstressed -e dropping in EP, -lh- = /ʎ/ like Polish \'l\' before soft vowels, -nh- = /ɲ/ like Polish \'ń\', the difference between EP and BP pronunciation, stress patterns)',
  },
  el: {
    code: 'el',
    namePl: 'Grecki',
    nativeName: 'Ελληνικά',
    englishName: 'Greek',
    namePair: 'Greek/Polish',
    textPair: 'Greek–Polish',
    learnerLabel: 'Modern Greek',
    culturalAuth: 'Greece is the cradle of Western civilization — democracy, philosophy (Socrates, Plato, Aristotle), epic poetry (Homer), theatre, mathematics, and the Olympic Games. Mention Athens, Thessaloniki, Crete, Santorini, the Aegean, Mount Olympus, Byzantine heritage, the Greek Orthodox church, rebetiko music, ouzo, meze, the mezedopoleio, taverna culture, and the richness of Greek mythology and history.',
    linguisticPrecision: 'Modern Greek has a rich nominal system (four cases: nominative, genitive, accusative, vocative; three genders: masculine, feminine, neuter), verb aspects (perfective and imperfective), an augmented verb system, the Greek alphabet (24 letters), diacritical marks (tonos), and a distinction between formal (katharevousa legacy) and informal registers. Note polytonic vs. monotonic orthography.',
    polishFocus: 'Polish speakers struggle with: the Greek alphabet and its pronunciation, noun case endings (different from Polish cases), verb aspect (similar concept to Polish but expressed differently), the absence of a verb "to have" (χρησιμοποιώ vs. έχω), definite/indefinite articles (Polish has none), and tonal accent. Note helpful shared Latin/Greek roots in Polish scientific and learned vocabulary.',
    grammarNote: 'Focus on Greek-specific structures (noun declension in 4 cases, verb aspects, augment in past tenses, articles, verb conjugation patterns, subjunctive mood with να, conditional with θα, imperative, the verb "to be" είμαι, particle θα for future/conditional).',
    commonMistakesNote: 'Key traps: confusing Greek cases with Polish cases, omitting the article (Greek requires it almost always), false friends from shared Greek-origin words (e.g., "πρόβλημα" means problem, same as Polish "problem"), spelling confusion between similar-looking Greek letters (ν/η/υ/ι all sound like /i/), verb aspect mistakes, the double negation (δεν... τίποτα). ≥ 5 mistakes total.',
    miniStoryLocation: 'literary quality, named characters set in Greece (Αθήνα, Θεσσαλονίκη, Κρήτη, Σαντορίνη, Μύκονος, Δελφοί, Ολυμπία, etc.).',
    cultureDetails: 'historical depth, regional specifics, contemporary relevance (ancient philosophy, Byzantine heritage, Greek Orthodox tradition, rebetiko, taverna culture, Greek mythology, the Olympic Games, Greek cuisine: moussaka, spanakopita, souvlaki, baklava, ouzo, retsina, Greek coffee).',
    proverbTerm: 'REAL Greek proverb (παροιμία)',
    idiomTerm: 'genuine Greek idiom/expression',
    defaultEmoji: '🇬🇷',
    hasEnglishTranslation: false,
    flagLabelPl: 'Flaga Grecji',
    tooltipTL: 'Κλικ → Ελληνικά',
    diffLabels: { A1: 'Αρχάριος', A2: 'Στοιχειώδης', B1: 'Μεσαίο επίπεδο', B2: 'Ανώτερο μεσαίο', C1: 'Προχωρημένος' },
    modelLoadErrorMsg: 'Δεν ήταν δυνατή η φόρτωση των μοντέλων.',
    vocabSystemNote: ' Pay special attention to Greek noun genders (masculine/feminine/neuter), noun declension patterns across all four cases (nominative, genitive, accusative, vocative), verb aspect (perfective/imperfective), verbal conjugation in the present, past (aorist and imperfect), and future tense, the tonos accent mark and its placement, and pronunciation features of the Greek alphabet. Provide all Greek words with proper accent marks (tonos).',
    vocabWordNote: 'the Greek word/phrase (for nouns include the definite article to show gender: ο/η/το)',
    vocabAudioHintExample: 'pronunciation tip for Polish speakers (e.g. Greek letters and sounds: γ before ε/ι sounds like Polish \'j\', double γγ/γκ = /g/, θ = /θ/ like English \'th\', δ = /ð/ like English \'th\' in \'the\', χ = /x/ like Polish \'ch\', ξ = /ks/, ψ = /ps/, υ/η/ι/ει/οι all = /i/, αυ/ευ = /av/ or /af/ before voiceless, stress placement)',
  },
} as const satisfies Record<TargetLang, LangConfig>;

/** Ordered list for UI display */
export const LANGS_LIST: ReadonlyArray<{ code: TargetLang; name: string; native: string }> = [
  { code: 'en', name: LANGUAGE_CONFIGS.en.namePl, native: LANGUAGE_CONFIGS.en.nativeName },
  { code: 'fr', name: LANGUAGE_CONFIGS.fr.namePl, native: LANGUAGE_CONFIGS.fr.nativeName },
  { code: 'es', name: LANGUAGE_CONFIGS.es.namePl, native: LANGUAGE_CONFIGS.es.nativeName },
  { code: 'it', name: LANGUAGE_CONFIGS.it.namePl, native: LANGUAGE_CONFIGS.it.nativeName },
  { code: 'de', name: LANGUAGE_CONFIGS.de.namePl, native: LANGUAGE_CONFIGS.de.nativeName },
  { code: 'cs', name: LANGUAGE_CONFIGS.cs.namePl, native: LANGUAGE_CONFIGS.cs.nativeName },
  { code: 'ru', name: LANGUAGE_CONFIGS.ru.namePl, native: LANGUAGE_CONFIGS.ru.nativeName },
  { code: 'pt', name: LANGUAGE_CONFIGS.pt.namePl, native: LANGUAGE_CONFIGS.pt.nativeName },
  { code: 'el', name: LANGUAGE_CONFIGS.el.namePl, native: LANGUAGE_CONFIGS.el.nativeName },
];

/** CEFR difficulty labels in all languages — for UI rendering */
export const DIFF_LABELS: Record<string, Record<string, string>> = {
  A1: { pl: 'Początkujący',        ...Object.fromEntries(Object.values(LANGUAGE_CONFIGS).map(c => [c.code, c.diffLabels.A1])) },
  A2: { pl: 'Elementarny',         ...Object.fromEntries(Object.values(LANGUAGE_CONFIGS).map(c => [c.code, c.diffLabels.A2])) },
  B1: { pl: 'Średniozaawansowany', ...Object.fromEntries(Object.values(LANGUAGE_CONFIGS).map(c => [c.code, c.diffLabels.B1])) },
  B2: { pl: 'Wyższy średni',       ...Object.fromEntries(Object.values(LANGUAGE_CONFIGS).map(c => [c.code, c.diffLabels.B2])) },
  C1: { pl: 'Zaawansowany',        ...Object.fromEntries(Object.values(LANGUAGE_CONFIGS).map(c => [c.code, c.diffLabels.C1])) },
};

/** Polish name for each language — for exercise prompts */
export const LANG_NAME_PL: Record<TargetLang, string> = Object.fromEntries(
  Object.values(LANGUAGE_CONFIGS).map(c => [c.code, c.namePl])
) as Record<TargetLang, string>;

/** English name for each language — for AI prompts */
export const LANG_NAME_EN: Record<string, string> = Object.fromEntries(
  Object.values(LANGUAGE_CONFIGS).map(c => [c.code, c.englishName])
);
