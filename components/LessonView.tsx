import React, { useState, useEffect, useCallback, ElementType } from 'react';
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
  PlayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  SignalIcon,
  TagIcon,
  MicrophoneIcon,
  BookmarkIcon,
  StarIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

import { Lesson, VocabularyItem, MistakeCategory, Register, DialogueTone, Lang } from '../types';
import { useLang } from '../context/LangContext';
import { B } from './BilingualBlock';

// ─── Props ────────────────────────────────────────────────────────────────────

interface LessonViewProps {
  lesson: Lesson;
  onBack: () => void;
}

// ─── TTS Hook ─────────────────────────────────────────────────────────────────

const useTTS = () => {
  const [rate, setRate] = useState(0.9);
  const [speaking, setSpeaking] = useState<string | null>(null);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'it-IT';
    u.rate = rate;
    u.onstart = () => setSpeaking(text);
    u.onend = () => setSpeaking(null);
    u.onerror = () => setSpeaking(null);
    window.speechSynthesis.speak(u);
  }, [rate]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(null);
  }, []);

  return { rate, setRate, speak, stop, speaking };
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

// ─── Helpers: Badges ─────────────────────────────────────────────────────────

const DIFFICULTY_COLOR: Record<string, string> = {
  A1: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  A2: 'bg-teal-100 text-teal-700 border-teal-200',
  B1: 'bg-blue-100 text-blue-700 border-blue-200',
  B2: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  C1: 'bg-violet-100 text-violet-700 border-violet-200',
};

const GENDER_STYLE: Record<string, string> = {
  m: 'bg-sky-50 text-sky-600 border-sky-200',
  f: 'bg-pink-50 text-pink-600 border-pink-200',
  pl: 'bg-purple-50 text-purple-600 border-purple-200',
  invariant: 'bg-slate-50 text-slate-500 border-slate-200',
};

const GENDER_LABEL: Record<string, string> = { m: 'm.', f: 'f.', pl: 'l.mn.', invariant: 'inv.' };

const REGISTER_STYLE: Record<Register, string> = {
  formal:     'bg-indigo-50 text-indigo-600 border-indigo-100',
  informal:   'bg-amber-50 text-amber-600 border-amber-100',
  colloquial: 'bg-orange-50 text-orange-600 border-orange-100',
  literary:   'bg-rose-50 text-rose-600 border-rose-100',
  regional:   'bg-teal-50 text-teal-600 border-teal-100',
  vulgar:     'bg-red-50 text-red-600 border-red-100',
};

const MISTAKE_STYLE: Record<MistakeCategory, { bg: string; label: string; color: string }> = {
  false_friend: { bg: 'bg-red-100',    label: 'Fałszywy przyjaciel', color: 'text-red-700' },
  grammar:      { bg: 'bg-amber-100',  label: 'Gramatyka',            color: 'text-amber-700' },
  pronunciation:{ bg: 'bg-blue-100',   label: 'Wymowa',               color: 'text-blue-700' },
  usage:        { bg: 'bg-violet-100', label: 'Użycie',               color: 'text-violet-700' },
  spelling:     { bg: 'bg-slate-100',  label: 'Pisownia',             color: 'text-slate-600' },
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

// ─── Sub-components ───────────────────────────────────────────────────────────

const Badge: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${className}`}>
    {children}
  </span>
);

const SectionHeading: React.FC<{ id: string; icon: React.ElementType; title: string; subtitle?: string }> = ({
  id, icon: Icon, title, subtitle
}) => (
  <div id={id} className="scroll-mt-28 flex items-start gap-3 mb-8 pb-5 border-b border-slate-100">
    <div className="mt-0.5 p-2 rounded-xl bg-italian-green/10">
      <Icon className="w-6 h-6 text-italian-green" />
    </div>
    <div>
      <h2 className="text-2xl md:text-3xl font-serif font-bold text-slate-800">{title}</h2>
      {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

// Expandable vocab card
const VocabCard: React.FC<{ item: VocabularyItem; speak: (t: string) => void; speaking: string | null }> = ({
  item, speak, speaking
}) => {
  const [open, setOpen] = useState(false);
  const isSpeaking = speaking === item.word;

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 hover:border-italian-green/40 hover:shadow-lg transition-all duration-200 overflow-hidden">
      {/* Card Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            {/* Word + badges row */}
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="text-xl font-bold font-serif text-slate-900 group-hover:text-italian-green transition-colors">
                {item.word}
              </span>
              {item.gender && (
                <Badge className={GENDER_STYLE[item.gender]}>{GENDER_LABEL[item.gender]}</Badge>
              )}
              {item.register && (
                <Badge className={REGISTER_STYLE[item.register]}>{item.register}</Badge>
              )}
              <Badge className="bg-slate-50 text-slate-400 border-slate-100">{item.part_of_speech}</Badge>
            </div>
            {/* IPA + translation */}
            <div className="flex flex-wrap items-center gap-2">
              {item.ipa && (
                <span className="text-xs font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                  {item.ipa}
                </span>
              )}
              <span className="text-sm italic text-slate-500">{item.translation}</span>
            </div>
            {/* Plural */}
            {item.plural && (
              <div className="mt-1 text-xs text-slate-400">
                l.mn: <span className="font-medium text-slate-600">{item.plural}</span>
              </div>
            )}
            {/* Audio hint */}
            {item.audio_hint && (
              <div className="mt-0.5 text-xs text-indigo-500 font-mono">▸ {item.audio_hint}</div>
            )}
          </div>
          {/* TTS + expand */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => isSpeaking ? window.speechSynthesis.cancel() : speak(item.word)}
              className={`p-2 rounded-full transition-colors ${isSpeaking ? 'bg-italian-green text-white' : 'bg-slate-50 text-slate-400 hover:bg-italian-green hover:text-white'}`}
              title="Wymów"
            >
              <SpeakerWaveIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setOpen(o => !o)}
              className="p-2 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-200 transition-colors"
              title={open ? 'Zwiń' : 'Rozwiń'}
            >
              {open ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Definition */}
        <p className="text-sm text-slate-600 leading-relaxed">
          <B content={item.definition} />
        </p>

        {/* Context sentence */}
        <div className="mt-3 bg-slate-50 rounded-xl p-3 border-l-2 border-italian-green/40">
          <p className="text-sm italic text-slate-700">
            "<B content={item.context_sentence} />"
          </p>
          <button
            onClick={() => speak(item.context_sentence.it)}
            className="mt-1.5 text-xs text-italian-green font-medium flex items-center gap-1 opacity-70 hover:opacity-100"
          >
            <PlayIcon className="w-3 h-3" /> Odsłuchaj zdanie
          </button>
        </div>
      </div>

      {/* Expandable details */}
      {open && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-5 space-y-4 animate-fade-in">
          {item.etymology && (
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest block mb-1">Etymologia</span>
              <p className="text-sm text-slate-600 italic"><B content={item.etymology} /></p>
            </div>
          )}
          {(item.synonyms?.length || item.antonyms?.length) ? (
            <div className="grid grid-cols-2 gap-4">
              {item.synonyms?.length ? (
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest block mb-1.5">Synonimy</span>
                  <div className="flex flex-wrap gap-1">
                    {item.synonyms.map((s, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 cursor-pointer hover:bg-emerald-100" onClick={() => speak(s)}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {item.antonyms?.length ? (
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest block mb-1.5">Antonimy</span>
                  <div className="flex flex-wrap gap-1">
                    {item.antonyms.map((a, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          {item.word_family?.length ? (
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest block mb-2">Rodzina wyrazów</span>
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

export const LessonView: React.FC<LessonViewProps> = ({ lesson, onBack }) => {
  const { globalLang, toggleGlobal } = useLang();
  const { rate, setRate, speak, stop, speaking } = useTTS();
  const activeSection = useScrollSpy();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const NAV_ITEMS = [
    { id: 'intro',        label: 'Wstęp',      icon: SparklesIcon },
    { id: 'vocab',        label: 'Słownictwo',  icon: BookOpenIcon },
    { id: 'pronunciation',label: 'Wymowa',      icon: MicrophoneIcon },
    { id: 'grammar',      label: 'Gramatyka',   icon: AcademicCapIcon },
    { id: 'phrases',      label: 'Zwroty',      icon: ChatBubbleBottomCenterTextIcon },
    { id: 'mistakes',     label: 'Błędy',       icon: ExclamationTriangleIcon },
    { id: 'story',        label: 'Opowiadanie', icon: BookmarkIcon },
    { id: 'dialogue',     label: 'Dialog',      icon: LanguageIcon },
    { id: 'culture',      label: 'Kultura',     icon: GlobeEuropeAfricaIcon },
    { id: 'gems',         label: 'Perełki',     icon: StarIcon },
  ];

  return (
    <div className="max-w-7xl mx-auto pb-24 animate-fade-in-up">

      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 mb-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-500 hover:text-italian-green transition-colors font-medium text-sm shrink-0"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Biblioteka</span>
          </button>

          {/* Topic chip */}
          <div className="flex-1 min-w-0 hidden md:block">
            <p className="text-sm font-serif font-semibold text-slate-700 truncate text-center">
              {globalLang === 'it' ? lesson.topic.it : lesson.topic.pl}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setRate(r => r === 0.9 ? 0.6 : 0.9)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-colors"
              title="Prędkość TTS"
            >
              <SpeakerWaveIcon className="w-3 h-3" />
              {rate === 0.9 ? '1.0×' : '0.6×'}
            </button>

            <button
              onClick={toggleGlobal}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white hover:bg-italian-green transition-all shadow-sm active:scale-95 text-xs font-bold tracking-wide"
              title="Przełącz język globalnie (każdy blok tekstu możesz też kliknąć osobno)"
            >
              <LanguageIcon className="w-4 h-4" />
              {globalLang === 'it' ? '🇮🇹 IT' : '🇵🇱 PL'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 lg:px-6">

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className="hidden lg:block lg:col-span-3 xl:col-span-2">
          <div className="sticky top-28 space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 pl-2">Spis treści</p>
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
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
                {label}
              </button>
            ))}

            {/* Meta card */}
            <div className="mt-6 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Badge className={DIFFICULTY_COLOR[lesson.difficulty_level]}>
                  {lesson.difficulty_level}
                </Badge>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <ClockIcon className="w-3 h-3" />
                  {lesson.estimated_reading_minutes ?? '?'} min
                </span>
              </div>
              {lesson.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {lesson.tags.map((tag, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              {lesson.trivia && (
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-1">Ciekawostka</p>
                  <p className="text-xs text-slate-600 italic leading-relaxed">
                    <B content={lesson.trivia} />
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── Main Content ─────────────────────────────────────────────────── */}
        <main className="col-span-1 lg:col-span-9 xl:col-span-10 space-y-20">

          {/* ════ INTRO ════════════════════════════════════════════════════ */}
          <section id="intro">
            <div className="text-center space-y-6 py-6">
              {/* Emoji */}
              <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-white shadow-xl text-7xl border-4 border-slate-50 relative">
                {lesson.emoji}
                <div className={`absolute -bottom-2 -right-2 text-[10px] font-bold px-2.5 py-1 rounded-full shadow border ${DIFFICULTY_COLOR[lesson.difficulty_level]}`}>
                  {lesson.difficulty_level}
                </div>
              </div>

              {/* Title + subtitle */}
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

              {/* Tags + meta row */}
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                {lesson.tags?.map((tag, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200">
                    #{tag}
                  </span>
                ))}
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1">
                  <ClockIcon className="w-3 h-3" />
                  {lesson.estimated_reading_minutes ?? '?'} min czytania
                </span>
                <span className="text-slate-400">{new Date(lesson.timestamp).toLocaleDateString('pl-PL')}</span>
              </div>

              {/* Intro text */}
              <div className="max-w-2xl mx-auto text-left">
                <p className="text-lg text-slate-700 leading-relaxed font-light">
                  <B content={lesson.introduction} />
                </p>
              </div>

              {/* Key takeaways */}
              {lesson.key_takeaways?.length > 0 && (
                <div className="max-w-2xl mx-auto bg-gradient-to-br from-italian-green/5 to-emerald-50 rounded-2xl p-6 border border-italian-green/10 text-left">
                  <p className="text-xs font-bold uppercase tracking-widest text-italian-green mb-4">
                    Co wyniesiesz z tej lekcji
                  </p>
                  <ul className="space-y-3">
                    {lesson.key_takeaways.map((kt, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircleIcon className="w-5 h-5 text-italian-green shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-700 leading-relaxed">
                          <B content={kt} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* ════ VOCABULARY ═══════════════════════════════════════════════ */}
          <section>
            <SectionHeading
              id="vocab"
              icon={BookOpenIcon}
              title={globalLang === 'it' ? 'Lessico & Dettagli' : 'Słownictwo i szczegóły'}
              subtitle={globalLang === 'it' ? 'Clicca ▼ per etimologia, sinonimi e famiglia di parole' : 'Kliknij ▼ by zobaczyć etymologię, synonimy i rodzinę wyrazów'}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lesson.vocabulary.map((item, i) => (
                <VocabCard key={i} item={item} speak={speak} speaking={speaking} />
              ))}
            </div>
          </section>

          {/* ════ PRONUNCIATION ════════════════════════════════════════════ */}
          {lesson.pronunciation_tips?.length > 0 && (
            <section>
              <SectionHeading
                id="pronunciation"
                icon={MicrophoneIcon}
                title={globalLang === 'it' ? 'Guida alla Pronuncia' : 'Przewodnik wymowy'}
                subtitle={globalLang === 'it' ? 'Suoni difficili per i polacchi' : 'Trudne dźwięki dla Polaków'}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lesson.pronunciation_tips.map((tip, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-italian-green/30 hover:shadow-md transition-all">
                    {/* Sound */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-3xl font-mono font-bold text-slate-900 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                        {tip.sound}
                      </div>
                      <button
                        onClick={() => speak(tip.example_word)}
                        className="p-2.5 rounded-full bg-italian-green/10 text-italian-green hover:bg-italian-green hover:text-white transition-colors"
                        title={`Wymów: ${tip.example_word}`}
                      >
                        <SpeakerWaveIcon className="w-4 h-4" />
                      </button>
                    </div>
                    {/* Description */}
                    <p className="text-sm text-slate-700 leading-relaxed mb-3">
                      <B content={tip.description} />
                    </p>
                    {/* Example word + sentence */}
                    <div className="bg-slate-50 rounded-xl p-3 space-y-1">
                      <p className="text-sm font-bold text-italian-green">{tip.example_word}</p>
                      {tip.example_sentence && (
                        <p className="text-xs italic text-slate-600">{tip.example_sentence}</p>
                      )}
                    </div>
                    {/* Common mistake */}
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

          {/* ════ GRAMMAR ══════════════════════════════════════════════════ */}
          <section>
            <SectionHeading
              id="grammar"
              icon={AcademicCapIcon}
              title={globalLang === 'it' ? 'Focus Grammaticale' : 'Focus gramatyczny'}
            />
            <div className="space-y-6">
              {lesson.grammar.map((g, i) => (
                <div key={i} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-7 py-5 border-b border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800">
                      <B content={g.title} />
                    </h3>
                    {g.pattern && (
                      <code className="mt-2 inline-block text-xs font-mono bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-italian-green">
                        {g.pattern}
                      </code>
                    )}
                  </div>
                  {/* Body */}
                  <div className="p-7 space-y-5">
                    <p className="text-sm text-slate-600 leading-relaxed">
                      <B content={g.explanation} />
                    </p>
                    {/* Examples */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Przykłady</p>
                      {g.examples.map((ex, j) => (
                        <div key={j} className="flex gap-3 items-start bg-slate-50 rounded-xl p-3 border border-slate-100">
                          <button
                            onClick={() => speak(ex.it)}
                            className="mt-0.5 shrink-0 text-slate-400 hover:text-italian-green transition-colors"
                            title="Wymów"
                          >
                            <PlayIcon className="w-3.5 h-3.5" />
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800">
                              <B content={ex} />
                            </p>
                            {ex.breakdown && (
                              <p className="text-[10px] font-mono text-slate-400 mt-0.5">{ex.breakdown}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Exceptions */}
                    {g.exceptions?.length ? (
                      <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                        <p className="text-[10px] font-bold uppercase text-amber-700 tracking-widest mb-2">Wyjątki</p>
                        {g.exceptions.map((exc, j) => (
                          <p key={j} className="text-sm text-amber-800">
                            <B content={exc} />
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ════ PHRASES ══════════════════════════════════════════════════ */}
          <section>
            <SectionHeading
              id="phrases"
              icon={ChatBubbleBottomCenterTextIcon}
              title={globalLang === 'it' ? 'Frasi Utili' : 'Przydatne zwroty'}
            />
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="divide-y divide-white/5">
                {lesson.useful_phrases.map((ph, i) => (
                  <div key={i} className="group px-6 py-5 hover:bg-white/5 transition-colors">
                    <div className="flex items-start gap-4">
                      {/* Expression */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-lg font-serif font-semibold text-white group-hover:text-italian-green transition-colors">
                            {ph.expression}
                          </span>
                          <button
                            onClick={() => speak(ph.expression)}
                            className="text-slate-500 hover:text-italian-green transition-colors"
                          >
                            <SpeakerWaveIcon className="w-3.5 h-3.5" />
                          </button>
                          {ph.register && (
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${REGISTER_STYLE[ph.register]}`}>
                              {ph.register}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-300 text-sm mb-2">{ph.translation}</p>
                        <p className="text-slate-500 text-xs italic">
                          <B content={ph.context} />
                        </p>
                      </div>
                    </div>
                    {ph.example_usage && (
                      <div className="mt-3 ml-0 pl-4 border-l border-white/10 text-xs text-slate-400 italic">
                        <B content={ph.example_usage} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ════ COMMON MISTAKES ══════════════════════════════════════════ */}
          <section>
            <SectionHeading
              id="mistakes"
              icon={ExclamationTriangleIcon}
              title={globalLang === 'it' ? 'Attenzione agli Errori' : 'Uwaga na błędy'}
              subtitle={globalLang === 'it' ? 'Trappole per i parlanti polacchi' : 'Pułapki dla Polaków uczących się włoskiego'}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lesson.common_mistakes.map((m, i) => {
                const style = MISTAKE_STYLE[m.category] ?? MISTAKE_STYLE.usage;
                return (
                  <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                    {/* Category badge */}
                    <div className={`px-4 py-2 ${style.bg} flex items-center gap-2`}>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${style.color}`}>
                        {style.label}
                      </span>
                    </div>
                    <div className="p-5 space-y-3">
                      {/* Wrong → Correct */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-red-50 rounded-lg p-3 border border-red-100">
                          <p className="text-[10px] font-bold text-red-500 uppercase mb-1">Źle</p>
                          <p className="font-mono text-sm text-slate-500 line-through">{m.wrong}</p>
                        </div>
                        <div className="text-slate-300 font-bold">→</div>
                        <div className="flex-1 bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                          <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Dobrze</p>
                          <p className="font-mono text-sm font-bold text-slate-800">{m.correct}</p>
                        </div>
                      </div>
                      {/* Explanation */}
                      <p className="text-sm text-slate-600 leading-relaxed">
                        <B content={m.explanation} />
                      </p>
                      {/* Mnemonic */}
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

          {/* ════ MINI STORY ═══════════════════════════════════════════════ */}
          {lesson.mini_story && (
            <section>
              <SectionHeading
                id="story"
                icon={BookmarkIcon}
                title={globalLang === 'it' ? 'Breve Storia' : 'Krótkie opowiadanie'}
                subtitle={globalLang === 'it' ? 'Il vocabolario in contesto narrativo' : 'Słownictwo w kontekście narracyjnym'}
              />
              <div className="relative bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Decorative quote mark */}
                <div className="absolute top-6 left-6 text-9xl text-slate-100 font-serif leading-none select-none pointer-events-none">"</div>
                <div className="relative p-8 md:p-12">
                  <h3 className="text-xl font-serif font-bold text-slate-800 mb-6">
                    <B content={lesson.mini_story.title} />
                  </h3>
                  <div className="prose prose-lg prose-slate max-w-none text-slate-700 leading-relaxed text-base md:text-lg font-light">
                    <B content={lesson.mini_story.text} as="p" />
                  </div>
                  {lesson.mini_story.moral && (
                    <div className="mt-8 pt-6 border-t border-slate-100 flex items-start gap-3">
                      <HeartIcon className="w-4 h-4 text-italian-red shrink-0 mt-0.5" />
                      <p className="text-sm italic text-slate-500">
                        <B content={lesson.mini_story.moral} />
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ════ DIALOGUE ═════════════════════════════════════════════════ */}
          <section>
            <SectionHeading
              id="dialogue"
              icon={LanguageIcon}
              title={globalLang === 'it' ? 'Dialogo in Contesto' : 'Dialog w kontekście'}
            />
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 space-y-1">
                <p className="font-bold text-slate-700 font-serif text-lg">
                  <B content={lesson.dialogue.title} />
                </p>
                {lesson.dialogue.setting && (
                  <p className="text-sm text-slate-400 italic flex items-center gap-1.5">
                    <GlobeEuropeAfricaIcon className="w-3.5 h-3.5 shrink-0" />
                    <B content={lesson.dialogue.setting} />
                  </p>
                )}
                {/* Vocab highlights */}
                {lesson.dialogue.vocabulary_highlight?.length ? (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {lesson.dialogue.vocabulary_highlight.map((w, i) => (
                      <button
                        key={i}
                        onClick={() => speak(w)}
                        className="text-[10px] px-2 py-0.5 rounded-full border border-italian-green/30 text-italian-green bg-italian-green/5 font-medium hover:bg-italian-green hover:text-white transition-colors"
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Lines */}
              <div className="divide-y divide-slate-50">
                {lesson.dialogue.lines.map((line, i) => (
                  <div key={i} className="group p-5 hover:bg-slate-50/50 transition-colors flex gap-4">
                    {/* Avatar */}
                    <div className="w-14 shrink-0 text-center">
                      <div className="w-10 h-10 mx-auto rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center font-bold text-slate-600 text-xs mb-1 shadow-inner">
                        {line.speaker.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{line.speaker}</span>
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {line.tone && (
                          <span title={line.tone} className="text-base">{TONE_EMOJI[line.tone]}</span>
                        )}
                        {line.annotation && (
                          <span className="text-[10px] italic text-slate-400">
                            (<B content={line.annotation} />)
                          </span>
                        )}
                      </div>
                      <p
                        className="text-base text-slate-800 leading-relaxed cursor-pointer hover:text-italian-green transition-colors"
                        onClick={() => speak(line.text.it)}
                      >
                        <B content={line.text} />
                      </p>
                      {line.grammar_note && (
                        <div className="mt-2 flex items-start gap-1.5 text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2 border border-indigo-100">
                          <AcademicCapIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <B content={line.grammar_note} />
                        </div>
                      )}
                      <button
                        onClick={() => speak(line.text.it)}
                        className="mt-2 text-[10px] font-semibold text-italian-green opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                      >
                        <PlayIcon className="w-3 h-3" /> Odsłuchaj
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ════ CULTURE ══════════════════════════════════════════════════ */}
          <section>
            <SectionHeading
              id="culture"
              icon={GlobeEuropeAfricaIcon}
              title={globalLang === 'it' ? 'Cultura & Società' : 'Kultura i społeczeństwo'}
            />
            <div className="space-y-6">
              {/* Main culture block */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-br from-italian-green/10 via-emerald-50 to-white px-8 py-6 border-b border-slate-100">
                  <h3 className="text-xl font-serif font-bold text-slate-800">
                    <B content={lesson.culture.title} />
                  </h3>
                </div>
                <div className="p-8">
                  <div className="prose prose-slate text-slate-700 leading-relaxed max-w-none text-base">
                    <B content={lesson.culture.content} as="p" />
                  </div>
                  {/* Did you know */}
                  {lesson.culture.did_you_know && (
                    <div className="mt-6 flex items-start gap-3 bg-amber-50 rounded-2xl p-5 border border-amber-100">
                      <LightBulbIcon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold uppercase text-amber-600 tracking-widest mb-1">Czy wiesz, że…</p>
                        <p className="text-sm text-amber-800 leading-relaxed">
                          <B content={lesson.culture.did_you_know} />
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Cultural notes grid */}
              {lesson.cultural_notes?.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lesson.cultural_notes.map((note, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-italian-green/30 hover:shadow-md transition-all">
                      <div className="flex items-start gap-3 mb-3">
                        <span className="text-2xl">{note.icon}</span>
                        <div>
                          <h4 className="font-bold text-sm text-slate-800">
                            <B content={note.title} />
                          </h4>
                          {note.region && (
                            <span className="text-[10px] text-slate-400 font-medium">📍 {note.region}</span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        <B content={note.content} />
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Regional notes */}
              {lesson.regional_notes && (
                <div className="bg-teal-50 rounded-2xl border border-teal-100 p-5 flex gap-3">
                  <span className="text-xl shrink-0">🗺️</span>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-teal-700 tracking-widest mb-1">Różnice regionalne</p>
                    <p className="text-sm text-teal-800 leading-relaxed">
                      <B content={lesson.regional_notes} />
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ════ PROVERB + IDIOM ══════════════════════════════════════════ */}
          <section>
            <SectionHeading
              id="gems"
              icon={StarIcon}
              title={globalLang === 'it' ? 'Perle della Lingua' : 'Językowe perełki'}
              subtitle={globalLang === 'it' ? 'Proverbio e modo di dire' : 'Przysłowie i idiom'}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Proverb */}
              {lesson.proverb && (
                <div className="relative bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-white pointer-events-none" />
                  <div className="relative p-7 space-y-4">
                    <div className="flex items-center gap-2 text-amber-600">
                      <span className="text-lg">📜</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest">Proverbio italiano</span>
                    </div>
                    <blockquote className="text-2xl font-serif font-bold italic text-slate-800 leading-snug">
                      "{lesson.proverb.text}"
                    </blockquote>
                    <button
                      onClick={() => speak(lesson.proverb.text)}
                      className="flex items-center gap-1.5 text-xs text-italian-green font-medium hover:underline"
                    >
                      <SpeakerWaveIcon className="w-3.5 h-3.5" /> Odsłuchaj
                    </button>
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Tłumaczenie</span>
                        <p className="text-sm text-slate-700 mt-0.5"><B content={lesson.proverb.translation} /></p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Znaczenie</span>
                        <p className="text-sm text-slate-600 italic mt-0.5"><B content={lesson.proverb.meaning} /></p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Idiom */}
              {lesson.idiom && (
                <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 text-white rounded-3xl shadow-2xl overflow-hidden">
                  <div className="p-7 space-y-5">
                    <div className="flex items-center gap-2 text-indigo-300">
                      <LightBulbIcon className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Modo di dire</span>
                    </div>
                    <div>
                      <div className="text-2xl md:text-3xl font-serif font-bold leading-tight">
                        "{lesson.idiom.phrase}"
                      </div>
                      <button
                        onClick={() => speak(lesson.idiom.phrase)}
                        className="mt-2 flex items-center gap-1.5 text-xs text-indigo-300 hover:text-white transition-colors"
                      >
                        <SpeakerWaveIcon className="w-3.5 h-3.5" /> Odsłuchaj
                      </button>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10 space-y-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-indigo-300 tracking-widest">Znaczenie</span>
                        <p className="text-sm text-white font-medium mt-0.5"><B content={lesson.idiom.meaning} /></p>
                      </div>
                      <div className="border-t border-white/10 pt-3">
                        <span className="text-[10px] font-bold uppercase text-indigo-300 tracking-widest">Dosłownie</span>
                        <p className="text-sm text-indigo-200 italic mt-0.5"><B content={lesson.idiom.literal} /></p>
                      </div>
                      {lesson.idiom.origin && (
                        <div className="border-t border-white/10 pt-3">
                          <span className="text-[10px] font-bold uppercase text-indigo-300 tracking-widest">Pochodzenie</span>
                          <p className="text-sm text-indigo-200 mt-0.5"><B content={lesson.idiom.origin} /></p>
                        </div>
                      )}
                      {lesson.idiom.example_sentence && (
                        <div className="border-t border-white/10 pt-3">
                          <span className="text-[10px] font-bold uppercase text-indigo-300 tracking-widest">Przykład</span>
                          <p className="text-sm text-indigo-100 italic mt-0.5">
                            <B content={lesson.idiom.example_sentence} />
                          </p>
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
  );
};
