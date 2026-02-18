import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  SunIcon,
  MoonIcon,
  XMarkIcon,
  ArrowRightIcon,
  CheckIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';

import { Lesson, VocabularyItem, MistakeCategory, Register, DialogueTone, PartOfSpeech } from '../types';
import { useLang, useTheme } from '../context/LangContext';
import { B } from './BilingualBlock';

// ─── Props ────────────────────────────────────────────────────────────────────

interface LessonViewProps {
  lesson: Lesson;
  onBack: () => void;
  onChangeKey?: () => void;
}

// ─── Label maps ───────────────────────────────────────────────────────────────

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
  formal:     { pl: 'formal.',    it: 'formale' },
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

// colour tokens via inline styles (var-based)
const MISTAKE_BG: Record<MistakeCategory, string> = {
  false_friend: '#fee2e2',
  grammar:      '#fef3c7',
  pronunciation:'#dbeafe',
  usage:        '#ede9fe',
  spelling:     '#f1f5f9',
};
const MISTAKE_TEXT: Record<MistakeCategory, string> = {
  false_friend: '#b91c1c',
  grammar:      '#b45309',
  pronunciation:'#1d4ed8',
  usage:        '#7c3aed',
  spelling:     '#475569',
};

const DIFFICULTY_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  A1: { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
  A2: { bg: '#ccfbf1', text: '#0f766e', border: '#5eead4' },
  B1: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
  B2: { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },
  C1: { bg: '#ede9fe', text: '#5b21b6', border: '#c4b5fd' },
};

const GENDER_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  m:        { bg: '#f0f9ff', text: '#0284c7', border: '#bae6fd' },
  f:        { bg: '#fdf2f8', text: '#db2777', border: '#f9a8d4' },
  pl:       { bg: '#faf5ff', text: '#7c3aed', border: '#ddd6fe' },
  invariant:{ bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' },
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

// ─── TTS ─────────────────────────────────────────────────────────────────────

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

// ─── Scroll-spy ───────────────────────────────────────────────────────────────

const SECTION_IDS = ['intro','vocab','grammar','phrases','mistakes','story','dialogue','culture','gems'];

const useScrollSpy = () => {
  const [active, setActive] = useState('intro');
  useEffect(() => {
    const handler = () => {
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= 280) { setActive(id); break; }
        }
      }
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);
  return active;
};

// ─── Reading progress ─────────────────────────────────────────────────────────

const useReadingProgress = () => {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const update = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop || document.body.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? Math.min(100, (scrolled / total) * 100) : 0);
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
    return () => window.removeEventListener('scroll', update);
  }, []);
  return progress;
};

// ─── Favorites storage ────────────────────────────────────────────────────────

const FAVORITES_KEY = 'wloski_favorites';

export function getFavorites(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]')); }
  catch { return new Set(); }
}

function saveFavorites(set: Set<string>) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...set]));
}

export function toggleFavorite(id: string): boolean {
  const favs = getFavorites();
  if (favs.has(id)) { favs.delete(id); } else { favs.add(id); }
  saveFavorites(favs);
  return favs.has(id);
}

// ─── Flashcard Quiz ───────────────────────────────────────────────────────────

type QuizStep = 'question' | 'revealed' | 'done';

interface QuizState {
  index: number;
  step: QuizStep;
  correct: number;
  wrong: number;
  answers: ('correct' | 'wrong' | null)[];
}

const FlashcardQuiz: React.FC<{
  lesson: import('../types').Lesson;
  onClose: () => void;
}> = ({ lesson, onClose }) => {
  const { globalLang: l } = useLang();
  const items = lesson.vocabulary;
  const [state, setState] = useState<QuizState>({
    index: 0,
    step: 'question',
    correct: 0,
    wrong: 0,
    answers: new Array(items.length).fill(null),
  });

  const current = items[state.index];
  const pct = Math.round((state.index / items.length) * 100);

  const reveal = () => setState(s => ({ ...s, step: 'revealed' }));

  const answer = (ok: boolean) => {
    setState(s => {
      const answers = [...s.answers];
      answers[s.index] = ok ? 'correct' : 'wrong';
      const nextIndex = s.index + 1;
      return {
        ...s,
        index: nextIndex,
        step: nextIndex >= items.length ? 'done' : 'question',
        correct: s.correct + (ok ? 1 : 0),
        wrong: s.wrong + (ok ? 0 : 1),
        answers,
      };
    });
  };

  const restart = () => setState({
    index: 0,
    step: 'question',
    correct: 0,
    wrong: 0,
    answers: new Array(items.length).fill(null),
  });

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (state.step === 'question' && e.key === ' ') { e.preventDefault(); reveal(); }
      if (state.step === 'revealed') {
        if (e.key === 'ArrowRight' || e.key === 'Enter') answer(true);
        if (e.key === 'ArrowLeft')  answer(false);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [state.step, state.index]);

  const LL = {
    title:      l === 'it' ? 'Ripasso Vocabolario' : 'Powtórka słownictwa',
    question:   l === 'it' ? 'Come si traduce?' : 'Jak to przetłumaczyć?',
    reveal:     l === 'it' ? 'Mostra risposta' : 'Pokaż odpowiedź',
    knew:       l === 'it' ? 'Sapevo ✓' : 'Wiedziałem ✓',
    didntKnow:  l === 'it' ? 'Non sapevo ✗' : 'Nie wiedziałem ✗',
    results:    l === 'it' ? 'Risultati' : 'Wyniki',
    score:      (c: number, t: number) => l === 'it' ? `${c} / ${t} corrette` : `${c} / ${t} poprawnych`,
    great:      l === 'it' ? 'Ottimo lavoro! 🎉' : 'Świetna robota! 🎉',
    again:      l === 'it' ? 'Riprova' : 'Spróbuj jeszcze raz',
    close:      l === 'it' ? 'Chiudi' : 'Zamknij',
    hint:       l === 'it' ? 'Spazio = mostra · ← sbagliato · → corretto' : 'Spacja = pokaż · ← nie wiedziałem · → wiedziałem',
    word:       l === 'it' ? 'Parola italiana' : 'Słowo włoskie',
    meaning:    l === 'it' ? 'Significato' : 'Znaczenie',
  };

  const scorePercent = state.index > 0 ? Math.round((state.correct / state.index) * 100) : 0;

  return (
    <div className="quiz-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="quiz-card" style={{ maxWidth: 480 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--c-border)' }}>
          <div className="flex items-center gap-2">
            <TrophyIcon className="w-4 h-4" style={{ color: 'var(--c-green)' }} />
            <span className="font-bold text-sm" style={{ color: 'var(--c-text)' }}>{LL.title}</span>
          </div>
          <div className="flex items-center gap-3">
            {state.step !== 'done' && (
              <span className="text-xs font-bold" style={{ color: 'var(--c-muted)' }}>
                {state.index + 1} / {items.length}
              </span>
            )}
            <button onClick={onClose} className="p-1 rounded-full" style={{ color: 'var(--c-faint)' }}>
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress track */}
        {state.step !== 'done' && (
          <div className="quiz-progress-track">
            <div className="quiz-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        )}

        {state.step === 'done' ? (
          /* ── Results ── */
          <div className="quiz-card-inner gap-4" style={{ cursor: 'default' }}>
            <div className="text-5xl quiz-result-icon" style={{ lineHeight: 1 }}>
              {state.correct >= Math.ceil(items.length * 0.8) ? '🏆' : state.correct >= Math.ceil(items.length * 0.5) ? '📚' : '💪'}
            </div>
            <div>
              <p className="text-xl font-bold font-serif" style={{ color: 'var(--c-text)' }}>{LL.results}</p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--c-muted)' }}>{LL.score(state.correct, items.length)}</p>
            </div>
            {/* Score dots */}
            <div className="flex flex-wrap justify-center gap-1.5 max-w-xs">
              {state.answers.map((a, i) => (
                <div key={i} className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: a === 'correct' ? 'var(--c-green)' : '#ef4444' }}
                  title={items[i].word}>
                  {a === 'correct' ? '✓' : '✗'}
                </div>
              ))}
            </div>
            <p className="text-sm" style={{ color: scorePercent >= 80 ? 'var(--c-green)' : 'var(--c-muted)' }}>
              {scorePercent >= 80 ? LL.great : `${scorePercent}%`}
            </p>
            <div className="flex gap-2">
              <button onClick={restart} className="px-4 py-2 rounded-lg text-xs font-bold border transition-colors"
                style={{ border: '1px solid var(--c-border)', background: 'var(--c-bg)', color: 'var(--c-text)' }}>
                {LL.again}
              </button>
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-colors"
                style={{ background: 'var(--c-green)' }}>
                {LL.close}
              </button>
            </div>
          </div>
        ) : (
          /* ── Question / Revealed ── */
          <>
            <div className="quiz-card-inner quiz-flip" key={`${state.index}-${state.step}`}
              onClick={state.step === 'question' ? reveal : undefined}
              style={{ cursor: state.step === 'question' ? 'pointer' : 'default' }}>
              {/* Word front */}
              <div>
                <p className="micro-label mb-1.5" style={{ color: 'var(--c-faint)' }}>{LL.word}</p>
                <p className="text-3xl font-serif font-bold" style={{ color: 'var(--c-text)' }}>{current.word}</p>
                {current.ipa && (
                  <p className="text-xs font-mono mt-1" style={{ color: 'var(--c-faint)' }}>{current.ipa}</p>
                )}
              </div>

              {state.step === 'question' ? (
                <button
                  className="mt-2 px-6 py-2 rounded-full text-sm font-semibold text-white"
                  style={{ background: 'var(--c-green)' }}
                  onClick={reveal}
                >
                  {LL.reveal}
                </button>
              ) : (
                /* Answer revealed */
                <div className="w-full space-y-2 animate-fade-in">
                  <div className="p-3 rounded-xl text-sm" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
                    <p className="micro-label mb-1" style={{ color: 'var(--c-faint)' }}>{LL.meaning}</p>
                    <p className="font-semibold" style={{ color: 'var(--c-text)' }}>{current.translation}</p>
                    {(l === 'it' ? current.definition.it : current.definition.pl) && (
                      <p className="text-xs mt-0.5 italic leading-relaxed" style={{ color: 'var(--c-muted)' }}>
                        {l === 'it' ? current.definition.it : current.definition.pl}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={() => answer(false)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      style={{ background: 'rgba(239,68,68,.1)', color: '#dc2626', border: '1px solid rgba(239,68,68,.2)' }}
                    >
                      <XMarkIcon className="w-4 h-4" />
                      {LL.didntKnow}
                    </button>
                    <button
                      onClick={() => answer(true)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      style={{ background: 'var(--c-green-dim)', color: 'var(--c-green)', border: '1px solid rgba(0,140,69,.2)' }}
                    >
                      <CheckIcon className="w-4 h-4" />
                      {LL.knew}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Keyboard hint */}
            <div className="px-5 pb-3 flex items-center justify-center gap-1 text-[10px]" style={{ color: 'var(--c-faint)' }}>
              {state.step === 'question' ? (
                <><span className="kbd">Space</span><span className="ml-1">= pokaż</span></>
              ) : (
                <><span className="kbd">←</span><span className="mx-1">nie</span>
                  <span className="kbd">→</span><span className="ml-1">tak</span></>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Badge ────────────────────────────────────────────────────────────────────

const Badge: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}> = ({ children, style, className = '' }) => (
  <span className={`badge ${className}`} style={style}>{children}</span>
);

// ─── SectionHeading ───────────────────────────────────────────────────────────

const SectionHeading: React.FC<{
  id: string;
  icon: React.ElementType;
  title: string;
  subtitle?: string;
}> = ({ id, icon: Icon, title, subtitle }) => (
  <div id={id} className="section-heading scroll-mt-12">
    <div className="section-heading-icon">
      <Icon className="w-4 h-4" />
    </div>
    <div>
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
  </div>
);

// ─── SpeakBtn ─────────────────────────────────────────────────────────────────

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
  const stopLbl  = globalLang === 'it' ? 'Ferma' : 'Zatrzymaj';
  const listenLbl = globalLang === 'it' ? 'Ascolta 🇮🇹' : 'Odsłuchaj 🇮🇹';
  return (
    <button
      onClick={() => active ? stop() : speak(italianText, id)}
      className={`speak-btn ${active ? 'active' : ''} ${className}`}
      title={active ? stopLbl : (globalLang === 'it' ? 'Ascolta in italiano' : 'Odsłuchaj po włosku')}
    >
      {active
        ? <StopCircleIcon className="w-3.5 h-3.5 animate-pulse" />
        : <SpeakerWaveIcon className="w-3.5 h-3.5" />
      }
      {label !== undefined ? label : (active ? stopLbl : listenLbl)}
    </button>
  );
};

// ─── VocabCard ────────────────────────────────────────────────────────────────

const VocabCard: React.FC<{
  item: VocabularyItem;
  speak: (t: string, id: string) => void;
  stop: () => void;
  speakId: string | null;
  cardId: string;
}> = ({ item, speak, stop, speakId, cardId }) => {
  const [open, setOpen] = useState(false);
  const { globalLang: l } = useLang();

  const posLabel    = POS_LABEL[item.part_of_speech]?.[l] ?? item.part_of_speech;
  const genderLabel = item.gender ? (GENDER_LABEL[item.gender]?.[l] ?? item.gender) : null;
  const gs          = item.gender ? GENDER_STYLE[item.gender] : null;

  const LL = {
    etymology:  l === 'it' ? 'Etimologia'          : 'Etymologia',
    synonyms:   l === 'it' ? 'Sinonimi'            : 'Synonimy',
    antonyms:   l === 'it' ? 'Contrari'            : 'Antonimy',
    wordFamily: l === 'it' ? 'Famiglia di parole'  : 'Rodzina wyrazów',
    listenSent: l === 'it' ? 'Ascolta la frase'    : 'Odsłuchaj zdanie',
    pluralLbl:  l === 'it' ? 'pl.'                 : 'l.mn.:',
  };

  return (
    <div className="card card-hover overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1 mb-0.5">
              <span className="text-lg font-bold font-serif" style={{ color: 'var(--c-text)' }}>
                {item.word}
              </span>
              {gs && (
                <Badge style={{ background: gs.bg, color: gs.text, borderColor: gs.border }}>
                  {genderLabel}
                </Badge>
              )}
              {item.register && (
                <Badge className={REGISTER_STYLE[item.register]}>
                  {REG_LABEL[item.register]?.[l] ?? item.register}
                </Badge>
              )}
              <Badge style={{ background: 'var(--c-bg)', color: 'var(--c-faint)', borderColor: 'var(--c-border)' }}>
                {posLabel}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {item.ipa && (
                <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--c-bg)', color: 'var(--c-faint)', border: '1px solid var(--c-border)' }}>
                  {item.ipa}
                </span>
              )}
              <span className="text-xs italic" style={{ color: 'var(--c-muted)' }}>{item.translation}</span>
            </div>
            {item.plural && (
              <div className="mt-0.5 text-xs" style={{ color: 'var(--c-faint)' }}>
                {LL.pluralLbl} <span className="font-medium" style={{ color: 'var(--c-muted)' }}>{item.plural}</span>
              </div>
            )}
            {item.audio_hint && (
              <div className="mt-0.5 text-xs font-mono" style={{ color: '#6366f1' }}>▸ {item.audio_hint}</div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <SpeakBtn
              italianText={item.word}
              id={cardId + '-word'}
              speak={speak} stop={stop} speakId={speakId}
              label=""
              className="p-1.5 rounded-full"
              style={{ background: 'var(--c-bg)' } as React.CSSProperties}
            />
            <button
              onClick={() => setOpen(o => !o)}
              className="p-1.5 rounded-full transition-colors"
              style={{ background: 'var(--c-bg)', color: 'var(--c-faint)' }}
            >
              {open ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <p className="text-sm leading-relaxed" style={{ color: 'var(--c-muted)' }}>
          <B content={item.definition} />
        </p>

        <div className="mt-2 p-3 rounded-lg" style={{ background: 'var(--c-bg)'}}>
          <p className="text-xs italic" style={{ color: 'var(--c-text)' }}>"<B content={item.context_sentence} />"</p>
          <SpeakBtn
            italianText={item.context_sentence.it}
            id={cardId + '-sentence'}
            speak={speak} stop={stop} speakId={speakId}
            label={LL.listenSent}
            className="mt-1"
          />
        </div>
      </div>

      {open && (
        <div className="border-t p-4 space-y-3 animate-fade-in"
          style={{ borderColor: 'var(--c-border-soft)', background: 'var(--c-bg)' }}>
          {item.etymology && (
            <div>
              <span className="micro-label block mb-1">{LL.etymology}</span>
              <p className="text-xs italic" style={{ color: 'var(--c-muted)' }}><B content={item.etymology} /></p>
            </div>
          )}
          {(item.synonyms?.length || item.antonyms?.length) ? (
            <div className="grid grid-cols-2 gap-2">
              {item.synonyms?.length ? (
                <div>
                  <span className="micro-label block mb-1">{LL.synonyms}</span>
                  <div className="flex flex-wrap gap-1">
                    {item.synonyms.map((s, i) => (
                      <button key={i} onClick={() => speak(s, cardId + '-syn-' + i)}
                        className="text-xs px-2 py-0.5 rounded-full transition-colors"
                        style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {item.antonyms?.length ? (
                <div>
                  <span className="micro-label block mb-1">{LL.antonyms}</span>
                  <div className="flex flex-wrap gap-1">
                    {item.antonyms.map((a, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>{a}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          {item.word_family?.length ? (
            <div>
              <span className="micro-label block mb-1.5">{LL.wordFamily}</span>
              <div className="flex flex-wrap gap-1.5">
                {item.word_family.map((wf, i) => (
                  <div key={i} className="flex items-center gap-1 rounded px-2 py-1 text-xs"
                    style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}>
                    <span className="font-bold">{wf.form}</span>
                    <span style={{ color: 'var(--c-faint)' }}>·</span>
                    <span className="italic" style={{ color: 'var(--c-muted)' }}>{wf.type}</span>
                    <span style={{ color: 'var(--c-faint)' }}>·</span>
                    <span style={{ color: 'var(--c-muted)' }}>{wf.translation}</span>
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
  const { theme, toggleTheme } = useTheme();
  const { rate, setRate, speak, stop, speakId, hasItalianVoice } = useTTS();
  const activeSection = useScrollSpy();
  const readingProgress = useReadingProgress();

  // Favorites
  const [isFav, setIsFav] = useState(() => getFavorites().has(lesson.id));
  const handleToggleFav = () => setIsFav(toggleFavorite(lesson.id));

  // Quiz mode
  const [showQuiz, setShowQuiz] = useState(false);

  // Keyboard shortcuts: Escape = back, Q = quiz
  useEffect(() => {
    if (showQuiz) return; // handled inside quiz component
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack();
      if ((e.key === 'q' || e.key === 'Q') && !e.ctrlKey && !e.metaKey && !(e.target instanceof HTMLInputElement)) {
        setShowQuiz(true);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [showQuiz, onBack]);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

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
    listenIntro:  l === 'it' ? 'Ascolta introduzione'   : 'Odsłuchaj wstęp',
    listenStory:  l === 'it' ? 'Ascolta il racconto'    : 'Odsłuchaj opowiadanie',
    listenCulture:l === 'it' ? 'Ascolta testo'          : 'Odsłuchaj tekst',
    playDialogue: l === 'it' ? 'Riproduci dialogo'      : 'Odtwórz cały dialog',
    translation:  l === 'it' ? 'Traduzione'             : 'Tłumaczenie',
    meaning:      l === 'it' ? 'Significato'            : 'Znaczenie',
    origin:       l === 'it' ? 'Origine'                : 'Pochodzenie',
    literally:    l === 'it' ? 'Letteralmente'          : 'Dosłownie',
    exampleLbl:   l === 'it' ? 'Esempio'                : 'Przykład',
    didYouKnow:   l === 'it' ? 'Lo sapevi che…'         : 'Czy wiesz, że…',
    regional:     l === 'it' ? 'Varianti regionali'     : 'Różnice regionalne',
    apiKey:       l === 'it' ? 'Cambia chiave API'      : 'Zmień klucz API',
    voiceFound:   l === 'it' ? 'Voce italiana trovata'  : 'Głos włoski znaleziony',
    voiceMissing: l === 'it' ? 'Nessuna voce italiana'  : 'Brak głosu włoskiego',
    diffLabels: {
      A1: { pl: 'Początkujący', it: 'Principiante' },
      A2: { pl: 'Elementarny',  it: 'Elementare' },
      B1: { pl: 'Średniozaaw.', it: 'Intermedio' },
      B2: { pl: 'Wyższy śred.', it: 'Interm. sup.' },
      C1: { pl: 'Zaawansowany', it: 'Avanzato' },
    },
  };

  const NAV_ITEMS = [
    { id: 'intro',        pl: 'Wstęp',       it: 'Intro',       icon: SparklesIcon },
    { id: 'vocab',        pl: 'Słownictwo',  it: 'Lessico',     icon: BookOpenIcon },
    { id: 'grammar',      pl: 'Gramatyka',   it: 'Grammatica',  icon: AcademicCapIcon },
    { id: 'phrases',      pl: 'Zwroty',      it: 'Frasi',       icon: ChatBubbleBottomCenterTextIcon },
    { id: 'mistakes',     pl: 'Błędy',       it: 'Errori',      icon: ExclamationTriangleIcon },
    { id: 'story',        pl: 'Opowiadanie', it: 'Racconto',    icon: BookmarkIcon },
    { id: 'dialogue',     pl: 'Dialog',      it: 'Dialogo',     icon: LanguageIcon },
    { id: 'culture',      pl: 'Kultura',     it: 'Cultura',     icon: GlobeEuropeAfricaIcon },
    { id: 'gems',         pl: 'Perełki',     it: 'Gemme',       icon: StarIcon },
  ];

  const speakerSides = useMemo<Record<string, 'left' | 'right'>>(() => {
    const map: Record<string, 'left' | 'right'> = {};
    let idx = 0;
    for (const line of lesson.dialogue?.lines ?? []) {
      if (!(line.speaker in map)) { map[line.speaker] = idx % 2 === 0 ? 'left' : 'right'; idx++; }
    }
    return map;
  }, [lesson.dialogue?.lines]);

  const dc = DIFFICULTY_COLOR[lesson.difficulty_level] ?? DIFFICULTY_COLOR.B1;

  return (
    <div className="min-h-screen" style={{ background: 'var(--c-bg)', color: 'var(--c-text)' }}>

      {/* ── Reading progress bar ────────────────────────────────────────────── */}
      <div className="reading-progress-bar" style={{ width: `${readingProgress}%` }} />

      {/* ── Flashcard Quiz overlay ──────────────────────────────────────────── */}
      {showQuiz && <FlashcardQuiz lesson={lesson} onClose={() => setShowQuiz(false)} />}

      {/* ── Sticky top bar ─────────────────────────────────────────────────── */}
      <div className="glass-nav sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-4 h-11 flex items-center gap-2">

          <button
            onClick={onBack}
            className="flex items-center gap-1.5 font-medium text-xs shrink-0"
            style={{ color: 'var(--c-muted)' }}
          >
            <ArrowLeftIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{L.library}</span>
          </button>

          <div className="flex-1 min-w-0 hidden md:block text-center">
            <p className="text-xs font-serif font-semibold truncate" style={{ color: 'var(--c-muted)' }}>
              {l === 'it' ? lesson.topic.it : lesson.topic.pl}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <button
              onClick={() => setRate(r => r === 0.9 ? 0.6 : 0.9)}
              title={hasItalianVoice ? L.voiceFound : L.voiceMissing}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border"
              style={hasItalianVoice
                ? { background: 'var(--c-green-dim)', color: 'var(--c-green)', borderColor: 'rgba(0,140,69,.2)' }
                : { background: 'rgba(245,158,11,.08)', color: '#b45309', borderColor: 'rgba(245,158,11,.3)' }
              }
            >
              {hasItalianVoice ? '🇮🇹' : '⚠️'}
              <SpeakerWaveIcon className="w-3 h-3" />
              {rate === 0.9 ? '1×' : '0.6×'}
            </button>

            <button
              onClick={toggleGlobal}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold active:scale-95"
              style={{ background: 'var(--c-text)', color: theme === 'dark' ? '#13151b' : '#fff' }}
            >
              <LanguageIcon className="w-3 h-3" />
              {l === 'it' ? '🇮🇹 IT' : '🇵🇱 PL'}
            </button>

            {/* Przełącznik motywu */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Tryb jasny' : 'Tryb ciemny'}
              className="theme-toggle"
            >
              {theme === 'dark'
                ? <SunIcon className="w-4 h-4 theme-icon-enter" />
                : <MoonIcon className="w-4 h-4 theme-icon-enter" />
              }
            </button>

            {/* Favorite button */}
            <button
              onClick={handleToggleFav}
              title={isFav ? (l === 'it' ? 'Rimuovi dai preferiti' : 'Usuń z ulubionych') : (l === 'it' ? 'Aggiungi ai preferiti' : 'Dodaj do ulubionych')}
              className={`fav-btn ${isFav ? 'active' : ''}`}
            >
              {isFav ? <StarSolidIcon className="w-3.5 h-3.5" /> : <StarIcon className="w-3.5 h-3.5" />}
            </button>

            {/* Quiz button */}
            <button
              onClick={() => setShowQuiz(true)}
              title={(l === 'it' ? 'Quiz vocabolario' : 'Quiz słownictwa') + ' [Q]'}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-all"
              style={{ background: 'var(--c-green-dim)', color: 'var(--c-green)', borderColor: 'rgba(0,140,69,.2)' }}
            >
              <TrophyIcon className="w-3 h-3" />
              {l === 'it' ? 'Quiz' : 'Quiz'}
            </button>

            {onChangeKey && (
              <button
                onClick={onChangeKey}
                title={L.apiKey}
                className="p-1.5 rounded-lg"
                style={{ color: 'var(--c-faint)' }}
              >
                <KeyIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Layout ─────────────────────────────────────────────────────────── */}
      <div className="max-w-screen-2xl mx-auto pb-20 animate-fade-in-up">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 px-4 lg:px-6 pt-6">

          {/* ── Sidebar ────────────────────────────────────────────────────── */}
          <aside className="hidden lg:block lg:col-span-2">
            <div className="sticky top-14 space-y-0.5">
              <p className="micro-label mb-2 pl-2">{L.toc}</p>
              {NAV_ITEMS.map(({ id, pl, it, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className={`nav-btn ${activeSection === id ? 'active' : ''}`}
                >
                  <Icon />
                  {l === 'it' ? it : pl}
                </button>
              ))}

              <div className="mt-4 p-3 card space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge style={{ background: dc.bg, color: dc.text, borderColor: dc.border }}>
                    {lesson.difficulty_level}
                  </Badge>
                  <span className="text-xs flex items-center gap-1" style={{ color: 'var(--c-faint)' }}>
                    <ClockIcon className="w-3 h-3" />
                    {L.readMins(lesson.estimated_reading_minutes ?? 0)}
                  </span>
                </div>
                {lesson.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {lesson.tags.map((tag, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{ background: 'var(--c-bg)', color: 'var(--c-muted)' }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                {lesson.trivia && (
                  <div>
                    <p className="micro-label mb-0.5">{L.trivia}</p>
                    <p className="text-xs italic leading-relaxed" style={{ color: 'var(--c-muted)' }}>
                      <B content={lesson.trivia} />
                    </p>
                  </div>
                )}
                {/* Shortcuts hint */}
                <div className="flex flex-col gap-1 pt-1 border-t" style={{ borderColor: 'var(--c-border-soft)' }}>
                  <div className="flex items-center gap-1.5 text-[9px]" style={{ color: 'var(--c-faint)' }}>
                    <span className="kbd">Q</span>
                    <span>{l === 'it' ? 'avvia quiz' : 'uruchom quiz'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px]" style={{ color: 'var(--c-faint)' }}>
                    <span className="kbd">Esc</span>
                    <span>{l === 'it' ? 'torna alla biblioteca' : 'wróć do biblioteki'}</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* ── Main content ───────────────────────────────────────────────── */}
          <main className="col-span-1 lg:col-span-10 space-y-14">

            {/* ═══ WSTĘP ═══════════════════════════════════════════════════ */}
            <section id="intro">
              <div className="text-center space-y-4 py-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full shadow-lg text-5xl border-2 relative"
                  style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border-soft)' }}>
                  {lesson.emoji}
                  <div className="absolute -bottom-2 -right-2 text-[10px] font-bold px-2 py-0.5 rounded-full shadow badge"
                    style={{ background: dc.bg, color: dc.text, borderColor: dc.border }}>
                    {lesson.difficulty_level}
                  </div>
                </div>

                <div className="space-y-1">
                  <h1 className="text-3xl md:text-5xl font-serif font-bold tracking-tight leading-tight" style={{ color: 'var(--c-text)' }}>
                    <B content={lesson.topic} />
                  </h1>
                  {lesson.subtitle && (
                    <p className="text-base md:text-lg italic font-light max-w-xl mx-auto" style={{ color: 'var(--c-muted)' }}>
                      <B content={lesson.subtitle} />
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                  {lesson.tags?.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'var(--c-bg)', color: 'var(--c-muted)', border: '1px solid var(--c-border)' }}>
                      #{tag}
                    </span>
                  ))}
                  <span className="px-2 py-0.5 rounded-full flex items-center gap-1"
                    style={{ background: 'var(--c-bg)', color: 'var(--c-faint)', border: '1px solid var(--c-border)' }}>
                    <ClockIcon className="w-3 h-3" />
                    {L.readMins(lesson.estimated_reading_minutes ?? 0)}
                  </span>
                  <span style={{ color: 'var(--c-faint)' }}>
                    {new Date(lesson.timestamp).toLocaleDateString(l === 'it' ? 'it-IT' : 'pl-PL')}
                  </span>
                </div>

                <div className="max-w-2xl mx-auto text-left space-y-2">
                  <p className="text-base leading-relaxed font-light" style={{ color: 'var(--c-muted)' }}>
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
                  <div className="key-takeaways max-w-2xl mx-auto p-4 rounded-xl text-left"
                    style={{ background: 'var(--c-green-dim)', border: '1px solid rgba(0,140,69,.12)' }}>
                    <p className="micro-label mb-3" style={{ color: 'var(--c-green)' }}>{L.keyTakeaways}</p>
                    <ul className="space-y-2">
                      {lesson.key_takeaways.map((kt, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircleIcon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--c-green)' }} />
                          <span className="text-sm leading-relaxed" style={{ color: 'var(--c-text)' }}>
                            <B content={kt} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>

            {/* ═══ SŁOWNICTWO ══════════════════════════════════════════════ */}
            <section>
              <SectionHeading
                id="vocab"
                icon={BookOpenIcon}
                title={l === 'it' ? 'Lessico & Dettagli' : 'Słownictwo i szczegóły'}
                subtitle={l === 'it' ? 'Clicca ▼ per etimologia, sinonimi e famiglia' : 'Kliknij ▼ by rozwinąć etymologię, synonimy i rodzinę'}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {lesson.vocabulary.map((item, i) => (
                  <VocabCard key={i} item={item} cardId={`vocab-${i}`}
                    speak={speak} stop={stop} speakId={speakId} />
                ))}
              </div>
            </section>

            {/* ═══ GRAMATYKA ═══════════════════════════════════════════════ */}
            <section>
              <SectionHeading
                id="grammar"
                icon={AcademicCapIcon}
                title={l === 'it' ? 'Focus Grammaticale' : 'Focus gramatyczny'}
              />
              <div className="space-y-4">
                {lesson.grammar.map((g, gi) => (
                  <div key={gi} className="card overflow-hidden">
                    <div className="px-5 py-3 border-b"
                      style={{ background: 'var(--c-bg)', borderColor: 'var(--c-border)' }}>
                      <h3 className="text-base font-bold" style={{ color: 'var(--c-text)' }}>
                        <B content={g.title} />
                      </h3>
                      {g.pattern && (
                        <code className="mt-1.5 inline-block text-xs font-mono px-2 py-1 rounded-md"
                          style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-green)' }}>
                          {g.pattern}
                        </code>
                      )}
                    </div>
                    <div className="p-5 space-y-3">
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--c-muted)' }}>
                        <B content={g.explanation} />
                      </p>
                      <div className="space-y-1.5">
                        <p className="micro-label">{L.examples}</p>
                        {g.examples.map((ex, j) => (
                          <div key={j} className="flex gap-2 items-start p-2.5 rounded-lg"
                            style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border-soft)' }}>
                            <SpeakBtn
                              italianText={ex.it}
                              id={`gram-${gi}-${j}`}
                              speak={speak} stop={stop} speakId={speakId}
                              label=""
                              className="mt-0.5 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium" style={{ color: 'var(--c-text)' }}>
                                <B content={ex} />
                              </p>
                              {ex.breakdown && (
                                <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--c-faint)' }}>
                                  {ex.breakdown}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {g.exceptions?.length ? (
                        <div className="exception-box p-3 rounded-lg"
                          style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                          <p className="micro-label mb-1.5" style={{ color: '#92400e' }}>{L.exceptions}</p>
                          {g.exceptions.map((exc, j) => (
                            <p key={j} className="text-sm" style={{ color: '#78350f' }}><B content={exc} /></p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ═══ ZWROTY ══════════════════════════════════════════════════ */}
            <section>
              <SectionHeading
                id="phrases"
                icon={ChatBubbleBottomCenterTextIcon}
                title={l === 'it' ? 'Frasi Utili' : 'Przydatne zwroty'}
              />
              <div className="rounded-2xl overflow-hidden shadow-lg"
                style={{ background: 'var(--c-phrases-bg)' }}>
                <div className="divide-y divide-white/5">
                  {lesson.useful_phrases.map((ph, i) => (
                    <div key={i} className="group px-5 py-4 hover:bg-white/4 transition-colors">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className="text-base font-serif font-semibold text-white group-hover:text-emerald-400 transition-colors">
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
                      <p className="text-slate-300 text-xs mb-0.5">{ph.translation}</p>
                      <p className="text-slate-500 text-xs italic"><B content={ph.context} /></p>
                      {ph.example_usage && (
                        <div className="mt-1.5 pl-3 border-l border-white/10 text-xs text-slate-400 italic">
                          <B content={ph.example_usage} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ═══ BŁĘDY ═══════════════════════════════════════════════════ */}
            <section>
              <SectionHeading
                id="mistakes"
                icon={ExclamationTriangleIcon}
                title={l === 'it' ? 'Attenzione agli Errori' : 'Uwaga na błędy'}
                subtitle={l === 'it' ? 'Trappole per chi parla polacco' : 'Pułapki dla Polaków uczących się włoskiego'}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {lesson.common_mistakes.map((m, i) => {
                  const cat = m.category;
                  return (
                    <div key={i} className="card overflow-hidden">
                      <div className="px-3 py-1.5" style={{ background: MISTAKE_BG[cat] }}>
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MISTAKE_TEXT[cat] }}>
                          {MISTAKE_LABEL[cat]?.[l] ?? cat}
                        </span>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="wrong-box flex-1 p-2.5 rounded-lg" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                            <p className="micro-label mb-0.5" style={{ color: '#ef4444' }}>{L.wrong}</p>
                            <p className="font-mono text-xs line-through" style={{ color: '#6b7280' }}>{m.wrong}</p>
                          </div>
                          <div className="font-bold text-sm" style={{ color: 'var(--c-faint)' }}>→</div>
                          <div className="correct-box flex-1 p-2.5 rounded-lg" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                            <p className="micro-label mb-0.5" style={{ color: '#22c55e' }}>{L.correct}</p>
                            <p className="font-mono text-xs font-bold" style={{ color: 'var(--c-text)' }}>{m.correct}</p>
                          </div>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--c-muted)' }}>
                          <B content={m.explanation} />
                        </p>
                        {m.mnemonic && (
                          <div className="mnemonic-box flex items-start gap-1.5 text-xs p-2.5 rounded-lg"
                            style={{ background: '#eef2ff', color: '#4338ca', border: '1px solid #e0e7ff' }}>
                            <LightBulbIcon className="w-3 h-3 shrink-0 mt-0.5" style={{ color: '#6366f1' }} />
                            <B content={m.mnemonic} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ═══ OPOWIADANIE ═════════════════════════════════════════════ */}
            {lesson.mini_story && (
              <section>
                <SectionHeading
                  id="story"
                  icon={BookmarkIcon}
                  title={l === 'it' ? 'Breve Racconto' : 'Krótkie opowiadanie'}
                  subtitle={l === 'it' ? 'Lessico nel contesto narrativo' : 'Słownictwo w kontekście narracyjnym'}
                />
                <div className="card overflow-hidden relative">
                  <div className="absolute top-4 left-4 text-7xl font-serif leading-none select-none pointer-events-none"
                    style={{ color: 'var(--c-border-soft)' }}>"</div>
                  <div className="relative p-6 md:p-8">
                    <h3 className="text-lg font-serif font-bold mb-4" style={{ color: 'var(--c-text)' }}>
                      <B content={lesson.mini_story.title} />
                    </h3>
                    <div className="prose prose-slate max-w-none text-base font-light leading-relaxed" style={{ color: 'var(--c-muted)' }}>
                      <B content={lesson.mini_story.text} as="p" />
                    </div>
                    <div className="mt-3">
                      <SpeakBtn
                        italianText={lesson.mini_story.text.it}
                        id="story-text"
                        speak={speak} stop={stop} speakId={speakId}
                        label={L.listenStory}
                      />
                    </div>
                    {lesson.mini_story.moral && (
                      <div className="mt-5 pt-4 flex items-start gap-2"
                        style={{ borderTop: '1px solid var(--c-border-soft)' }}>
                        <HeartIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--c-red)' }} />
                        <p className="text-xs italic" style={{ color: 'var(--c-faint)' }}>
                          <B content={lesson.mini_story.moral} />
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* ═══ DIALOG ══════════════════════════════════════════════════ */}
            <section>
              <SectionHeading
                id="dialogue"
                icon={LanguageIcon}
                title={l === 'it' ? 'Dialogo in Contesto' : 'Dialog w kontekście'}
              />

              {/* Dialog header */}
              <div className="card rounded-b-none border-b-0 px-5 py-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold font-serif text-base" style={{ color: 'var(--c-text)' }}>
                      <B content={lesson.dialogue.title} />
                    </p>
                    {lesson.dialogue.setting && (
                      <p className="text-xs italic flex items-center gap-1 mt-0.5" style={{ color: 'var(--c-faint)' }}>
                        <GlobeEuropeAfricaIcon className="w-3 h-3 shrink-0" />
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
                  <div className="flex flex-wrap gap-1">
                    {lesson.dialogue.vocabulary_highlight.map((w, i) => (
                      <button
                        key={i}
                        onClick={() => speak(w, `dv-${i}`)}
                        className="text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors"
                        style={{ borderColor: 'rgba(0,140,69,.3)', color: 'var(--c-green)', background: 'var(--c-green-dim)' }}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Chat bubbles */}
              <div className="rounded-b-2xl border p-4 md:p-6 space-y-3"
                style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface-2)', borderTop: 'none' }}>
                {lesson.dialogue.lines.map((line, i) => {
                  const side = speakerSides[line.speaker] ?? 'left';
                  const isRight = side === 'right';
                  const prevSpeaker = i > 0 ? lesson.dialogue.lines[i - 1].speaker : null;
                  const isNewSpeaker = line.speaker !== prevSpeaker;

                  return (
                    <div key={i}>
                      {i > 0 && i % 6 === 0 && (
                        <div className="flex items-center gap-2 py-1 my-0.5">
                          <div className="flex-1 h-px" style={{ background: 'var(--c-border)' }} />
                          <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: 'var(--c-faint)' }}>…</span>
                          <div className="flex-1 h-px" style={{ background: 'var(--c-border)' }} />
                        </div>
                      )}

                      <div className={`flex items-end gap-2 ${isRight ? 'flex-row-reverse' : ''}`}>
                        {/* Avatar */}
                        <div className="w-8 shrink-0 flex flex-col items-center">
                          {isNewSpeaker ? (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] shadow-sm text-white"
                              style={{ background: isRight ? 'var(--c-green)' : '#64748b' }}>
                              {line.speaker.substring(0, 2).toUpperCase()}
                            </div>
                          ) : <div className="w-8 h-8" />}
                        </div>

                        {/* Bubble group */}
                        <div className={`max-w-xs md:max-w-md lg:max-w-lg flex flex-col gap-1 ${isRight ? 'items-end' : 'items-start'}`}>
                          {isNewSpeaker && (
                            <span className={`text-[10px] font-bold uppercase tracking-wide px-1 ${isRight ? 'text-right' : ''}`}
                              style={{ color: 'var(--c-faint)' }}>
                              {line.speaker}
                              {line.tone && <span className="ml-1">{TONE_EMOJI[line.tone]}</span>}
                            </span>
                          )}

                          {line.annotation && (
                            <p className={`text-[10px] italic px-1 ${isRight ? 'text-right' : ''}`} style={{ color: 'var(--c-faint)' }}>
                              (<B content={line.annotation} />)
                            </p>
                          )}

                          <div className={`group relative px-3.5 py-2.5 min-w-[60px] rounded-2xl shadow-sm ${
                            isRight
                              ? 'rounded-tr-sm'
                              : 'rounded-tl-sm'
                          }`}
                            style={isRight
                              ? { background: 'rgba(0,140,69,.12)', border: '1px solid rgba(0,140,69,.2)' }
                              : { background: 'var(--c-surface)', border: '1px solid var(--c-border)' }
                            }>
                            {!isNewSpeaker && line.tone && (
                              <span className="text-xs mr-1">{TONE_EMOJI[line.tone]}</span>
                            )}
                            <p
                              className="text-sm leading-relaxed cursor-pointer hover:opacity-75 transition-opacity select-text"
                              onClick={() => speak(line.text.it, `line-${i}`)}
                              title={l === 'it' ? 'Clicca per ascoltare' : 'Kliknij by odsłuchać'}
                            >
                              <B content={line.text} />
                            </p>
                            <div className={`mt-1 flex ${isRight ? 'justify-end' : 'justify-start'}`}>
                              <SpeakBtn
                                italianText={line.text.it}
                                id={`line-${i}`}
                                speak={speak} stop={stop} speakId={speakId}
                                label=""
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              />
                            </div>
                          </div>

                          {line.grammar_note && (
                            <div className="grammar-note flex items-start gap-1.5 text-xs p-2 rounded-xl max-w-full"
                              style={{ background: '#eef2ff', color: '#4338ca', border: '1px solid #e0e7ff' }}>
                              <AcademicCapIcon className="w-3 h-3 shrink-0 mt-0.5" />
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

            {/* ═══ KULTURA ═════════════════════════════════════════════════ */}
            <section>
              <SectionHeading
                id="culture"
                icon={GlobeEuropeAfricaIcon}
                title={l === 'it' ? 'Cultura & Società' : 'Kultura i społeczeństwo'}
              />
              <div className="space-y-4">
                <div className="card overflow-hidden">
                  <div className="px-6 py-4 border-b"
                    style={{ background: 'var(--c-green-dim)', borderColor: 'var(--c-border-soft)' }}>
                    <h3 className="text-base font-serif font-bold" style={{ color: 'var(--c-text)' }}>
                      <B content={lesson.culture.title} />
                    </h3>
                  </div>
                  <div className="p-6 space-y-3">
                    <div className="prose prose-slate max-w-none text-sm leading-relaxed" style={{ color: 'var(--c-muted)' }}>
                      <B content={lesson.culture.content} as="p" />
                    </div>
                    <SpeakBtn
                      italianText={lesson.culture.content.it}
                      id="culture-content"
                      speak={speak} stop={stop} speakId={speakId}
                      label={L.listenCulture}
                    />
                    {lesson.culture.did_you_know && (
                      <div className="didyouknow-box flex items-start gap-2 p-3.5 rounded-xl mt-2"
                        style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                        <LightBulbIcon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
                        <div>
                          <p className="micro-label mb-0.5" style={{ color: '#b45309' }}>{L.didYouKnow}</p>
                          <p className="text-xs leading-relaxed" style={{ color: '#78350f' }}>
                            <B content={lesson.culture.did_you_know} />
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {lesson.cultural_notes?.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                    {lesson.cultural_notes.map((note, i) => (
                      <div key={i} className="card card-hover p-4">
                        <div className="flex items-start gap-2 mb-2">
                          <span className="text-xl">{note.icon}</span>
                          <div>
                            <h4 className="font-bold text-xs" style={{ color: 'var(--c-text)' }}>
                              <B content={note.title} />
                            </h4>
                            {note.region && (
                              <span className="text-[10px]" style={{ color: 'var(--c-faint)' }}>📍 {note.region}</span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--c-muted)' }}>
                          <B content={note.content} />
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {lesson.regional_notes && (
                  <div className="regional-note p-4 rounded-xl flex gap-2"
                    style={{ background: '#f0fdfa', border: '1px solid #99f6e4' }}>
                    <span className="text-lg shrink-0">🗺️</span>
                    <div>
                      <p className="micro-label mb-0.5" style={{ color: '#0f766e' }}>{L.regional}</p>
                      <p className="text-xs leading-relaxed" style={{ color: '#134e4a' }}>
                        <B content={lesson.regional_notes} />
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* ═══ PEREŁKI ═════════════════════════════════════════════════ */}
            <section>
              <SectionHeading
                id="gems"
                icon={StarIcon}
                title={l === 'it' ? 'Perle della Lingua' : 'Językowe perełki'}
                subtitle={l === 'it' ? 'Proverbio e modo di dire' : 'Przysłowie i idiom'}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {lesson.proverb && (
                  <div className="proverb-card card overflow-hidden relative"
                    style={{ background: 'linear-gradient(135deg,#fffbeb 0%,#fff 100%)' }}>
                    <div className="p-5 space-y-3">
                      <div className="flex items-center gap-2" style={{ color: '#92400e' }}>
                        <span className="text-base">📜</span>
                        <span className="micro-label" style={{ color: '#b45309' }}>
                          {l === 'it' ? 'Proverbio italiano' : 'Włoskie przysłowie'}
                        </span>
                      </div>
                      <blockquote className="text-xl font-serif font-bold italic leading-snug" style={{ color: 'var(--c-text)' }}>
                        "{lesson.proverb.text}"
                      </blockquote>
                      <SpeakBtn italianText={lesson.proverb.text} id="proverb" speak={speak} stop={stop} speakId={speakId} />
                      <div className="space-y-2 pt-2" style={{ borderTop: '1px solid var(--c-border-soft)' }}>
                        <div>
                          <span className="micro-label block mb-0.5">{L.translation}</span>
                          <p className="text-xs" style={{ color: 'var(--c-text)' }}><B content={lesson.proverb.translation} /></p>
                        </div>
                        <div>
                          <span className="micro-label block mb-0.5">{L.meaning}</span>
                          <p className="text-xs italic" style={{ color: 'var(--c-muted)' }}><B content={lesson.proverb.meaning} /></p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {lesson.idiom && (
                  <div className="rounded-2xl shadow-xl overflow-hidden"
                    style={{ background: 'linear-gradient(135deg,#4338ca 0%,#3730a3 60%,#1e1b4b 100%)' }}>
                    <div className="p-5 space-y-4">
                      <div className="flex items-center gap-2" style={{ color: '#a5b4fc' }}>
                        <LightBulbIcon className="w-3.5 h-3.5" />
                        <span className="micro-label" style={{ color: '#a5b4fc' }}>
                          {l === 'it' ? 'Modo di dire' : 'Włoski idiom'}
                        </span>
                      </div>
                      <div>
                        <div className="text-xl md:text-2xl font-serif font-bold leading-tight text-white">
                          "{lesson.idiom.phrase}"
                        </div>
                        <SpeakBtn
                          italianText={lesson.idiom.phrase}
                          id="idiom"
                          speak={speak} stop={stop} speakId={speakId}
                          className="mt-1.5"
                          style={{ color: '#a5b4fc' } as React.CSSProperties}
                        />
                      </div>
                      <div className="space-y-2.5 p-4 rounded-xl"
                        style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.1)' }}>
                        <div>
                          <span className="micro-label block mb-0.5" style={{ color: '#a5b4fc' }}>{L.meaning}</span>
                          <p className="text-sm text-white font-medium"><B content={lesson.idiom.meaning} /></p>
                        </div>
                        <div style={{ borderTop: '1px solid rgba(255,255,255,.1)', paddingTop: '8px' }}>
                          <span className="micro-label block mb-0.5" style={{ color: '#a5b4fc' }}>{L.literally}</span>
                          <p className="text-xs italic" style={{ color: '#c7d2fe' }}><B content={lesson.idiom.literal} /></p>
                        </div>
                        {lesson.idiom.origin && (
                          <div style={{ borderTop: '1px solid rgba(255,255,255,.1)', paddingTop: '8px' }}>
                            <span className="micro-label block mb-0.5" style={{ color: '#a5b4fc' }}>{L.origin}</span>
                            <p className="text-xs" style={{ color: '#c7d2fe' }}><B content={lesson.idiom.origin} /></p>
                          </div>
                        )}
                        {lesson.idiom.example_sentence && (
                          <div style={{ borderTop: '1px solid rgba(255,255,255,.1)', paddingTop: '8px' }}>
                            <span className="micro-label block mb-0.5" style={{ color: '#a5b4fc' }}>{L.exampleLbl}</span>
                            <p className="text-xs italic" style={{ color: '#e0e7ff' }}><B content={lesson.idiom.example_sentence} /></p>
                            <SpeakBtn
                              italianText={lesson.idiom.example_sentence.it}
                              id="idiom-example"
                              speak={speak} stop={stop} speakId={speakId}
                              className="mt-1"
                              style={{ color: '#a5b4fc' } as React.CSSProperties}
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
