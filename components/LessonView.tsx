import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SpeakerWaveIcon,
  BookOpenIcon,
  SparklesIcon,
  GlobeEuropeAfricaIcon,
  ChatBubbleBottomCenterTextIcon,
  LanguageIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  AcademicCapIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  MicrophoneIcon,
  BookmarkIcon,
  StarIcon,
  HeartIcon,
  StopCircleIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

import { Lesson, VocabularyItem, MistakeCategory, Register, DialogueTone, PartOfSpeech } from '../types';
import { useLang } from '../context/LangContext';
import { B } from './BilingualBlock';

// ─── Props ────────────────────────────────────────────────────────────────────

interface LessonViewProps {
  lesson: Lesson;
  onBack: () => void;
  onChangeKey?: () => void;
}

// ─── Bilingual label maps ─────────────────────────────────────────────────────

const POS_LABEL: Record<PartOfSpeech, { pl: string; it: string }> = {
  noun:        { pl: 'rzecz.',   it: 'sost.' },
  verb:        { pl: 'czas.',    it: 'verb.' },
  adjective:   { pl: 'przym.',  it: 'agg.' },
  adverb:      { pl: 'przysł.', it: 'avv.' },
  phrase:      { pl: 'zwrot',   it: 'loc.' },
  interjection:{ pl: 'wykrz.',  it: 'inter.' },
  conjunction: { pl: 'spójn.',  it: 'cong.' },
  preposition: { pl: 'przyim.', it: 'prep.' },
};

const REG_LABEL: Record<Register, { pl: string; it: string }> = {
  formal:     { pl: 'formalny',    it: 'formale' },
  informal:   { pl: 'nieformal.',  it: 'informale' },
  colloquial: { pl: 'potoczny',    it: 'colloq.' },
  literary:   { pl: 'literacki',   it: 'letterario' },
  regional:   { pl: 'regionalny',  it: 'regionale' },
  vulgar:     { pl: 'wulgarny',    it: 'volgare' },
};

const MISTAKE_LABEL: Record<MistakeCategory, { pl: string; it: string }> = {
  false_friend: { pl: 'Fałszywy przyjaciel', it: 'Falso amico' },
  grammar:      { pl: 'Gramatyka',           it: 'Grammatica' },
  pronunciation:{ pl: 'Wymowa',              it: 'Pronuncia' },
  usage:        { pl: 'Użycie',              it: 'Uso' },
  spelling:     { pl: 'Pisownia',            it: 'Ortografia' },
};

const MISTAKE_BG: Record<MistakeCategory, string> = {
  false_friend: 'bg-red-100',
  grammar:      'bg-amber-100',
  pronunciation:'bg-blue-100',
  usage:        'bg-violet-100',
  spelling:     'bg-slate-100',
};

const MISTAKE_COLOR: Record<MistakeCategory, string> = {
  false_friend: 'text-red-700',
  grammar:      'text-amber-700',
  pronunciation:'text-blue-700',
  usage:        'text-violet-700',
  spelling:     'text-slate-600',
};

const DIFFICULTY_COLOR: Record<string, string> = {
  A1: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  A2: 'bg-teal-100 text-teal-700 border-teal-200',
  B1: 'bg-blue-100 text-blue-700 border-blue-200',
  B2: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  C1: 'bg-violet-100 text-violet-700 border-violet-200',
};

const GENDER_STYLE: Record<string, string> = {
  m:        'bg-sky-50 text-sky-600 border-sky-200',
  f:        'bg-pink-50 text-pink-600 border-pink-200',
  pl:       'bg-purple-50 text-purple-600 border-purple-200',
  invariant:'bg-slate-50 text-slate-500 border-slate-200',
};

const GENDER_LABEL: Record<string, { pl: string; it: string }> = {
  m:        { pl: 'm.',     it: 'm.' },
  f:        { pl: 'ż.',     it: 'f.' },
  pl:       { pl: 'l.mn.', it: 'pl.' },
  invariant:{ pl: 'niezm.',it: 'inv.' },
};

const REGISTER_STYLE: Record<Register, string> = {
  formal:    'bg-indigo-50 text-indigo-600 border-indigo-100',
  informal:  'bg-amber-50 text-amber-600 border-amber-100',
  colloquial:'bg-orange-50 text-orange-600 border-orange-100',
  literary:  'bg-rose-50 text-rose-600 border-rose-100',
  regional:  'bg-teal-50 text-teal-600 border-teal-100',
  vulgar:    'bg-red-50 text-red-600 border-red-100',
};

const TONE_EMOJI: Record<DialogueTone, string> = {
  neutral:     '💬',
  happy:       '😊',
  surprised:   '😲',
  formal:      '🎩',
  casual:      '😄',
  ironic:      '😏',
  questioning: '🤔',
  emphatic:    '❗',
};

// ─── TTS: sentence splitter ───────────────────────────────────────────────────

function splitText(text: string): string[] {
  const raw = text.trim();
  const sentences = raw.match(/[^.!?…;]+[.!?…;]*/g)?.map(s => s.trim()).filter(Boolean) ?? [raw];
  const chunks: string[] = [];
  let buf = '';
  for (const s of sentences) {
    if (buf && (buf + ' ' + s).length > 220) { chunks.push(buf.trim()); buf = s; }
    else { buf = buf ? buf + ' ' + s : s; }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks.length ? chunks : [raw];
}

// ─── TTS Hook ─────────────────────────────────────────────────────────────────

const useTTS = () => {
  const [rate, setRate] = useState(0.9);
  const [speakId, setSpeakId] = useState<string | null>(null);
  const voiceRef = React.useRef<SpeechSynthesisVoice | null>(null);
  const [hasItalianVoice, setHasItalianVoice] = useState(false);

  useEffect(() => {
    const findVoice = () => {
      const voices = window.speechSynthesis?.getVoices() ?? [];
      voiceRef.current =
        voices.find(v => v.lang === 'it-IT' && v.localService) ||
        voices.find(v => v.lang === 'it-IT') ||
        voices.find(v => v.lang.startsWith('it')) ||
        null;
      setHasItalianVoice(!!voiceRef.current);
    };
    findVoice();
    window.speechSynthesis?.addEventListener('voiceschanged', findVoice);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', findVoice);
  }, []);

  const speak = useCallback((italianText: string, id: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const chunks = splitText(italianText);
    setSpeakId(id);
    let i = 0;
    const next = () => {
      if (i >= chunks.length) { setSpeakId(null); return; }
      const u = new SpeechSynthesisUtterance(chunks[i++]);
      u.lang = 'it-IT';
      u.rate = rate;
      if (voiceRef.current) u.voice = voiceRef.current;
      u.onend = next;
      u.onerror = () => setSpeakId(null);
      window.speechSynthesis.speak(u);
    };
    next();
  }, [rate]);

  const stop = useCallback(() => { window.speechSynthesis.cancel(); setSpeakId(null); }, []);

  return { rate, setRate, speak, stop, speakId, hasItalianVoice };
};

// ─── Scroll-spy Hook ──────────────────────────────────────────────────────────

const SECTION_IDS = ['intro','vocab','pronunciation','phrases','grammar','mistakes','story','dialogue','culture','gems'];

const useScrollSpy = () => {
  const [active, setActive] = useState('intro');
  useEffect(() => {
    const handler = () => {
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= 320) { setActive(id); break; }
        }
      }
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);
  return active;
};

// ─── Reusable: Badge ──────────────────────────────────────────────────────────

const Badge: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${className}`}>
    {children}
  </span>
);

// ─── Reusable: SectionHeading ─────────────────────────────────────────────────

const SectionHeading: React.FC<{ id: string; icon: React.ElementType; title: string; subtitle?: string }> = ({
  id, icon: Icon, title, subtitle,
}) => (
  <div id={id} className="scroll-mt-20 flex items-start gap-3 mb-8 pb-5 border-b border-slate-100">
    <div className="mt-0.5 p-2 rounded-xl bg-italian-green/10">
      <Icon className="w-6 h-6 text-italian-green" />
    </div>
    <div>
      <h2 className="text-2xl md:text-3xl font-serif font-bold text-slate-800">{title}</h2>
      {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

// ─── Reusable: SpeakBtn ───────────────────────────────────────────────────────

const SpeakBtn: React.FC<{
  italianText: string;
  id: string;
  speak: (t: string, id: string) => void;
  stop: () => void;
  speakId: string | null;
  label?: string;
  className?: string;
}> = ({ italianText, id, speak, stop, speakId, label, className = '' }) => {
  const { globalLang } = useLang();
  const active = speakId === id;
  const stopLabel = globalLang === 'it' ? 'Ferma' : 'Zatrzymaj';
  const listenLabel = globalLang === 'it' ? 'Ascolta 🇮🇹' : 'Odsłuchaj 🇮🇹';
  return (
    <button
      onClick={() => active ? stop() : speak(italianText, id)}
      title={active ? stopLabel : (globalLang === 'it' ? 'Ascolta in italiano 🇮🇹' : 'Odsłuchaj po włosku 🇮🇹')}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold transition-colors
        ${active ? 'text-italian-red hover:text-red-700' : 'text-italian-green hover:text-emerald-700'}
        ${className}`}
    >
      {active
        ? <StopCircleIcon className="w-3.5 h-3.5 animate-pulse" />
        : <SpeakerWaveIcon className="w-3.5 h-3.5" />
      }
      {label !== undefined ? label : (active ? stopLabel : listenLabel)}
    </button>
  );
};

// ─── Expandable Vocab Card ────────────────────────────────────────────────────

const VocabCard: React.FC<{
  item: VocabularyItem;
  speak: (t: string, id: string) => void;
  stop: () => void;
  speakId: string | null;
  cardId: string;
}> = ({ item, speak, stop, speakId, cardId }) => {
  const [open, setOpen] = useState(false);
  const { globalLang: l } = useLang();

  const posLabel = POS_LABEL[item.part_of_speech]?.[l] ?? item.part_of_speech;
  const genderLabel = item.gender ? (GENDER_LABEL[item.gender]?.[l] ?? item.gender) : null;

  const L = {
    etymology:   l === 'it' ? 'Etimologia'          : 'Etymologia',
    synonyms:    l === 'it' ? 'Sinonimi'            : 'Synonimy',
    antonyms:    l === 'it' ? 'Contrari'            : 'Antonimy',
    wordFamily:  l === 'it' ? 'Famiglia di parole'  : 'Rodzina wyrazów',
    listenSent:  l === 'it' ? 'Ascolta la frase'    : 'Odsłuchaj zdanie',
    pluralLbl:   l === 'it' ? 'pl.'                 : 'l.mn.:',
  };

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 hover:border-italian-green/40 hover:shadow-lg transition-all duration-200 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="text-xl font-bold font-serif text-slate-900 group-hover:text-italian-green transition-colors">
                {item.word}
              </span>
              {item.gender && (
                <Badge className={GENDER_STYLE[item.gender]}>{genderLabel}</Badge>
              )}
              {item.register && (
                <Badge className={REGISTER_STYLE[item.register]}>
                  {REG_LABEL[item.register]?.[l] ?? item.register}
                </Badge>
              )}
              <Badge className="bg-slate-50 text-slate-400 border-slate-100">{posLabel}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {item.ipa && (
                <span className="text-xs font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{item.ipa}</span>
              )}
              <span className="text-sm italic text-slate-500">{item.translation}</span>
            </div>
            {item.plural && (
              <div className="mt-1 text-xs text-slate-400">
                {L.pluralLbl} <span className="font-medium text-slate-600">{item.plural}</span>
              </div>
            )}
            {item.audio_hint && (
              <div className="mt-0.5 text-xs text-indigo-500 font-mono">▸ {item.audio_hint}</div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <SpeakBtn
              italianText={item.word}
              id={cardId + '-word'}
              speak={speak} stop={stop} speakId={speakId}
              label=""
              className="p-2 rounded-full bg-slate-50 hover:bg-italian-green hover:text-white text-slate-400"
            />
            <button
              onClick={() => setOpen(o => !o)}
              className="p-2 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-200 transition-colors"
            >
              {open ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed"><B content={item.definition} /></p>

        <div className="mt-3 bg-slate-50 rounded-xl p-3 border-l-2 border-italian-green/40">
          <p className="text-sm italic text-slate-700">"<B content={item.context_sentence} />"</p>
          <SpeakBtn
            italianText={item.context_sentence.it}
            id={cardId + '-sentence'}
            speak={speak} stop={stop} speakId={speakId}
            label={L.listenSent}
            className="mt-1.5"
          />
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-5 space-y-4 animate-fade-in">
          {item.etymology && (
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest block mb-1">{L.etymology}</span>
              <p className="text-sm text-slate-600 italic"><B content={item.etymology} /></p>
            </div>
          )}
          {(item.synonyms?.length || item.antonyms?.length) ? (
            <div className="grid grid-cols-2 gap-4">
              {item.synonyms?.length ? (
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest block mb-1.5">{L.synonyms}</span>
                  <div className="flex flex-wrap gap-1">
                    {item.synonyms.map((s, i) => (
                      <button key={i} onClick={() => speak(s, cardId + '-syn-' + i)}
                        className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {item.antonyms?.length ? (
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest block mb-1.5">{L.antonyms}</span>
                  <div className="flex flex-wrap gap-1">
                    {item.antonyms.map((a, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">{a}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          {item.word_family?.length ? (
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest block mb-2">{L.wordFamily}</span>
              <div className="flex flex-wrap gap-2">
                {item.word_family.map((wf, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-white rounded-lg px-2.5 py-1.5 border border-slate-200 text-xs">
                    <span className="font-bold text-slate-800">{wf.form}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500 italic">{wf.type}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600">{wf.translation}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const LessonView: React.FC<LessonViewProps> = ({ lesson, onBack, onChangeKey }) => {
  const { globalLang: l, toggleGlobal } = useLang();
  const { rate, setRate, speak, stop, speakId, hasItalianVoice } = useTTS();
  const activeSection = useScrollSpy();

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  // ── Bilingual UI labels ──────────────────────────────────────────────────────
  const L = {
    library:      l === 'it' ? 'Biblioteca'             : 'Biblioteka',
    toc:          l === 'it' ? 'Sommario'               : 'Spis treści',
    trivia:       l === 'it' ? 'Curiosità'              : 'Ciekawostka',
    readMins:     (n: number) => l === 'it' ? `${n} min lettura` : `${n} min czytania`,
    keyTakeaways: l === 'it' ? 'Cosa imparerai'         : 'Co wyniesiesz z tej lekcji',
    examples:     l === 'it' ? 'Esempi'                 : 'Przykłady',
    exceptions:   l === 'it' ? 'Eccezioni'              : 'Wyjątki',
    mnemonic:     l === 'it' ? 'Aiuto mnemonico'        : 'Wskazówka mnemotechniczna',
    wrong:        l === 'it' ? 'Sbagliato'              : 'Źle',
    correct:      l === 'it' ? 'Corretto'               : 'Dobrze',
    listenIntro:  l === 'it' ? 'Ascolta introduzione'   : 'Odsłuchaj wstęp po włosku',
    listenStory:  l === 'it' ? 'Ascolta il racconto'    : 'Odsłuchaj opowiadanie po włosku',
    listenCulture:l === 'it' ? 'Ascolta testo culturale': 'Odsłuchaj tekst kulturowy',
    playDialogue: l === 'it' ? 'Riproduci dialogo'      : 'Odtwórz cały dialog',
    // Proverb / idiom
    translation:  l === 'it' ? 'Traduzione'             : 'Tłumaczenie',
    meaning:      l === 'it' ? 'Significato'            : 'Znaczenie',
    origin:       l === 'it' ? 'Origine'                : 'Pochodzenie',
    literally:    l === 'it' ? 'Letteralmente'          : 'Dosłownie',
    exampleLbl:   l === 'it' ? 'Esempio'                : 'Przykład',
    // Culture
    didYouKnow:   l === 'it' ? 'Lo sapevi che…'         : 'Czy wiesz, że…',
    regional:     l === 'it' ? 'Varianti regionali'     : 'Różnice regionalne',
    // Difficulty
    apiKey:       l === 'it' ? 'Cambia chiave API'      : 'Zmień klucz API',
    voiceFound:   l === 'it' ? 'Voce italiana trovata'  : 'Głos włoski znaleziony',
    voiceMissing: l === 'it' ? 'Nessuna voce italiana'  : 'Brak głosu włoskiego',
    diffLabels: {
      A1: { pl: 'Początkujący',        it: 'Principiante' },
      A2: { pl: 'Elementarny',         it: 'Elementare' },
      B1: { pl: 'Średniozaaw.',        it: 'Intermedio' },
      B2: { pl: 'Wyższy średni',       it: 'Interm. sup.' },
      C1: { pl: 'Zaawansowany',        it: 'Avanzato' },
    },
  };

  // ── Nav items (bilingual) ────────────────────────────────────────────────────
  const NAV_ITEMS = [
    { id: 'intro',        pl: 'Wstęp',       it: 'Intro',        icon: SparklesIcon },
    { id: 'vocab',        pl: 'Słownictwo',  it: 'Lessico',      icon: BookOpenIcon },
    { id: 'pronunciation',pl: 'Wymowa',      it: 'Pronuncia',    icon: MicrophoneIcon },
    { id: 'grammar',      pl: 'Gramatyka',   it: 'Grammatica',   icon: AcademicCapIcon },
    { id: 'phrases',      pl: 'Zwroty',      it: 'Frasi',        icon: ChatBubbleBottomCenterTextIcon },
    { id: 'mistakes',     pl: 'Błędy',       it: 'Errori',       icon: ExclamationTriangleIcon },
    { id: 'story',        pl: 'Opowiadanie', it: 'Racconto',     icon: BookmarkIcon },
    { id: 'dialogue',     pl: 'Dialog',      it: 'Dialogo',      icon: LanguageIcon },
    { id: 'culture',      pl: 'Kultura',     it: 'Cultura',      icon: GlobeEuropeAfricaIcon },
    { id: 'gems',         pl: 'Perełki',     it: 'Gemme',        icon: StarIcon },
  ];

  // ── Dialogue speaker sides ───────────────────────────────────────────────────
  const speakerSides = useMemo<Record<string, 'left' | 'right'>>(() => {
    const map: Record<string, 'left' | 'right'> = {};
    let idx = 0;
    for (const line of lesson.dialogue?.lines ?? []) {
      if (!(line.speaker in map)) { map[line.speaker] = idx % 2 === 0 ? 'left' : 'right'; idx++; }
    }
    return map;
  }, [lesson.dialogue?.lines]);

  const SIDE_STYLES = {
    left: {
      bubble: 'bg-white border border-slate-200 rounded-2xl rounded-tl-sm shadow-sm',
      avatar: 'bg-gradient-to-br from-slate-400 to-slate-600 text-white',
      align: '',
      nameAlign: '',
    },
    right: {
      bubble: 'bg-gradient-to-br from-italian-green/15 to-emerald-50 border border-italian-green/25 rounded-2xl rounded-tr-sm shadow-sm',
      avatar: 'bg-gradient-to-br from-italian-green to-emerald-700 text-white',
      align: 'flex-row-reverse',
      nameAlign: 'text-right',
    },
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* ── Sticky top bar (JEDYNY pasek nawigacji) ────────────────────────── */}
      <div className="sticky top-0 z-50 bg-white/97 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 h-14 flex items-center gap-3">

          {/* Powrót */}
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-slate-500 hover:text-italian-green transition-colors font-medium text-sm shrink-0"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{L.library}</span>
          </button>

          {/* Tytuł */}
          <div className="flex-1 min-w-0 hidden md:block text-center">
            <p className="text-sm font-serif font-semibold text-slate-700 truncate">
              {l === 'it' ? lesson.topic.it : lesson.topic.pl}
            </p>
          </div>

          {/* Prawa strona: TTS + język + klucz */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {/* TTS: prędkość + wskaźnik głosu */}
            <button
              onClick={() => setRate(r => r === 0.9 ? 0.6 : 0.9)}
              title={hasItalianVoice ? L.voiceFound : L.voiceMissing}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors border
                ${hasItalianVoice
                  ? 'bg-italian-green/10 text-italian-green border-italian-green/20 hover:bg-italian-green/20'
                  : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'}`}
            >
              {hasItalianVoice ? '🇮🇹' : '⚠️'}
              <SpeakerWaveIcon className="w-3 h-3" />
              {rate === 0.9 ? '1×' : '0.6×'}
            </button>

            {/* Przełącznik języka */}
            <button
              onClick={toggleGlobal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900 text-white hover:bg-italian-green transition-all shadow-sm active:scale-95 text-xs font-bold tracking-wide"
            >
              <LanguageIcon className="w-4 h-4" />
              {l === 'it' ? '🇮🇹 IT' : '🇵🇱 PL'}
            </button>

            {/* Klucz API */}
            {onChangeKey && (
              <button
                onClick={onChangeKey}
                title={L.apiKey}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <KeyIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Główny układ ───────────────────────────────────────────────────── */}
      <div className="max-w-screen-2xl mx-auto pb-24 animate-fade-in-up">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 lg:px-8 pt-8">

          {/* ── Boczny pasek nawigacji ──────────────────────────────────────── */}
          <aside className="hidden lg:block lg:col-span-2">
            <div className="sticky top-20 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 pl-2">{L.toc}</p>
              {NAV_ITEMS.map(({ id, pl, it, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    activeSection === id
                      ? 'bg-italian-green/10 text-italian-green font-semibold'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {l === 'it' ? it : pl}
                </button>
              ))}

              {/* Info karta */}
              <div className="mt-6 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={DIFFICULTY_COLOR[lesson.difficulty_level]}>
                    {lesson.difficulty_level}
                  </Badge>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" />
                    {L.readMins(lesson.estimated_reading_minutes ?? 0)}
                  </span>
                </div>
                {lesson.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {lesson.tags.map((tag, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">#{tag}</span>
                    ))}
                  </div>
                )}
                {lesson.trivia && (
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-1">{L.trivia}</p>
                    <p className="text-xs text-slate-600 italic leading-relaxed"><B content={lesson.trivia} /></p>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* ── Treść główna ─────────────────────────────────────────────────── */}
          <main className="col-span-1 lg:col-span-10 space-y-20">

            {/* ════ WSTĘP ════════════════════════════════════════════════════ */}
            <section id="intro">
              <div className="text-center space-y-6 py-6">
                <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-white shadow-xl text-7xl border-4 border-slate-50 relative">
                  {lesson.emoji}
                  <div className={`absolute -bottom-2 -right-2 text-[10px] font-bold px-2.5 py-1 rounded-full shadow border ${DIFFICULTY_COLOR[lesson.difficulty_level]}`}>
                    {lesson.difficulty_level}
                  </div>
                </div>

                <div className="space-y-2">
                  <h1 className="text-4xl md:text-6xl font-serif font-bold text-slate-900 tracking-tight leading-tight">
                    <B content={lesson.topic} />
                  </h1>
                  {lesson.subtitle && (
                    <p className="text-lg md:text-xl text-slate-500 font-light italic max-w-xl mx-auto">
                      <B content={lesson.subtitle} />
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                  {lesson.tags?.map((tag, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200">#{tag}</span>
                  ))}
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" />
                    {L.readMins(lesson.estimated_reading_minutes ?? 0)}
                  </span>
                  <span className="text-slate-400">
                    {new Date(lesson.timestamp).toLocaleDateString(l === 'it' ? 'it-IT' : 'pl-PL')}
                  </span>
                </div>

                <div className="max-w-2xl mx-auto text-left space-y-3">
                  <p className="text-lg text-slate-700 leading-relaxed font-light">
                    <B content={lesson.introduction} />
                  </p>
                  <SpeakBtn
                    italianText={lesson.introduction.it}
                    id="intro-text"
                    speak={speak} stop={stop} speakId={speakId}
                    label={L.listenIntro}
                  />
                </div>

                {lesson.key_takeaways?.length > 0 && (
                  <div className="max-w-2xl mx-auto bg-gradient-to-br from-italian-green/5 to-emerald-50 rounded-2xl p-6 border border-italian-green/10 text-left">
                    <p className="text-xs font-bold uppercase tracking-widest text-italian-green mb-4">{L.keyTakeaways}</p>
                    <ul className="space-y-3">
                      {lesson.key_takeaways.map((kt, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <CheckCircleIcon className="w-5 h-5 text-italian-green shrink-0 mt-0.5" />
                          <span className="text-sm text-slate-700 leading-relaxed"><B content={kt} /></span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>

            {/* ════ SŁOWNICTWO ══════════════════════════════════════════════ */}
            <section>
              <SectionHeading
                id="vocab"
                icon={BookOpenIcon}
                title={l === 'it' ? 'Lessico & Dettagli' : 'Słownictwo i szczegóły'}
                subtitle={l === 'it' ? 'Clicca ▼ per etimologia, sinonimi e famiglia di parole' : 'Kliknij ▼ by rozwinąć etymologię, synonimy i rodzinę wyrazów'}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {lesson.vocabulary.map((item, i) => (
                  <VocabCard
                    key={i} item={item} cardId={`vocab-${i}`}
                    speak={speak} stop={stop} speakId={speakId}
                  />
                ))}
              </div>
            </section>

            {/* ════ WYMOWA ══════════════════════════════════════════════════ */}
            {lesson.pronunciation_tips?.length > 0 && (
              <section>
                <SectionHeading
                  id="pronunciation"
                  icon={MicrophoneIcon}
                  title={l === 'it' ? 'Guida alla Pronuncia' : 'Przewodnik wymowy'}
                  subtitle={l === 'it' ? 'Suoni difficili — clicca la parola per ascoltare' : 'Trudne dźwięki dla Polaków — kliknij słowo by usłyszeć'}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {lesson.pronunciation_tips.map((tip, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-italian-green/30 hover:shadow-md transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-3xl font-mono font-bold text-slate-900 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                          {tip.sound}
                        </div>
                        <SpeakBtn
                          italianText={tip.example_word}
                          id={`pron-${i}`}
                          speak={speak} stop={stop} speakId={speakId}
                          label=""
                          className="p-2.5 rounded-full bg-italian-green/10 hover:bg-italian-green hover:text-white"
                        />
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed mb-3"><B content={tip.description} /></p>
                      <div className="bg-slate-50 rounded-xl p-3 space-y-1">
                        <p className="text-sm font-bold text-italian-green">{tip.example_word}</p>
                        {tip.example_sentence && <p className="text-xs italic text-slate-600">{tip.example_sentence}</p>}
                      </div>
                      {tip.common_mistake && (
                        <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-xl p-3 border border-amber-100">
                          <ExclamationTriangleIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <B content={tip.common_mistake} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ════ GRAMATYKA ════════════════════════════════════════════════ */}
            <section>
              <SectionHeading
                id="grammar"
                icon={AcademicCapIcon}
                title={l === 'it' ? 'Focus Grammaticale' : 'Focus gramatyczny'}
              />
              <div className="space-y-6">
                {lesson.grammar.map((g, gi) => (
                  <div key={gi} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-7 py-5 border-b border-slate-200">
                      <h3 className="text-lg font-bold text-slate-800"><B content={g.title} /></h3>
                      {g.pattern && (
                        <code className="mt-2 inline-block text-xs font-mono bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-italian-green">
                          {g.pattern}
                        </code>
                      )}
                    </div>
                    <div className="p-7 space-y-5">
                      <p className="text-sm text-slate-600 leading-relaxed"><B content={g.explanation} /></p>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">{L.examples}</p>
                        {g.examples.map((ex, j) => (
                          <div key={j} className="flex gap-3 items-start bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <SpeakBtn
                              italianText={ex.it}
                              id={`gram-${gi}-${j}`}
                              speak={speak} stop={stop} speakId={speakId}
                              label=""
                              className="mt-0.5 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800"><B content={ex} /></p>
                              {ex.breakdown && <p className="text-[10px] font-mono text-slate-400 mt-0.5">{ex.breakdown}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                      {g.exceptions?.length ? (
                        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                          <p className="text-[10px] font-bold uppercase text-amber-700 tracking-widest mb-2">{L.exceptions}</p>
                          {g.exceptions.map((exc, j) => (
                            <p key={j} className="text-sm text-amber-800"><B content={exc} /></p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ════ ZWROTY ══════════════════════════════════════════════════ */}
            <section>
              <SectionHeading
                id="phrases"
                icon={ChatBubbleBottomCenterTextIcon}
                title={l === 'it' ? 'Frasi Utili' : 'Przydatne zwroty'}
              />
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                <div className="divide-y divide-white/5">
                  {lesson.useful_phrases.map((ph, i) => (
                    <div key={i} className="group px-6 py-5 hover:bg-white/5 transition-colors">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-lg font-serif font-semibold text-white group-hover:text-italian-green transition-colors">
                          {ph.expression}
                        </span>
                        <SpeakBtn
                          italianText={ph.expression}
                          id={`phrase-${i}`}
                          speak={speak} stop={stop} speakId={speakId}
                          label=""
                          className="text-slate-500"
                        />
                        {ph.register && (
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${REGISTER_STYLE[ph.register]}`}>
                            {REG_LABEL[ph.register]?.[l] ?? ph.register}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-300 text-sm mb-1">{ph.translation}</p>
                      <p className="text-slate-500 text-xs italic"><B content={ph.context} /></p>
                      {ph.example_usage && (
                        <div className="mt-2 pl-4 border-l border-white/10 text-xs text-slate-400 italic">
                          <B content={ph.example_usage} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ════ BŁĘDY ════════════════════════════════════════════════════ */}
            <section>
              <SectionHeading
                id="mistakes"
                icon={ExclamationTriangleIcon}
                title={l === 'it' ? 'Attenzione agli Errori' : 'Uwaga na błędy'}
                subtitle={l === 'it' ? 'Trappole per chi parla polacco' : 'Pułapki dla Polaków uczących się włoskiego'}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lesson.common_mistakes.map((m, i) => {
                  const cat = m.category;
                  return (
                    <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                      <div className={`px-4 py-2 ${MISTAKE_BG[cat]}`}>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${MISTAKE_COLOR[cat]}`}>
                          {MISTAKE_LABEL[cat]?.[l] ?? cat}
                        </span>
                      </div>
                      <div className="p-5 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-red-50 rounded-lg p-3 border border-red-100">
                            <p className="text-[10px] font-bold text-red-500 uppercase mb-1">{L.wrong}</p>
                            <p className="font-mono text-sm text-slate-500 line-through">{m.wrong}</p>
                          </div>
                          <div className="text-slate-300 font-bold">→</div>
                          <div className="flex-1 bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                            <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">{L.correct}</p>
                            <p className="font-mono text-sm font-bold text-slate-800">{m.correct}</p>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed"><B content={m.explanation} /></p>
                        {m.mnemonic && (
                          <div className="flex items-start gap-2 text-xs bg-indigo-50 text-indigo-700 rounded-xl p-3 border border-indigo-100">
                            <LightBulbIcon className="w-3.5 h-3.5 shrink-0 mt-0.5 text-indigo-500" />
                            <B content={m.mnemonic} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ════ OPOWIADANIE ══════════════════════════════════════════════ */}
            {lesson.mini_story && (
              <section>
                <SectionHeading
                  id="story"
                  icon={BookmarkIcon}
                  title={l === 'it' ? 'Breve Racconto' : 'Krótkie opowiadanie'}
                  subtitle={l === 'it' ? 'Lessico nel contesto narrativo' : 'Słownictwo w kontekście narracyjnym'}
                />
                <div className="relative bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="absolute top-6 left-6 text-9xl text-slate-100 font-serif leading-none select-none pointer-events-none">"</div>
                  <div className="relative p-8 md:p-12">
                    <h3 className="text-xl font-serif font-bold text-slate-800 mb-6">
                      <B content={lesson.mini_story.title} />
                    </h3>
                    <div className="prose prose-lg prose-slate max-w-none text-slate-700 leading-relaxed text-base md:text-lg font-light">
                      <B content={lesson.mini_story.text} as="p" />
                    </div>
                    <div className="mt-4">
                      <SpeakBtn
                        italianText={lesson.mini_story.text.it}
                        id="story-text"
                        speak={speak} stop={stop} speakId={speakId}
                        label={L.listenStory}
                      />
                    </div>
                    {lesson.mini_story.moral && (
                      <div className="mt-8 pt-6 border-t border-slate-100 flex items-start gap-3">
                        <HeartIcon className="w-4 h-4 text-italian-red shrink-0 mt-0.5" />
                        <p className="text-sm italic text-slate-500"><B content={lesson.mini_story.moral} /></p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* ════ DIALOG ══════════════════════════════════════════════════ */}
            <section>
              <SectionHeading
                id="dialogue"
                icon={LanguageIcon}
                title={l === 'it' ? 'Dialogo in Contesto' : 'Dialog w kontekście'}
              />

              {/* Nagłówek dialogu */}
              <div className="bg-white rounded-t-3xl border border-slate-200 border-b-0 px-6 py-4 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-700 font-serif text-lg"><B content={lesson.dialogue.title} /></p>
                    {lesson.dialogue.setting && (
                      <p className="text-sm text-slate-400 italic flex items-center gap-1.5 mt-0.5">
                        <GlobeEuropeAfricaIcon className="w-3.5 h-3.5 shrink-0" />
                        <B content={lesson.dialogue.setting} />
                      </p>
                    )}
                  </div>
                  <SpeakBtn
                    italianText={lesson.dialogue.lines.map(lin => lin.text.it).join('. ')}
                    id="dialogue-full"
                    speak={speak} stop={stop} speakId={speakId}
                    label={L.playDialogue}
                    className="shrink-0 mt-0.5"
                  />
                </div>
                {lesson.dialogue.vocabulary_highlight?.length ? (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {lesson.dialogue.vocabulary_highlight.map((w, i) => (
                      <button
                        key={i}
                        onClick={() => speak(w, `dv-${i}`)}
                        className="text-[10px] px-2 py-0.5 rounded-full border border-italian-green/30 text-italian-green bg-italian-green/5 font-medium hover:bg-italian-green hover:text-white transition-colors"
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Dymki czatu */}
              <div
                className="rounded-b-3xl border border-slate-200 border-t-0 p-5 md:p-8 space-y-4"
                style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}
              >
                {lesson.dialogue.lines.map((line, i) => {
                  const side = speakerSides[line.speaker] ?? 'left';
                  const styles = SIDE_STYLES[side];
                  const prevSpeaker = i > 0 ? lesson.dialogue.lines[i - 1].speaker : null;
                  const isNewSpeaker = line.speaker !== prevSpeaker;

                  return (
                    <div key={i}>
                      {/* Separator sceny co 6 kwestii */}
                      {i > 0 && i % 6 === 0 && (
                        <div className="flex items-center gap-3 py-2 my-1">
                          <div className="flex-1 h-px bg-slate-200" />
                          <span className="text-[9px] text-slate-400 font-medium uppercase tracking-widest">…</span>
                          <div className="flex-1 h-px bg-slate-200" />
                        </div>
                      )}

                      <div className={`flex items-end gap-3 ${styles.align}`}>
                        {/* Avatar */}
                        <div className="w-9 shrink-0 flex flex-col items-center">
                          {isNewSpeaker ? (
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-[11px] shadow-sm ${styles.avatar}`}>
                              {line.speaker.substring(0, 2).toUpperCase()}
                            </div>
                          ) : (
                            <div className="w-9 h-9" />
                          )}
                        </div>

                        {/* Bańka + dodatki */}
                        <div className={`max-w-xs md:max-w-md lg:max-w-lg flex flex-col gap-1 ${side === 'right' ? 'items-end' : 'items-start'}`}>
                          {/* Imię mówcy */}
                          {isNewSpeaker && (
                            <span className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 ${styles.nameAlign}`}>
                              {line.speaker}
                              {line.tone && <span className="ml-1">{TONE_EMOJI[line.tone]}</span>}
                            </span>
                          )}

                          {/* Adnotacja sceniczna */}
                          {line.annotation && (
                            <p className={`text-[10px] italic text-slate-400 px-1 ${styles.nameAlign}`}>
                              (<B content={line.annotation} />)
                            </p>
                          )}

                          {/* Główna bańka */}
                          <div className={`group relative ${styles.bubble} px-4 py-3 min-w-[80px]`}>
                            {!isNewSpeaker && line.tone && (
                              <span className="text-sm mr-1">{TONE_EMOJI[line.tone]}</span>
                            )}
                            <p
                              className="text-[15px] leading-relaxed cursor-pointer hover:opacity-80 transition-opacity select-text"
                              onClick={() => speak(line.text.it, `line-${i}`)}
                              title={l === 'it' ? 'Clicca per ascoltare' : 'Kliknij by odsłuchać po włosku'}
                            >
                              <B content={line.text} />
                            </p>
                            <div className={`mt-1.5 flex ${side === 'right' ? 'justify-end' : 'justify-start'}`}>
                              <SpeakBtn
                                italianText={line.text.it}
                                id={`line-${i}`}
                                speak={speak} stop={stop} speakId={speakId}
                                label=""
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              />
                            </div>
                          </div>

                          {/* Notatka gramatyczna */}
                          {line.grammar_note && (
                            <div className="flex items-start gap-1.5 text-xs text-indigo-600 bg-indigo-50 rounded-xl px-3 py-2 border border-indigo-100 max-w-full">
                              <AcademicCapIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <B content={line.grammar_note} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ════ KULTURA ═════════════════════════════════════════════════ */}
            <section>
              <SectionHeading
                id="culture"
                icon={GlobeEuropeAfricaIcon}
                title={l === 'it' ? 'Cultura & Società' : 'Kultura i społeczeństwo'}
              />
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-br from-italian-green/10 via-emerald-50 to-white px-8 py-6 border-b border-slate-100">
                    <h3 className="text-xl font-serif font-bold text-slate-800"><B content={lesson.culture.title} /></h3>
                  </div>
                  <div className="p-8">
                    <div className="prose prose-slate text-slate-700 leading-relaxed max-w-none text-base">
                      <B content={lesson.culture.content} as="p" />
                    </div>
                    <div className="mt-3">
                      <SpeakBtn
                        italianText={lesson.culture.content.it}
                        id="culture-content"
                        speak={speak} stop={stop} speakId={speakId}
                        label={L.listenCulture}
                      />
                    </div>
                    {lesson.culture.did_you_know && (
                      <div className="mt-6 flex items-start gap-3 bg-amber-50 rounded-2xl p-5 border border-amber-100">
                        <LightBulbIcon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-bold uppercase text-amber-600 tracking-widest mb-1">{L.didYouKnow}</p>
                          <p className="text-sm text-amber-800 leading-relaxed"><B content={lesson.culture.did_you_know} /></p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {lesson.cultural_notes?.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {lesson.cultural_notes.map((note, i) => (
                      <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-italian-green/30 hover:shadow-md transition-all">
                        <div className="flex items-start gap-3 mb-3">
                          <span className="text-2xl">{note.icon}</span>
                          <div>
                            <h4 className="font-bold text-sm text-slate-800"><B content={note.title} /></h4>
                            {note.region && <span className="text-[10px] text-slate-400 font-medium">📍 {note.region}</span>}
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed"><B content={note.content} /></p>
                      </div>
                    ))}
                  </div>
                )}

                {lesson.regional_notes && (
                  <div className="bg-teal-50 rounded-2xl border border-teal-100 p-5 flex gap-3">
                    <span className="text-xl shrink-0">🗺️</span>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-teal-700 tracking-widest mb-1">{L.regional}</p>
                      <p className="text-sm text-teal-800 leading-relaxed"><B content={lesson.regional_notes} /></p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* ════ PEREŁKI (PRZYSŁOWIE + IDIOM) ═══════════════════════════ */}
            <section>
              <SectionHeading
                id="gems"
                icon={StarIcon}
                title={l === 'it' ? 'Perle della Lingua' : 'Językowe perełki'}
                subtitle={l === 'it' ? 'Proverbio e modo di dire' : 'Przysłowie i idiom'}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {lesson.proverb && (
                  <div className="relative bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-white pointer-events-none" />
                    <div className="relative p-7 space-y-4">
                      <div className="flex items-center gap-2 text-amber-600">
                        <span className="text-lg">📜</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          {l === 'it' ? 'Proverbio italiano' : 'Włoskie przysłowie'}
                        </span>
                      </div>
                      <blockquote className="text-2xl font-serif font-bold italic text-slate-800 leading-snug">
                        "{lesson.proverb.text}"
                      </blockquote>
                      <SpeakBtn italianText={lesson.proverb.text} id="proverb" speak={speak} stop={stop} speakId={speakId} />
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">{L.translation}</span>
                          <p className="text-sm text-slate-700 mt-0.5"><B content={lesson.proverb.translation} /></p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">{L.meaning}</span>
                          <p className="text-sm text-slate-600 italic mt-0.5"><B content={lesson.proverb.meaning} /></p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {lesson.idiom && (
                  <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 text-white rounded-3xl shadow-2xl overflow-hidden">
                    <div className="p-7 space-y-5">
                      <div className="flex items-center gap-2 text-indigo-300">
                        <LightBulbIcon className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          {l === 'it' ? 'Modo di dire' : 'Włoski idiom'}
                        </span>
                      </div>
                      <div>
                        <div className="text-2xl md:text-3xl font-serif font-bold leading-tight">"{lesson.idiom.phrase}"</div>
                        <SpeakBtn
                          italianText={lesson.idiom.phrase}
                          id="idiom"
                          speak={speak} stop={stop} speakId={speakId}
                          className="mt-2 text-indigo-300 hover:text-white"
                        />
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10 space-y-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-indigo-300 tracking-widest">{L.meaning}</span>
                          <p className="text-sm text-white font-medium mt-0.5"><B content={lesson.idiom.meaning} /></p>
                        </div>
                        <div className="border-t border-white/10 pt-3">
                          <span className="text-[10px] font-bold uppercase text-indigo-300 tracking-widest">{L.literally}</span>
                          <p className="text-sm text-indigo-200 italic mt-0.5"><B content={lesson.idiom.literal} /></p>
                        </div>
                        {lesson.idiom.origin && (
                          <div className="border-t border-white/10 pt-3">
                            <span className="text-[10px] font-bold uppercase text-indigo-300 tracking-widest">{L.origin}</span>
                            <p className="text-sm text-indigo-200 mt-0.5"><B content={lesson.idiom.origin} /></p>
                          </div>
                        )}
                        {lesson.idiom.example_sentence && (
                          <div className="border-t border-white/10 pt-3">
                            <span className="text-[10px] font-bold uppercase text-indigo-300 tracking-widest">{L.exampleLbl}</span>
                            <p className="text-sm text-indigo-100 italic mt-0.5"><B content={lesson.idiom.example_sentence} /></p>
                            <SpeakBtn
                              italianText={lesson.idiom.example_sentence.it}
                              id="idiom-example"
                              speak={speak} stop={stop} speakId={speakId}
                              className="mt-1 text-indigo-300 hover:text-white"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

          </main>
        </div>
      </div>
    </div>
  );
};
