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
import { useLang, useTheme, useFontSize } from '../context/LangContext';
import { B } from './BilingualBlock';
import { Flag, LangFlag } from './Flag';

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

const REGISTER_STYLE: Record<Register, React.CSSProperties> = {
  formal:    { background: 'rgba(99,102,241,.15)',  color: '#818cf8', borderColor: 'rgba(99,102,241,.3)' },
  informal:  { background: 'rgba(245,158,11,.15)',  color: '#fbbf24', borderColor: 'rgba(245,158,11,.3)' },
  colloquial:{ background: 'rgba(249,115,22,.15)',  color: '#fb923c', borderColor: 'rgba(249,115,22,.3)' },
  literary:  { background: 'rgba(244,63,94,.15)',   color: '#fb7185', borderColor: 'rgba(244,63,94,.3)'  },
  regional:  { background: 'rgba(20,184,166,.15)',  color: '#2dd4bf', borderColor: 'rgba(20,184,166,.3)' },
  vulgar:    { background: 'rgba(239,68,68,.15)',   color: '#f87171', borderColor: 'rgba(239,68,68,.3)'  },
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

const useTTS = (targetLang: 'it' | 'en' = 'it') => {
  const [rate, setRate] = useState(0.9);
  const [speakId, setSpeakId] = useState<string | null>(null);
  const voiceRef = React.useRef<SpeechSynthesisVoice | null>(null);
  const [hasItalianVoice, setHasItalianVoice] = useState(false);
  const ttsLang = targetLang === 'en' ? 'en-GB' : 'it-IT';

  useEffect(() => {
    const findVoice = () => {
      const voices = window.speechSynthesis?.getVoices() ?? [];
      if (targetLang === 'en') {
        voiceRef.current =
          voices.find(v => v.lang === 'en-GB' && v.localService) ||
          voices.find(v => v.lang === 'en-GB') ||
          voices.find(v => v.lang.startsWith('en')) ||
          null;
      } else {
        voiceRef.current =
          voices.find(v => v.lang === 'it-IT' && v.localService) ||
          voices.find(v => v.lang === 'it-IT') ||
          voices.find(v => v.lang.startsWith('it')) ||
          null;
      }
      setHasItalianVoice(!!voiceRef.current);
    };
    findVoice();
    window.speechSynthesis?.addEventListener('voiceschanged', findVoice);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', findVoice);
  }, [targetLang]);

  const speak = useCallback((italianText: string, id: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const chunks = splitText(italianText);
    setSpeakId(id);
    let i = 0;
    const next = () => {
      if (i >= chunks.length) { setSpeakId(null); return; }
      const u = new SpeechSynthesisUtterance(chunks[i++]);
      u.lang = ttsLang;
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
  const { globalLang: l, targetLang } = useLang();
  const isEnQ = targetLang === 'en';
  const t3q = (pl: string, it: string, en: string) => l === 'pl' ? pl : isEnQ ? en : it;
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
    title:      t3q('Powtórka słownictwa',         'Ripasso Vocabolario', 'Vocabulary review'),
    question:   t3q('Jak to przetłumaczyć?',        'Come si traduce?',    'How do you translate this?'),
    reveal:     t3q('Pokaż odpowiedź',              'Mostra risposta',     'Show answer'),
    knew:       t3q('Wiedziałem ✓',                 'Sapevo ✓',            'Knew it ✓'),
    didntKnow:  t3q('Nie wiedziałem ✗',             'Non sapevo ✗',        "Didn't know ✗"),
    results:    t3q('Wyniki',                       'Risultati',           'Results'),
    score:      (c: number, tot: number) => t3q(`${c} / ${tot} poprawnych`, `${c} / ${tot} corrette`, `${c} / ${tot} correct`),
    great:      t3q('Świetna robota! 🎉',           'Ottimo lavoro! 🎉',   'Great job! 🎉'),
    again:      t3q('Spróbuj jeszcze raz',          'Riprova',             'Try again'),
    close:      t3q('Zamknij',                      'Chiudi',              'Close'),
    hint:       t3q('Spacja = pokaż · ← nie wiem · → wiem', 'Spazio = mostra · ← sbagliato · → corretto', 'Space = show · ← wrong · → correct'),
    word:       t3q('Słowo',                        'Parola italiana',     'Word'),
    meaning:    t3q('Znaczenie',                    'Significato',         'Meaning'),
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
                    {(l === 'pl' ? current.definition.pl : (isEnQ ? current.definition.en : current.definition.it) ?? current.definition.pl) && (
                      <p className="text-xs mt-0.5 italic leading-relaxed" style={{ color: 'var(--c-muted)' }}>
                        {l === 'pl' ? current.definition.pl : (isEnQ ? current.definition.en : current.definition.it) ?? current.definition.pl}
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
  const { globalLang, targetLang } = useLang();
  const active = speakId === id;
  const stopLbl  = globalLang === 'pl' ? 'Zatrzymaj' : globalLang === 'en' ? 'Stop' : 'Ferma';
  const listenLbl = globalLang === 'pl' ? 'Odsłuchaj' : globalLang === 'en' ? 'Listen' : 'Ascolta';
  const listenTitle = globalLang === 'pl'
    ? (targetLang === 'en' ? 'Odsłuchaj po angielsku' : 'Odsłuchaj po włosku')
    : globalLang === 'en' ? 'Listen in English' : 'Ascolta in italiano';
  return (
    <button
      onClick={() => active ? stop() : speak(italianText, id)}
      className={`speak-btn ${active ? 'active' : ''} ${className}`}
      title={active ? stopLbl : listenTitle}
    >
      {active
        ? <StopCircleIcon className="w-3.5 h-3.5 animate-pulse" />
        : <SpeakerWaveIcon className="w-3.5 h-3.5" />
      }
      {label !== undefined ? label : (active ? stopLbl : <><Flag code={targetLang} size={13} aria-hidden="true" />{' '}{listenLbl}</>)}
    </button>
  );
};

// ─── VocabCardSkeleton ────────────────────────────────────────────────────────

const VocabCardSkeleton: React.FC<{ index: number }> = ({ index }) => (
  <div className="card overflow-hidden opacity-40" style={{ minHeight: 120 }}>
    <div className="p-4 flex flex-col gap-2 justify-center items-center h-full" style={{ minHeight: 120 }}>
      <div className="rounded-md animate-pulse" style={{ width: '60%', height: 14, background: 'var(--c-border)' }} />
      <div className="rounded-md animate-pulse" style={{ width: '40%', height: 10, background: 'var(--c-border-soft)' }} />
      <div className="rounded-md animate-pulse mt-1" style={{ width: '80%', height: 10, background: 'var(--c-border-soft)' }} />
      <span className="text-xs mt-1" style={{ color: 'var(--c-muted)', opacity: 0.6 }}>#{index + 1}</span>
    </div>
  </div>
);

// ─── VocabCard ────────────────────────────────────────────────────────────────

const VocabCard: React.FC<{
  item: VocabularyItem;
  speak: (t: string, id: string) => void;
  stop: () => void;
  speakId: string | null;
  cardId: string;
}> = ({ item, speak, stop, speakId, cardId }) => {
  const [open, setOpen] = useState(false);
  const { globalLang: l, targetLang } = useLang();
  const isEn = targetLang === 'en';
  const t3v = (pl: string, it: string, en: string) => l === 'pl' ? pl : isEn ? en : it;

  const posLabel    = POS_LABEL[item.part_of_speech]?.[l === 'pl' ? 'pl' : 'it'] ?? item.part_of_speech;
  const genderLabel = item.gender ? (GENDER_LABEL[item.gender]?.[l === 'pl' ? 'pl' : 'it'] ?? item.gender) : null;
  const gs          = item.gender ? GENDER_STYLE[item.gender] : null;

  const LL = {
    etymology:  t3v('Etymologia',      'Etimologia',         'Etymology'),
    synonyms:   t3v('Synonimy',        'Sinonimi',           'Synonyms'),
    antonyms:   t3v('Antonimy',        'Contrari',           'Antonyms'),
    wordFamily: t3v('Rodzina wyrazów', 'Famiglia di parole', 'Word family'),
    listenSent: t3v('Odsłuchaj zdanie','Ascolta la frase',   'Listen to sentence'),
    pluralLbl:  t3v('l.mn.:',          'pl.',                'pl.:'),
  };

  return (
    <div className="card card-hover overflow-hidden">
      <div className="p-4">
        {/* ── Word header row ── */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            {/* Word + gender + register badges */}
            <div className="flex flex-wrap items-center gap-1 mb-1">
              <span className="text-xl font-bold font-serif" style={{ color: 'var(--c-text)' }}>
                {item.word}
              </span>
              {gs && (
                <Badge style={{ background: gs.bg, color: gs.text, borderColor: gs.border }}>
                  {genderLabel}
                </Badge>
              )}
              {item.register && (
                <Badge style={{ border: '1px solid', ...REGISTER_STYLE[item.register] }}>
                  {REG_LABEL[item.register]?.[l === 'pl' ? 'pl' : 'it'] ?? item.register}
                </Badge>
              )}
              <Badge style={{ background: 'var(--c-bg)', color: 'var(--c-faint)', borderColor: 'var(--c-border)' }}>
                {posLabel}
              </Badge>
            </div>

            {/* IPA + plural */}
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              {item.ipa && (
                <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                  style={{ background: 'var(--c-bg)', color: 'var(--c-faint)', border: '1px solid var(--c-border)' }}>
                  {item.ipa}
                </span>
              )}
              {item.plural && (
                <span className="text-xs" style={{ color: 'var(--c-faint)' }}>
                  {LL.pluralLbl} <span className="font-medium" style={{ color: 'var(--c-muted)' }}>{item.plural}</span>
                </span>
              )}
            </div>

            {/* Translations: PL + EN */}
            <div className="flex flex-wrap gap-1.5 mb-1">
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}>
                🇵🇱 {item.translation}
              </span>
              {item.english_translation && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }}>
                  🇬🇧 {item.english_translation}
                </span>
              )}
            </div>

            {/* Audio hint */}
            {item.audio_hint && (
              <div className="text-xs font-mono" style={{ color: '#6366f1' }}>▸ {item.audio_hint}</div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col items-center gap-1 shrink-0">
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

        {/* ── Definition ── */}
        <p className="text-sm leading-relaxed text-justify-block mb-2" style={{ color: 'var(--c-muted)' }}>
          <B content={item.definition} />
        </p>

        {/* ── Context sentence ── */}
        <div className="p-3 rounded-lg" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border-soft)' }}>
          <p className="text-xs italic mb-1" style={{ color: 'var(--c-text)' }}>"<B content={item.context_sentence} />"</p>
          <SpeakBtn
            italianText={(isEn ? item.context_sentence.en : item.context_sentence.it) ?? item.context_sentence.pl ?? ''}
            id={cardId + '-sentence'}
            speak={speak} stop={stop} speakId={speakId}
            label={LL.listenSent}
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
  const { globalLang: l, toggleGlobal, targetLang } = useLang();
  const isEn = targetLang === 'en';
  // Helper: pick target-language text from a bilingual field
  const tl = (b?: { it?: string; en?: string; pl?: string }): string =>
    b ? ((isEn ? b.en : b.it) ?? b.pl ?? '') : '';
  const { theme, toggleTheme } = useTheme();
  const { fontSizeIndex, increaseFontSize, decreaseFontSize } = useFontSize();
  const { rate, setRate, speak, stop, speakId, hasItalianVoice } = useTTS(targetLang);
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

  // t3 helper: pick based on display lang (pl vs target)
  const t3 = (pl: string, it: string, en: string) =>
    l === 'pl' ? pl : isEn ? en : it;

  const L = {
    library:      t3('Biblioteka',                    'Biblioteca',             'Library'),
    toc:          t3('Spis treści',                   'Sommario',               'Contents'),
    trivia:       t3('Ciekawostka',                   'Curiosità',              'Did you know'),
    readMins:     (n: number) => t3(`${n} min czytania`, `${n} min lettura`,    `${n} min read`),
    keyTakeaways: t3('Co wyniesiesz z tej lekcji',    'Cosa imparerai',         'Key takeaways'),
    examples:     t3('Przykłady',                     'Esempi',                 'Examples'),
    exceptions:   t3('Wyjątki',                       'Eccezioni',              'Exceptions'),
    mnemonic:     t3('Wskazówka mnemotechniczna',     'Aiuto mnemonico',        'Memory tip'),
    wrong:        t3('Źle',                           'Sbagliato',              'Wrong'),
    correct:      t3('Dobrze',                        'Corretto',               'Correct'),
    listenIntro:  t3('Odsłuchaj wstęp',               'Ascolta introduzione',   'Listen to intro'),
    listenStory:  t3('Odsłuchaj opowiadanie',         'Ascolta il racconto',    'Listen to story'),
    listenCulture:t3('Odsłuchaj tekst',               'Ascolta testo',          'Listen to text'),
    playDialogue: t3('Odtwórz cały dialog',           'Riproduci dialogo',      'Play full dialogue'),
    translation:  t3('Tłumaczenie',                   'Traduzione',             'Translation'),
    meaning:      t3('Znaczenie',                     'Significato',            'Meaning'),
    origin:       t3('Pochodzenie',                   'Origine',                'Origin'),
    literally:    t3('Dosłownie',                     'Letteralmente',          'Literally'),
    exampleLbl:   t3('Przykład',                      'Esempio',                'Example'),
    didYouKnow:   t3('Czy wiesz, że…',               'Lo sapevi che…',         'Did you know…'),
    regional:     t3('Różnice regionalne',            'Varianti regionali',     'Regional variants'),
    apiKey:       t3('Zmień klucz API',               'Cambia chiave API',      'Change API key'),
    voiceFound:   t3('Głos znaleziony',               'Voce italiana trovata',  'Voice found'),
    voiceMissing: t3('Brak głosu',                    'Nessuna voce italiana',  'No voice found'),
    diffLabels: {
      A1: { pl: 'Początkujący', it: 'Principiante', en: 'Beginner' },
      A2: { pl: 'Elementarny',  it: 'Elementare',   en: 'Elementary' },
      B1: { pl: 'Średniozaaw.', it: 'Intermedio',   en: 'Intermediate' },
      B2: { pl: 'Wyższy śred.', it: 'Interm. sup.', en: 'Upper-Interm.' },
      C1: { pl: 'Zaawansowany', it: 'Avanzato',     en: 'Advanced' },
    },
  };

  const NAV_ITEMS = [
    { id: 'intro',    pl: 'Wstęp',       it: 'Intro',      en: 'Intro',      icon: SparklesIcon },
    { id: 'vocab',    pl: 'Słownictwo',  it: 'Lessico',    en: 'Vocabulary', icon: BookOpenIcon },
    { id: 'grammar',  pl: 'Gramatyka',   it: 'Grammatica', en: 'Grammar',    icon: AcademicCapIcon },
    { id: 'phrases',  pl: 'Zwroty',      it: 'Frasi',      en: 'Phrases',    icon: ChatBubbleBottomCenterTextIcon },
    { id: 'mistakes', pl: 'Błędy',       it: 'Errori',     en: 'Mistakes',   icon: ExclamationTriangleIcon },
    { id: 'story',    pl: 'Opowiadanie', it: 'Racconto',   en: 'Story',      icon: BookmarkIcon },
    { id: 'dialogue', pl: 'Dialog',      it: 'Dialogo',    en: 'Dialogue',   icon: LanguageIcon },
    { id: 'culture',  pl: 'Kultura',     it: 'Cultura',    en: 'Culture',    icon: GlobeEuropeAfricaIcon },
    { id: 'gems',     pl: 'Perełki',     it: 'Gemme',      en: 'Gems',       icon: StarIcon },
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
        <div className="max-w-screen-2xl mx-auto px-4 h-12 flex items-center gap-1">

          {/* Powrót */}
          <button
            onClick={onBack}
            className="nav-icon-btn shrink-0"
            style={{ width: 'auto', padding: '0 10px', gap: 6 }}
            title={L.library}
          >
            <ArrowLeftIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs font-medium">{L.library}</span>
          </button>

          {/* Tytuł lekcji — środek */}
          <div className="flex-1 min-w-0 hidden md:block text-center">
            <p className="text-xs font-serif font-semibold truncate" style={{ color: 'var(--c-muted)' }}>
              {l === 'pl' ? lesson.topic.pl : tl(lesson.topic)}
            </p>
          </div>

          {/* Prawa strona */}
          <div className="flex items-center gap-1 ml-auto">
            {/* Szybkość TTS */}
            <button
              onClick={() => setRate(r => r === 0.9 ? 0.6 : 0.9)}
              title={hasItalianVoice ? L.voiceFound : L.voiceMissing}
              className="nav-icon-btn hidden sm:flex"
              style={hasItalianVoice
                ? { background: 'var(--c-green-dim)', color: 'var(--c-green)', borderColor: 'rgba(0,140,69,.2)', width: 'auto', padding: '0 8px', gap: 4 }
                : { background: 'rgba(245,158,11,.08)', color: '#b45309', borderColor: 'rgba(245,158,11,.3)', width: 'auto', padding: '0 8px', gap: 4 }
              }
            >
              {hasItalianVoice ? <Flag code={targetLang} size={14} aria-hidden="true" /> : <span aria-hidden="true">⚠️</span>}
              <SpeakerWaveIcon className="w-3.5 h-3.5" />
              <span className="text-xs font-bold">{rate === 0.9 ? '1×' : '0.6×'}</span>
            </button>

            {/* Rozmiar czcionki */}
            <div className="flex items-center rounded-full border overflow-hidden" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface)' }}>
              <button
                onClick={decreaseFontSize}
                disabled={fontSizeIndex === 0}
                title="Mniejsza czcionka"
                className="nav-icon-btn rounded-none border-0 disabled:opacity-30"
                style={{ width: 30, height: 30, fontSize: 11 }}
              >
                A<sup style={{ fontSize: 7 }}>−</sup>
              </button>
              <div className="w-px h-4 shrink-0" style={{ background: 'var(--c-border)' }} />
              <button
                onClick={increaseFontSize}
                disabled={fontSizeIndex === 4}
                title="Większa czcionka"
                className="nav-icon-btn rounded-none border-0 disabled:opacity-30"
                style={{ width: 30, height: 30, fontSize: 13 }}
              >
                A<sup style={{ fontSize: 8 }}>+</sup>
              </button>
            </div>

            {/* Język */}
            <button
              onClick={toggleGlobal}
              className="nav-icon-btn font-bold text-xs"
              style={{ background: 'var(--c-text)', color: theme === 'dark' ? '#13151b' : '#fff', width: 'auto', padding: '0 10px', gap: 4 }}
            >
              <LanguageIcon className="w-3.5 h-3.5 shrink-0" />
              <span>{l === 'pl' ? 'PL' : l === 'en' ? 'EN' : 'IT'}</span>
              <LangFlag lang={l} size={14} />
            </button>

            {/* Motyw */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Tryb jasny' : 'Tryb ciemny'}
              className="nav-icon-btn"
            >
              {theme === 'dark'
                ? <SunIcon className="w-4 h-4 theme-icon-enter" />
                : <MoonIcon className="w-4 h-4 theme-icon-enter" />
              }
            </button>

            {/* Ulubione */}
            <button
              onClick={handleToggleFav}
              title={isFav ? t3('Usuń z ulubionych', 'Rimuovi dai preferiti', 'Remove from favourites') : t3('Dodaj do ulubionych', 'Aggiungi ai preferiti', 'Add to favourites')}
              className={`nav-icon-btn ${isFav ? 'fav-active' : ''}`}
            >
              {isFav ? <StarSolidIcon className="w-4 h-4" style={{ color: '#f59e0b' }} /> : <StarIcon className="w-4 h-4" />}
            </button>

            {/* Quiz */}
            <button
              onClick={() => setShowQuiz(true)}
              title={t3('Quiz słownictwa', 'Quiz vocabolario', 'Vocabulary quiz') + ' [Q]'}
              className="nav-icon-btn hidden sm:flex"
              style={{ background: 'var(--c-green-dim)', color: 'var(--c-green)', borderColor: 'rgba(0,140,69,.2)', width: 'auto', padding: '0 10px', gap: 4 }}
            >
              <TrophyIcon className="w-3.5 h-3.5" />
              <span className="text-xs font-bold">Quiz</span>
            </button>

            {/* Klucz API */}
            {onChangeKey && (
              <button
                onClick={onChangeKey}
                title={L.apiKey}
                className="nav-icon-btn"
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
              {NAV_ITEMS.map(({ id, pl, it, en, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className={`nav-btn ${activeSection === id ? 'active' : ''}`}
                >
                  <Icon />
                  {l === 'pl' ? pl : isEn ? en : it}
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
                    <span>{t3('uruchom quiz', 'avvia quiz', 'start quiz')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px]" style={{ color: 'var(--c-faint)' }}>
                    <span className="kbd">Esc</span>
                    <span>{t3('wróć do biblioteki', 'torna alla biblioteca', 'back to library')}</span>
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
                    {new Date(lesson.timestamp).toLocaleDateString(l === 'pl' ? 'pl-PL' : l === 'en' ? 'en-GB' : 'it-IT')}
                  </span>
                </div>

                <div className="max-w-2xl mx-auto text-left space-y-2">
                  <p className="text-base leading-relaxed font-light text-justify-block" style={{ color: 'var(--c-muted)' }}>
                    <B content={lesson.introduction} />
                  </p>
                  <SpeakBtn
                    italianText={tl(lesson.introduction)}
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
                title={t3('Słownictwo i szczegóły', 'Lessico & Dettagli', 'Vocabulary & Details')}
                subtitle={t3('Kliknij ▼ by rozwinąć etymologię, synonimy i rodzinę', 'Clicca ▼ per etimologia, sinonimi e famiglia', 'Click ▼ for etymology, synonyms and word family')}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {lesson.vocabulary.map((item, i) => (
                  <VocabCard key={i} item={item} cardId={`vocab-${i}`}
                    speak={speak} stop={stop} speakId={speakId} />
                ))}
                {Array.from({ length: Math.max(0, 15 - lesson.vocabulary.length) }).map((_, i) => (
                  <VocabCardSkeleton key={`skel-${i}`} index={lesson.vocabulary.length + i} />
                ))}
              </div>
            </section>

            {/* ═══ DEEP DIVE ═══════════════════════════════════════════════ */}
            {lesson.deep_dive && (
              <section>
                <div className="card overflow-hidden">
                  <div className="px-6 py-4 border-b flex items-center gap-2"
                    style={{ background: 'var(--c-bg)', borderColor: 'var(--c-border)' }}>
                    <BookOpenIcon className="w-4 h-4 shrink-0" style={{ color: 'var(--c-green)' }} />
                    <h2 className="text-base font-serif font-bold" style={{ color: 'var(--c-text)' }}>
                      {lesson.deep_dive_title
                        ? <B content={lesson.deep_dive_title} />
                        : t3('Analiza', 'Analisi', 'Analysis')}
                    </h2>
                  </div>
                  <div className="p-6 space-y-3">
                    <p className="text-sm leading-relaxed text-justify-block" style={{ color: 'var(--c-muted)' }}>
                      <B content={lesson.deep_dive} />
                    </p>
                    <SpeakBtn
                      italianText={tl(lesson.deep_dive)}
                      id="deep-dive-text"
                      speak={speak} stop={stop} speakId={speakId}
                      label={L.listenCulture}
                    />
                  </div>
                </div>
              </section>
            )}

            {/* ═══ GRAMATYKA ═══════════════════════════════════════════════ */}
            <section>
              <SectionHeading
                id="grammar"
                icon={AcademicCapIcon}
                title={t3('Focus gramatyczny', 'Focus Grammaticale', 'Grammar Focus')}
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
                      <p className="text-sm leading-relaxed text-justify-block" style={{ color: 'var(--c-muted)' }}>
                        <B content={g.explanation} />
                      </p>
                      <div className="space-y-1.5">
                        <p className="micro-label">{L.examples}</p>
                        {g.examples.map((ex, j) => (
                          <div key={j} className="flex gap-2 items-start p-2.5 rounded-lg"
                            style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border-soft)' }}>
                            <SpeakBtn
                              italianText={tl(ex)}
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
                title={t3('Przydatne zwroty', 'Frasi Utili', 'Useful Phrases')}
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
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border"
                            style={REGISTER_STYLE[ph.register]}>
                            {REG_LABEL[ph.register]?.[l === 'pl' ? 'pl' : 'it'] ?? ph.register}
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
                title={t3('Uwaga na błędy', 'Attenzione agli Errori', 'Watch Out for Mistakes')}
                subtitle={t3('Pułapki dla Polaków uczących się', 'Trappole per chi parla polacco', 'Common traps for Polish speakers')}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {lesson.common_mistakes.map((m, i) => {
                  const cat = m.category;
                  return (
                    <div key={i} className="card overflow-hidden">
                      <div className="px-3 py-1.5" style={{ background: MISTAKE_BG[cat] }}>
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: MISTAKE_TEXT[cat] }}>
                          {MISTAKE_LABEL[cat]?.[l === 'pl' ? 'pl' : 'it'] ?? cat}
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
                        <p className="text-xs leading-relaxed text-justify-block" style={{ color: 'var(--c-muted)' }}>
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
                  title={lesson.mini_story.title
                    ? (l === 'pl' ? lesson.mini_story.title.pl : tl(lesson.mini_story.title))
                    : t3('Opowiadanie', 'Racconto', 'Story')}
                />
                <div className="card overflow-hidden relative">
                  <div className="absolute top-4 left-4 text-7xl font-serif leading-none select-none pointer-events-none"
                    style={{ color: 'var(--c-border-soft)' }}>"</div>
                  <div className="relative p-6 md:p-8">
                    <div className="prose prose-slate max-w-none text-base font-light leading-relaxed text-justify-block" style={{ color: 'var(--c-muted)' }}>
                      <B content={lesson.mini_story.text} as="p" />
                    </div>
                    <div className="mt-3">
                      <SpeakBtn
                        italianText={tl(lesson.mini_story.text)}
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

            {/* ═══ ZAMKNIĘCIE / REFLEKSJA ══════════════════════════════════ */}
            {lesson.closing_reflection && (
              <section>
                <div className="card overflow-hidden relative">
                  <div className="absolute top-4 left-4 text-7xl font-serif leading-none select-none pointer-events-none"
                    style={{ color: 'var(--c-border-soft)', zIndex: 0 }}>✦</div>
                  <div className="relative p-6 md:p-8 space-y-3" style={{ zIndex: 1 }}>
                    <div className="flex items-center gap-2 mb-1">
                      <SparklesIcon className="w-4 h-4 shrink-0" style={{ color: 'var(--c-green)' }} />
                      <h2 className="text-base font-serif font-bold" style={{ color: 'var(--c-text)' }}>
                        {lesson.closing_reflection_title
                          ? <B content={lesson.closing_reflection_title} />
                          : t3('Synteza', 'Sintesi', 'Synthesis')}
                      </h2>
                    </div>
                    <p className="text-sm leading-relaxed text-justify-block font-light" style={{ color: 'var(--c-muted)' }}>
                      <B content={lesson.closing_reflection} />
                    </p>
                    <SpeakBtn
                      italianText={tl(lesson.closing_reflection)}
                      id="closing-reflection-text"
                      speak={speak} stop={stop} speakId={speakId}
                      label={t3('Odsłuchaj', 'Ascolta', 'Listen')}
                    />
                  </div>
                </div>
              </section>
            )}

            {/* ═══ DIALOG ══════════════════════════════════════════════════ */}
            <section>
              <SectionHeading
                id="dialogue"
                icon={LanguageIcon}
                title={t3('Dialog w kontekście', 'Dialogo in Contesto', 'Dialogue in Context')}
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
                    italianText={lesson.dialogue.lines.map(lin => tl(lin.text)).join('. ')}
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
                              onClick={() => speak(tl(line.text), `line-${i}`)}
                              title={t3('Kliknij by odsłuchać', 'Clicca per ascoltare', 'Click to listen')}
                            >
                              <B content={line.text} />
                            </p>
                            <div className={`mt-1 flex ${isRight ? 'justify-end' : 'justify-start'}`}>
                              <SpeakBtn
                                italianText={tl(line.text)}
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
                title={t3('Kultura i społeczeństwo', 'Cultura & Società', 'Culture & Society')}
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
                    <div className="prose prose-slate max-w-none text-sm leading-relaxed text-justify-block" style={{ color: 'var(--c-muted)' }}>
                      <B content={lesson.culture.content} as="p" />
                    </div>
                    <SpeakBtn
                      italianText={tl(lesson.culture.content)}
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
                        <p className="text-xs leading-relaxed text-justify-block" style={{ color: 'var(--c-muted)' }}>
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
                title={t3('Językowe perełki', 'Perle della Lingua', 'Language Gems')}
                subtitle={t3('Przysłowie i idiom', 'Proverbio e modo di dire', 'Proverb and idiom')}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {lesson.proverb && (
                  <div className="proverb-card card overflow-hidden relative"
                    style={{ background: 'linear-gradient(135deg,#fffbeb 0%,#fff 100%)' }}>
                    <div className="p-5 space-y-3">
                      <div className="flex items-center gap-2" style={{ color: '#92400e' }}>
                        <span className="text-base">📜</span>
                        <span className="micro-label" style={{ color: '#b45309' }}>
                          {t3('Przysłowie', 'Proverbio italiano', 'Proverb')}
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
                          <p className="text-xs italic text-justify-block" style={{ color: 'var(--c-muted)' }}><B content={lesson.proverb.meaning} /></p>
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
                          {t3('Idiom', 'Modo di dire', 'Idiom')}
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
                          <p className="text-sm text-white font-medium text-justify-block"><B content={lesson.idiom.meaning} /></p>
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
                              italianText={tl(lesson.idiom.example_sentence)}
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
