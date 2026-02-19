import React, { useState, useEffect, useRef, useCallback, FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { generateLesson, generateEnglishLesson, loadModels, getSavedModel, saveModel, ORModel } from './services/geminiService';
import { LessonView, getFavorites, toggleFavorite } from './components/LessonView';
import { LangProvider, useLang, useTheme, useFontSize } from './context/LangContext';
import { Flag, LangFlag } from './components/Flag';
import { Lesson, TargetLang } from './types';
import {
  SparklesIcon,
  TrashIcon,
  BookOpenIcon,
  PlusIcon,
  KeyIcon,
  XMarkIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  CpuChipIcon,
  StarIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/solid';
import { LanguageIcon, SunIcon, MoonIcon, ArrowPathIcon, StarIcon as StarOutlineIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

// ─── Queue types ──────────────────────────────────────────────────────────────

type QueueStatus = 'pending' | 'running' | 'done' | 'error';

interface QueueItem {
  qid: string;       // unique queue id
  topic: string;
  status: QueueStatus;
  lessonId?: string; // set when done
  error?: string;
  startedAt?: number;
}

const API_KEY_STORAGE = 'openrouter_api_key';
const HISTORY_KEY    = 'italian_app_history'; // localStorage fallback key
const APP_MODE_KEY   = 'app_mode'; // 'it' | 'en'

// ─── History persistence: osobne pliki ───────────────────────────────────────

async function loadHistory(): Promise<Lesson[]> {
  try {
    const res = await fetch('/api/history');
    if (!res.ok) throw new Error('api');
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) return data;
    // Migracja ze starego localStorage (jednorazowa)
    const local = localStorage.getItem(HISTORY_KEY);
    if (local) {
      const parsed = JSON.parse(local) as Lesson[];
      if (parsed.length > 0) {
        // zapisz każdą lekcję jako osobny plik
        await Promise.all(parsed.map(l => saveLesson(l)));
        localStorage.removeItem(HISTORY_KEY);
        return parsed;
      }
    }
    return [];
  } catch {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
    catch { return []; }
  }
}

async function saveLesson(lesson: Lesson): Promise<void> {
  try {
    await fetch(`/api/history/${lesson.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lesson),
    });
  } catch {
    // fallback: zapisz cały array do localStorage
    const existing: Lesson[] = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    const updated = [lesson, ...existing.filter(l => l.id !== lesson.id)];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  }
}

async function deleteLesson(id: string): Promise<void> {
  try {
    await fetch(`/api/history/${id}`, { method: 'DELETE' });
  } catch {
    const existing: Lesson[] = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    localStorage.setItem(HISTORY_KEY, JSON.stringify(existing.filter(l => l.id !== id)));
  }
}

// ─── Difficulty ───────────────────────────────────────────────────────────────

const DIFF_GRADIENT: Record<string, string> = {
  A1: 'from-emerald-400 to-emerald-600',
  A2: 'from-teal-400 to-teal-600',
  B1: 'from-sky-400 to-blue-600',
  B2: 'from-indigo-400 to-indigo-600',
  C1: 'from-violet-500 to-purple-700',
};

const DIFF_LABELS: Record<string, { pl: string; it: string; en: string }> = {
  A1: { pl: 'Początkujący',        it: 'Principiante',    en: 'Beginner' },
  A2: { pl: 'Elementarny',         it: 'Elementare',      en: 'Elementary' },
  B1: { pl: 'Średniozaawansowany', it: 'Intermedio',      en: 'Intermediate' },
  B2: { pl: 'Wyższy średni',       it: 'Intermedio sup.', en: 'Upper-Intermediate' },
  C1: { pl: 'Zaawansowany',        it: 'Avanzato',        en: 'Advanced' },
};

// ─── ModelPicker ──────────────────────────────────────────────────────────────

const ModelPicker: React.FC<{
  apiKey: string;
  activeModel: string;
  onChange: (modelId: string) => void;
  lang: 'it' | 'pl' | 'en';
}> = ({ apiKey, activeModel, onChange, lang }) => {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<ORModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // Zamknij po kliknięciu poza
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const openPicker = async () => {
    setOpen(o => !o);
    if (models.length > 0) return;
    setLoading(true);
    setError('');
    try {
      const list = await loadModels(apiKey);
      // sortuj: darmowe/popularne najpierw (po nazwie)
      setModels(list.sort((a, b) => a.id.localeCompare(b.id)));
    } catch {
      setError(lang === 'it' ? 'Impossibile caricare i modelli.' : lang === 'en' ? 'Could not load models.' : 'Nie udało się załadować modeli.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = query.trim()
    ? models.filter(m =>
        m.id.toLowerCase().includes(query.toLowerCase()) ||
        m.name.toLowerCase().includes(query.toLowerCase())
      )
    : models;

  const shortName = (id: string) => id.split('/').pop() ?? id;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={openPicker}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 border"
        style={{
          background: 'var(--c-surface)',
          borderColor: 'var(--c-border)',
          color: 'var(--c-text)',
          maxWidth: '180px',
        }}
        title={activeModel}
      >
        <CpuChipIcon className="w-3 h-3 shrink-0" style={{ color: 'var(--c-green)' }} />
        <span className="truncate">{shortName(activeModel)}</span>
        <ChevronDownIcon className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 z-50 rounded-xl shadow-2xl overflow-hidden animate-fade-in"
          style={{
            width: '320px',
            background: 'var(--c-surface)',
            border: '1px solid var(--c-border)',
          }}
        >
          {/* Wyszukiwarka */}
          <div className="p-2 border-b" style={{ borderColor: 'var(--c-border)' }}>
            <div className="relative">
              <MagnifyingGlassIcon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-faint)' }} />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={lang === 'it' ? 'Cerca modello…' : lang === 'en' ? 'Search model…' : 'Szukaj modelu…'}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg outline-none"
                style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}
              />
            </div>
          </div>

          {/* Lista */}
          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
            {loading && (
              <div className="flex items-center justify-center gap-2 py-6 text-xs" style={{ color: 'var(--c-muted)' }}>
                <SparklesIcon className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--c-green)' }} />
                {lang === 'it' ? 'Caricamento…' : 'Ładowanie…'}
              </div>
            )}
            {error && (
              <p className="text-xs text-center py-4 px-3" style={{ color: 'var(--c-red)' }}>{error}</p>
            )}
            {!loading && !error && filtered.length === 0 && (
              <p className="text-xs text-center py-4" style={{ color: 'var(--c-faint)' }}>
                {lang === 'it' ? 'Nessun risultato.' : lang === 'en' ? 'No results.' : 'Brak wyników.'}
              </p>
            )}
            {!loading && filtered.map(m => {
              const isActive = m.id === activeModel;
              const isFree = m.id.endsWith(':free');
              return (
                <button
                  key={m.id}
                  onClick={() => { onChange(m.id); setOpen(false); setQuery(''); }}
                  className="w-full text-left px-3 py-2.5 transition-colors"
                  style={{
                    background: isActive ? 'var(--c-green-dim)' : 'transparent',
                    borderBottom: '1px solid var(--c-border-soft)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold truncate flex-1" style={{ color: isActive ? 'var(--c-green)' : 'var(--c-text)' }}>
                      {m.name || m.id}
                    </span>
                    {isFree && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: '#d1fae5', color: '#065f46' }}>FREE</span>
                    )}
                    {isActive && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: 'var(--c-green)', color: '#fff' }}>✓</span>
                    )}
                  </div>
                  <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--c-faint)' }}>{m.id}</p>
                  {m.context_length && (
                    <p className="text-[10px]" style={{ color: 'var(--c-faint)' }}>
                      ctx: {m.context_length.toLocaleString()}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── ApiKeySetup ──────────────────────────────────────────────────────────────

const ApiKeySetup: React.FC<{ onSave: (key: string) => void }> = ({ onSave }) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed.startsWith('sk-or-')) {
      setError('Klucz powinien zaczynać się od "sk-or-". Sprawdź czy skopiowałeś go poprawnie.');
      return;
    }
    onSave(trimmed);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--c-bg)', color: 'var(--c-text)' }}>
      <div className="card p-8 max-w-sm w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="flex gap-1.5 justify-center mb-3">
            <div className="w-3 h-3 rounded-full" style={{ background: 'var(--c-green)' }} />
            <div className="w-3 h-3 rounded-full border" style={{ borderColor: 'var(--c-border)' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: 'var(--c-red)' }} />
          </div>
          <h1 className="text-2xl font-serif font-bold" style={{ color: 'var(--c-text)' }}>Włoski Mistrz AI</h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--c-muted)' }}>
            Podaj klucz API OpenRouter. Dane pozostają wyłącznie w Twojej przeglądarce.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="micro-label block mb-1.5">Klucz API OpenRouter</label>
            <input
              type="password"
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(''); }}
              placeholder="sk-or-v1-..."
              className="w-full px-3 py-2 rounded-lg font-mono text-sm outline-none transition"
              style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}
              autoFocus
            />
            {error && <p className="mt-1.5 text-xs" style={{ color: 'var(--c-red)' }}>{error}</p>}
          </div>
          <button
            type="submit"
            disabled={!value.trim()}
            className="w-full py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-40"
            style={{ background: 'var(--c-text)', color: '#fff' }}
          >
            Zapisz i kontynuuj →
          </button>
        </form>
        <p className="text-xs text-center" style={{ color: 'var(--c-faint)' }}>
          Klucz bezpłatnie na{' '}
          <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer"
            className="underline" style={{ color: 'var(--c-green)' }}>
            openrouter.ai/keys
          </a>
        </p>
      </div>
    </div>
  );
};

// ─── Lesson Card ──────────────────────────────────────────────────────────────

const LessonCard: React.FC<{
  lesson: Lesson;
  lang: 'it' | 'pl' | 'en';
  onOpen: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isFav: boolean;
  onToggleFav: (e: React.MouseEvent) => void;
}> = ({ lesson, lang, onOpen, onDelete, isFav, onToggleFav }) => {
  const tl = lesson.targetLang ?? 'it';
  const gradient = DIFF_GRADIENT[lesson.difficulty_level] ?? DIFF_GRADIENT.B1;
  const diffLabels = DIFF_LABELS[lesson.difficulty_level];
  const diffLabel = diffLabels ? diffLabels[lang === 'pl' ? 'pl' : tl] : lesson.difficulty_level;
  const topicText = lang === 'pl' ? lesson.topic.pl : (tl === 'en' ? lesson.topic.en : lesson.topic.it) ?? lesson.topic.pl;
  const subtitleText = lesson.subtitle ? (lang === 'pl' ? lesson.subtitle.pl : (tl === 'en' ? lesson.subtitle.en : lesson.subtitle.it) ?? lesson.subtitle.pl) : null;
  const introText = lang === 'pl' ? lesson.introduction?.pl : (tl === 'en' ? lesson.introduction?.en : lesson.introduction?.it) ?? lesson.introduction?.pl;

  return (
    <article
      onClick={onOpen}
      className="group card card-hover cursor-pointer overflow-hidden flex flex-col"
    >
      <div className={`relative bg-gradient-to-br ${gradient} p-4 text-white overflow-hidden`}>
        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
        <div className="relative flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{lesson.emoji}</span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                  {lesson.difficulty_level}
                </span>
                <span className="ml-1.5 text-[10px] text-white/70">{diffLabel}</span>
              </div>
            </div>
            <h3 className="text-base font-serif font-bold leading-snug text-white mb-0.5 line-clamp-2">
              {topicText}
            </h3>
            {subtitleText && (
              <p className="text-xs text-white/65 italic line-clamp-1">{subtitleText}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* Favorite */}
            <button
              onClick={onToggleFav}
              className={`p-1.5 rounded-full bg-white/10 hover:bg-white/30 transition-all ${isFav ? 'opacity-100 text-yellow-300' : 'opacity-0 group-hover:opacity-100 text-white/70 hover:text-yellow-300'}`}
              title={isFav ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
            >
              {isFav ? <StarIcon className="w-3 h-3" /> : <StarOutlineIcon className="w-3 h-3" />}
            </button>
            {/* Delete */}
            <button
              onClick={onDelete}
              className="shrink-0 p-1.5 rounded-full bg-white/10 hover:bg-white/30 text-white/60 hover:text-white transition-all opacity-0 group-hover:opacity-100"
              title="Usuń"
            >
              <TrashIcon className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-3">
        {lesson.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {lesson.tags.slice(0, 4).map((tag, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ background: 'var(--c-bg)', color: 'var(--c-muted)', border: '1px solid var(--c-border)' }}>
                #{tag}
              </span>
            ))}
          </div>
        )}
        {introText && (
          <p className="text-xs leading-relaxed line-clamp-3" style={{ color: 'var(--c-muted)' }}>{introText}</p>
        )}
        {lesson.vocabulary?.length > 0 && (
          <div>
            <p className="micro-label mb-1">{lang === 'pl' ? 'Kluczowe słowa' : lang === 'en' ? 'Key words' : 'Parole chiave'}</p>
            <div className="flex flex-wrap gap-1">
              {lesson.vocabulary.slice(0, 3).map((v, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs rounded px-2 py-0.5 font-medium"
                  style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}>
                  <span className="font-serif">{v.word}</span>
                  {v.gender && (
                    <span className={`text-[9px] font-bold ${v.gender === 'm' ? 'text-sky-500' : v.gender === 'f' ? 'text-pink-500' : 'text-slate-400'}`}>
                      {v.gender}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pb-4 pt-2 flex items-center justify-between text-xs"
        style={{ borderTop: '1px solid var(--c-border-soft)', color: 'var(--c-faint)' }}>
        <div className="flex items-center gap-2">
          <span>{new Date(lesson.timestamp).toLocaleDateString('pl-PL')}</span>
          {lesson.estimated_reading_minutes && (
            <span className="flex items-center gap-1">
              <ClockIcon className="w-3 h-3" />
              {lesson.estimated_reading_minutes} min
            </span>
          )}
        </div>
        <span className="font-semibold group-hover:translate-x-1 transition-transform" style={{ color: 'var(--c-green)' }}>
          {lang === 'pl' ? 'Czytaj →' : lang === 'en' ? 'Read →' : 'Leggi →'}
        </span>
      </div>
    </article>
  );
};

// ─── Change API Key Modal ─────────────────────────────────────────────────────

const ChangeKeyModal: React.FC<{ onClose: () => void; onSave: (key: string) => void }> = ({ onClose, onSave }) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const { globalLang: l } = useLang();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed.startsWith('sk-or-')) {
      setError(l === 'pl' ? 'Klucz powinien zaczynać się od "sk-or-".' : l === 'en' ? 'Key must start with "sk-or-".' : 'La chiave deve iniziare con "sk-or-".');
      return;
    }
    onSave(trimmed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(4px)' }}>
      <div className="card p-6 max-w-sm w-full space-y-4 relative animate-fade-in">
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded transition-colors"
          style={{ color: 'var(--c-faint)' }}>
          <XMarkIcon className="w-4 h-4" />
        </button>
        <div>
          <h2 className="font-serif font-bold text-base" style={{ color: 'var(--c-text)' }}>
            {l === 'pl' ? 'Zmień klucz API' : l === 'en' ? 'Change API Key' : 'Cambia chiave API'}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--c-muted)' }}>
            {l === 'pl' ? 'Podaj nowy klucz OpenRouter.' : l === 'en' ? 'Enter a new OpenRouter key.' : 'Inserisci una nuova chiave OpenRouter.'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(''); }}
            placeholder="sk-or-v1-..."
            className="w-full px-3 py-2 rounded-lg font-mono text-sm outline-none transition"
            style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}
            autoFocus
          />
          {error && <p className="text-xs" style={{ color: 'var(--c-red)' }}>{error}</p>}
          <button
            type="submit"
            disabled={!value.trim()}
            className="w-full py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-40"
            style={{ background: 'var(--c-text)', color: '#fff' }}
          >
            {l === 'pl' ? 'Zapisz' : l === 'en' ? 'Save' : 'Salva'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── Inner App ────────────────────────────────────────────────────────────────

const DIFF_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;
const MAX_CONCURRENT = 10;

const AppInner: React.FC<{ apiKey: string; onChangeKey: () => void; onBackToHome: () => void }> = ({ apiKey, onChangeKey, onBackToHome }) => {
  const { globalLang, toggleGlobal, targetLang } = useLang();
  const { theme, toggleTheme } = useTheme();
  const { fontSizeIndex, increaseFontSize, decreaseFontSize } = useFontSize();

  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Lesson[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [search, setSearch] = useState('');
  const [activeModel, setActiveModel] = useState<string>(() => getSavedModel());
  const [diffFilter, setDiffFilter] = useState<string | null>(null);
  const [showFavsOnly, setShowFavsOnly] = useState(false);
  const [favSet, setFavSet] = useState<Set<string>>(() => getFavorites());
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Refs so callbacks always see current values without re-binding
  const apiKeyRef = useRef(apiKey);
  const activeModelRef = useRef(activeModel);
  const targetLangRef = useRef(targetLang);
  useEffect(() => { apiKeyRef.current = apiKey; }, [apiKey]);
  useEffect(() => { activeModelRef.current = activeModel; }, [activeModel]);
  useEffect(() => { targetLangRef.current = targetLang; }, [targetLang]);

  // Wczytaj historię z pliku przy starcie
  useEffect(() => {
    loadHistory().then(h => {
      setHistory(h);
      setHistoryLoaded(true);
    });
  }, []);

  // ── Queue runner ────────────────────────────────────────────────────────────
  // Runs whenever queue changes: starts pending jobs up to MAX_CONCURRENT
  const runQueue = useCallback((q: QueueItem[]) => {
    const running = q.filter(j => j.status === 'running').length;
    const pending = q.filter(j => j.status === 'pending');
    const slots = MAX_CONCURRENT - running;
    if (slots <= 0 || pending.length === 0) return;

    const toStart = pending.slice(0, slots);

    // Mark them as running immediately
    setQueue(prev => prev.map(j =>
      toStart.some(s => s.qid === j.qid)
        ? { ...j, status: 'running', startedAt: Date.now() }
        : j
    ));

    // Fire off each one
    toStart.forEach(job => {
      const genFn = targetLangRef.current === 'en' ? generateEnglishLesson : generateLesson;
      genFn(job.topic, apiKeyRef.current, activeModelRef.current)
        .then(async lesson => {
          await saveLesson(lesson);
          setHistory(prev => [lesson, ...prev]);
          setQueue(prev => {
            const next = prev.map(j =>
              j.qid === job.qid ? { ...j, status: 'done' as QueueStatus, lessonId: lesson.id } : j
            );
            // trigger next pending after state settles
            setTimeout(() => setQueue(q2 => { runQueue(q2); return q2; }), 0);
            return next;
          });
        })
        .catch(err => {
          setQueue(prev => {
            const next = prev.map(j =>
              j.qid === job.qid
                ? { ...j, status: 'error' as QueueStatus, error: err?.message ?? 'Błąd generowania' }
                : j
            );
            setTimeout(() => setQueue(q2 => { runQueue(q2); return q2; }), 0);
            return next;
          });
        });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Kick off runner when queue changes (only for pending/running items)
  const prevQueueRef = useRef<QueueItem[]>([]);
  useEffect(() => {
    const hadPending = prevQueueRef.current.some(j => j.status === 'pending');
    const hasPending = queue.some(j => j.status === 'pending');
    const hasRunning = queue.some(j => j.status === 'running');
    if (hasPending || (hasRunning && hadPending)) {
      runQueue(queue);
    }
    prevQueueRef.current = queue;
  }, [queue, runQueue]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    if (activeLesson) return;
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.key === '/') { e.preventDefault(); searchInputRef.current?.focus(); }
      if ((e.key === 'r' || e.key === 'R') && history.length > 0) {
        const rand = history[Math.floor(Math.random() * history.length)];
        setActiveLesson(rand);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [activeLesson, history]);

  // ── Enqueue topic ───────────────────────────────────────────────────────────
  const enqueueTopics = () => {
    const topics = input.split('\n').map(t => t.trim()).filter(Boolean);
    if (topics.length === 0) return;
    const newItems: QueueItem[] = topics.map(topic => ({
      qid: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      topic,
      status: 'pending',
    }));
    setQueue(prev => {
      const next = [...prev, ...newItems];
      setTimeout(() => setQueue(q2 => { runQueue(q2); return q2; }), 0);
      return next;
    });
    setInput('');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    enqueueTopics();
  };

  const removeQueueItem = (qid: string) => {
    setQueue(prev => prev.filter(j => j.qid !== qid || j.status === 'running'));
  };

  const retryQueueItem = (qid: string) => {
    setQueue(prev => {
      const next = prev.map(j =>
        j.qid === qid && j.status === 'error'
          ? { ...j, status: 'pending' as QueueStatus, error: undefined, startedAt: undefined }
          : j
      );
      setTimeout(() => setQueue(q2 => { runQueue(q2); return q2; }), 0);
      return next;
    });
  };

  const clearFinished = () => {
    setQueue(prev => prev.filter(j => j.status === 'pending' || j.status === 'running'));
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteLesson(id);
    setHistory(prev => prev.filter(lesson => lesson.id !== id));
    if (activeLesson?.id === id) setActiveLesson(null);
  };

  const handleToggleFav = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    toggleFavorite(id);
    setFavSet(getFavorites());
  };

  const handleModelChange = (modelId: string) => {
    setActiveModel(modelId);
    saveModel(modelId);
  };

  const filteredHistory = history
    .filter(l => (l.targetLang ?? 'it') === targetLang)
    .filter(lesson => {
      if (diffFilter && lesson.difficulty_level !== diffFilter) return false;
      if (showFavsOnly && !favSet.has(lesson.id)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          lesson.topic.pl.toLowerCase().includes(q) ||
          (lesson.topic.it ?? '').toLowerCase().includes(q) ||
          (lesson.topic.en ?? '').toLowerCase().includes(q) ||
          lesson.tags?.some(t => t.toLowerCase().includes(q))
        );
      }
      return true;
    });

  if (activeLesson) {
    return (
      <LessonView
        lesson={activeLesson}
        onBack={() => setActiveLesson(null)}
        onChangeKey={onChangeKey}
      />
    );
  }

  const l = globalLang;
  const isIt = targetLang === 'it';
  const isEn = targetLang === 'en';
  const L = {
    appName:      l === 'pl' ? (isIt ? 'Włoski Mistrz AI' : 'Angielski Mistrz AI') : isEn ? 'English Master AI' : 'Maestro Italiano AI',
    headline:     l === 'pl' ? 'O czym chcesz dzisiaj poczytać?' : isEn ? 'What do you want to read about today?' : 'Di cosa vuoi leggere oggi?',
    subtitle:     l === 'pl' ? 'Twórz artykuły, lekcje i opracowania kulturowe z AI.' : isEn ? 'Create articles, lessons and cultural insights with AI.' : "Crea articoli, lezioni e approfondimenti culturali con l'AI.",
    placeholder:  l === 'pl' ? 'Temat… (kilka linii = kilka artykułów równolegle)' : isEn ? 'Topic… (multiple lines = parallel articles)' : 'Argomento… (più righe = più articoli in parallelo)',
    generating:   l === 'pl' ? 'Generowanie — to może chwilę zająć…' : isEn ? 'Generating — this may take a moment…' : 'Generazione in corso…',
    yourArticles: l === 'pl' ? 'Twoje artykuły' : isEn ? 'Your articles' : 'I tuoi articoli',
    search:       l === 'pl' ? 'Szukaj…' : isEn ? 'Search…' : 'Cerca…',
    noArticles:   l === 'pl' ? 'Brak artykułów. Stwórz swój pierwszy!' : isEn ? 'No articles yet. Create your first!' : 'Nessun articolo. Crea il tuo primo!',
    noArticlesSub:l === 'pl' ? (isIt ? 'Np. "Pizza", "Rzym" lub "Wenecja"' : 'Np. "greetings", "food" lub "British culture"') : isEn ? 'E.g. "Greetings", "Food" or "British culture"' : 'Es. "Pizza", "Roma" o "Venezia"',
    noResults:    (q: string) => l === 'pl' ? `Brak wyników dla "${q}"` : isEn ? `No results for "${q}"` : `Nessun risultato per "${q}"`,
    langToggle:   l === 'pl' ? 'Zmień język' : isEn ? 'Change language' : 'Cambia lingua',
    apiKey:       l === 'pl' ? 'Zmień klucz API' : isEn ? 'Change API key' : 'Cambia chiave API',
    backToHome:   l === 'pl' ? 'Zmień tryb' : isEn ? 'Change mode' : 'Cambia modalità',
  };

  return (
    <div className="min-h-screen font-sans" style={{ background: 'var(--c-bg)', color: 'var(--c-text)' }}>
      {/* Navbar */}
      <nav className="glass-nav sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-4 h-12 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onBackToHome}
              title={L.backToHome}
              className="nav-icon-btn"
            >
              <ArrowLeftIcon className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setActiveLesson(null)}>
              <Flag code={targetLang} size={16} aria-hidden="true" />
              <span className="font-serif font-bold text-lg tracking-tight hidden sm:inline" style={{ color: 'var(--c-text)' }}>
                {L.appName}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <ModelPicker
              apiKey={apiKey}
              activeModel={activeModel}
              onChange={handleModelChange}
              lang={l}
            />
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
              title={L.langToggle}
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
            {/* Klucz API */}
            <button
              onClick={onChangeKey}
              title={L.apiKey}
              className="nav-icon-btn"
            >
              <KeyIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="px-4 py-8">
        <div className="max-w-screen-2xl mx-auto space-y-10">

          {/* Hero */}
          <div className="text-center space-y-5 py-4 md:py-8">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-5xl font-serif font-bold tracking-tight leading-tight">
                <span className="hero-gradient">{L.headline}</span>
              </h1>
              <p className="text-sm font-light max-w-md mx-auto" style={{ color: 'var(--c-muted)' }}>
                {L.subtitle}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="relative max-w-lg mx-auto w-full group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-xl blur opacity-15 group-hover:opacity-30 transition duration-500" />
              <div className="relative rounded-xl shadow-lg" style={{ background: 'var(--c-surface)' }}>
                <textarea
                  rows={Math.min(Math.max(input.split('\n').length, 2), 8)}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter → submit; Shift+Enter → nowa linia (domyślnie)
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enqueueTopics(); }
                  }}
                  placeholder={L.placeholder}
                  className="w-full px-4 py-3.5 pr-14 rounded-xl bg-transparent border-0 focus:ring-0 text-sm outline-none resize-none leading-relaxed"
                  style={{ color: 'var(--c-text)', minHeight: 52 }}
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="absolute right-2 bottom-2 p-2 rounded-lg transition-all active:scale-95 disabled:opacity-40"
                  style={{ background: 'var(--c-text)', color: '#fff' }}
                  title={l === 'pl' ? 'Dodaj do kolejki (Enter)' : l === 'en' ? 'Add to queue (Enter)' : 'Aggiungi alla coda (Enter)'}
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-1.5 text-[10px] text-center" style={{ color: 'var(--c-faint)' }}>
                {input.split('\n').filter(t => t.trim()).length > 1
                  ? (l === 'pl'
                    ? `${input.split('\n').filter(t => t.trim()).length} tematów — Enter by dodać wszystkie`
                    : l === 'en'
                    ? `${input.split('\n').filter(t => t.trim()).length} topics — Enter to add all`
                    : `${input.split('\n').filter(t => t.trim()).length} argomenti — Enter per aggiungere tutti`)
                  : (l === 'pl' ? 'Enter by dodać · Shift+Enter = nowa linia · kilka linii = równolegle'
                    : l === 'en' ? 'Enter to add · Shift+Enter = new line · multiple lines = parallel'
                    : 'Enter per aggiungere · Shift+Enter = nuova riga · più righe = parallelo')
                }
              </p>
            </form>

            {/* ── Queue panel ─────────────────────────────────────────── */}
            {queue.length > 0 && (
              <div className="max-w-lg mx-auto w-full space-y-1 animate-fade-in">
                <div className="flex items-center justify-between px-1 mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-faint)' }}>
                    {l === 'pl' ? 'Kolejka generowania' : l === 'en' ? 'Generation queue' : 'Coda generazione'}
                    {queue.filter(j => j.status === 'running').length > 0 && (
                      <span className="ml-1 normal-case font-normal">
                        — {queue.filter(j => j.status === 'running').length} {l === 'pl' ? 'w toku' : l === 'en' ? 'running' : 'in corso'}
                        {queue.filter(j => j.status === 'pending').length > 0 && `, ${queue.filter(j => j.status === 'pending').length} ${l === 'pl' ? 'czeka' : l === 'en' ? 'waiting' : 'in attesa'}`}
                      </span>
                    )}
                  </span>
                  {queue.some(j => j.status === 'done' || j.status === 'error') && (
                    <button onClick={clearFinished} className="text-[10px] underline" style={{ color: 'var(--c-faint)' }}>
                      {l === 'pl' ? 'Wyczyść zakończone' : l === 'en' ? 'Clear finished' : 'Pulisci'}
                    </button>
                  )}
                </div>
                {queue.map(job => (
                  <div key={job.qid}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs animate-fade-in"
                    style={{
                      background: job.status === 'done'
                        ? 'var(--c-green-dim)'
                        : job.status === 'error'
                          ? 'rgba(205,33,42,.08)'
                          : 'var(--c-surface)',
                      border: `1px solid ${
                        job.status === 'done'
                          ? 'rgba(0,140,69,.2)'
                          : job.status === 'error'
                            ? 'rgba(205,33,42,.2)'
                            : 'var(--c-border)'
                      }`,
                    }}
                  >
                    {/* Status icon */}
                    <span className="shrink-0">
                      {job.status === 'running' && <SparklesIcon className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--c-green)' }} />}
                      {job.status === 'pending' && <ClockIcon className="w-3.5 h-3.5" style={{ color: 'var(--c-faint)' }} />}
                      {job.status === 'done'    && <CheckCircleIcon className="w-3.5 h-3.5" style={{ color: 'var(--c-green)' }} />}
                      {job.status === 'error'   && <ExclamationCircleIcon className="w-3.5 h-3.5" style={{ color: 'var(--c-red)' }} />}
                    </span>

                    {/* Topic */}
                    <span className="flex-1 font-medium truncate" style={{ color: 'var(--c-text)' }}>
                      {job.topic}
                    </span>
                    {job.status === 'error' && job.error && (
                      <span className="truncate max-w-[120px] text-[9px]" style={{ color: 'var(--c-red)' }} title={job.error}>
                        {job.error.slice(0, 40)}{job.error.length > 40 ? '…' : ''}
                      </span>
                    )}

                    {/* Status label / actions */}
                    <span className="shrink-0 font-medium flex items-center gap-1" style={{
                      color: job.status === 'done' ? 'var(--c-green)'
                        : job.status === 'error' ? 'var(--c-red)'
                        : job.status === 'running' ? 'var(--c-green)'
                        : 'var(--c-faint)'
                    }}>
                      {job.status === 'running' && (l === 'pl' ? 'Generuję…' : l === 'en' ? 'Generating…' : 'Generando…')}
                      {job.status === 'pending' && (l === 'pl' ? 'W kolejce' : l === 'en' ? 'Queued' : 'In attesa')}
                      {job.status === 'done' && (
                        <button
                          onClick={() => {
                            const lesson = history.find(h => h.id === job.lessonId);
                            if (lesson) setActiveLesson(lesson);
                          }}
                          className="underline font-bold"
                          style={{ color: 'var(--c-green)' }}
                        >
                          {l === 'pl' ? 'Otwórz →' : l === 'en' ? 'Open →' : 'Apri →'}
                        </button>
                      )}
                      {job.status === 'error' && (
                        <button
                          onClick={() => retryQueueItem(job.qid)}
                          className="flex items-center gap-0.5 font-bold underline"
                          style={{ color: 'var(--c-red)' }}
                          title={l === 'pl' ? 'Ponów próbę' : l === 'en' ? 'Retry' : 'Riprova'}
                        >
                          <ArrowPathIcon className="w-3 h-3" />
                          {l === 'pl' ? 'Ponów' : l === 'en' ? 'Retry' : 'Riprova'}
                        </button>
                      )}
                    </span>

                    {/* Remove button (not running) */}
                    {job.status !== 'running' && (
                      <button onClick={() => removeQueueItem(job.qid)} className="shrink-0 p-0.5 rounded" style={{ color: 'var(--c-faint)' }}>
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Library */}
          <div className="space-y-4">
            {/* Library header row */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 pb-3"
              style={{ borderBottom: '1px solid var(--c-border)' }}>
              <div className="flex items-center gap-2 flex-wrap">
                <BookOpenIcon className="w-4 h-4" style={{ color: 'var(--c-faint)' }} />
                <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--c-muted)' }}>
                  {L.yourArticles}
                </h2>
                <span className="text-xs" style={{ color: 'var(--c-faint)' }}>
                  ({filteredHistory.length}{filteredHistory.length !== history.filter(l => (l.targetLang ?? 'it') === targetLang).length ? `/${history.filter(l => (l.targetLang ?? 'it') === targetLang).length}` : ''})
                </span>
                {/* Random lesson button */}
                {filteredHistory.length > 1 && (
                  <button
                    onClick={() => { const r = filteredHistory[Math.floor(Math.random() * filteredHistory.length)]; setActiveLesson(r); }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all"
                    style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)', color: 'var(--c-muted)' }}
                    title={(l === 'pl' ? 'Losowa lekcja' : l === 'en' ? 'Random article' : 'Articolo casuale') + ' [R]'}
                  >
                    <ArrowPathIcon className="w-3 h-3" />
                    {l === 'pl' ? 'Losowa' : l === 'en' ? 'Random' : 'Casuale'}
                  </button>
                )}
                {/* Favorites filter */}
                {filteredHistory.length > 0 && favSet.size > 0 && (
                  <button
                    onClick={() => setShowFavsOnly(v => !v)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${showFavsOnly ? 'active' : ''}`}
                    style={showFavsOnly
                      ? { background: 'rgba(245,158,11,.12)', color: '#d97706', border: '1px solid rgba(245,158,11,.35)' }
                      : { background: 'var(--c-bg)', border: '1px solid var(--c-border)', color: 'var(--c-muted)' }
                    }
                    title={l === 'pl' ? 'Tylko ulubione' : l === 'en' ? 'Favourites only' : 'Solo preferiti'}
                  >
                    {showFavsOnly ? <StarIcon className="w-3 h-3" /> : <StarOutlineIcon className="w-3 h-3" />}
                    {l === 'pl' ? 'Ulubione' : l === 'en' ? 'Favourites' : 'Preferiti'}
                  </button>
                )}
              </div>
              <div className="sm:ml-auto flex items-center gap-2 flex-wrap">
                {history.length > 3 && (
                  <div className="relative">
                    <MagnifyingGlassIcon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-faint)' }} />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={L.search + ' [/]'}
                      className="pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none transition w-44"
                      style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Difficulty filter pills */}
            {history.length > 2 && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setDiffFilter(null)}
                  className={`diff-pill ${diffFilter === null ? 'active' : ''}`}
                >
                  {l === 'pl' ? 'Wszystkie' : l === 'en' ? 'All' : 'Tutti'}
                </button>
                {DIFF_LEVELS.filter(d => filteredHistory.some(lesson => lesson.difficulty_level === d)).map(d => (
                  <button
                    key={d}
                    onClick={() => setDiffFilter(prev => prev === d ? null : d)}
                    className={`diff-pill ${diffFilter === d ? 'active' : ''}`}
                  >
                    {d}
                    <span className="ml-1 opacity-70 font-normal text-[9px]">
                      {DIFF_LABELS[d]?.[l === 'pl' ? 'pl' : isEn ? 'en' : 'it'] ?? ''}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {!historyLoaded ? (
              <div className="text-center py-12 text-xs animate-pulse" style={{ color: 'var(--c-faint)' }}>
                <SparklesIcon className="w-4 h-4 mx-auto mb-2" style={{ color: 'var(--c-green)' }} />
                {l === 'pl' ? 'Wczytywanie biblioteki…' : l === 'en' ? 'Loading library…' : 'Caricamento biblioteca…'}
              </div>
            ) : history.filter(les => (les.targetLang ?? 'it') === targetLang).length === 0 ? (
              <div className="text-center py-16 rounded-2xl border-2 border-dashed space-y-1.5"
                style={{ borderColor: 'var(--c-border)', color: 'var(--c-faint)' }}>
                <Flag code={targetLang} size={40} aria-hidden="true" />
                <p className="font-medium text-sm">{L.noArticles}</p>
                <p className="text-xs">{L.noArticlesSub}</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-12 text-sm space-y-1" style={{ color: 'var(--c-faint)' }}>
                {search.trim() ? L.noResults(search) : (l === 'pl' ? 'Brak artykułów spełniających filtry.' : l === 'en' ? 'No articles match the filters.' : 'Nessun articolo corrisponde ai filtri.')}
                {(diffFilter || showFavsOnly) && (
                  <div>
                    <button onClick={() => { setDiffFilter(null); setShowFavsOnly(false); setSearch(''); }}
                      className="text-xs underline mt-1" style={{ color: 'var(--c-green)' }}>
                      {l === 'pl' ? 'Wyczyść filtry' : l === 'en' ? 'Clear filters' : 'Azzera filtri'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredHistory.map((lesson) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    lang={globalLang}
                    onOpen={() => setActiveLesson(lesson)}
                    onDelete={(e) => handleDelete(e, lesson.id)}
                    isFav={favSet.has(lesson.id)}
                    onToggleFav={(e) => handleToggleFav(e, lesson.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="py-5 border-t"
        style={{ color: 'var(--c-faint)', borderColor: 'var(--c-border)', background: 'var(--c-surface-2)' }}>
        <div className="max-w-screen-2xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-xs">
            {L.appName} &copy; 2025 · Powered by OpenRouter
          </span>
          {filteredHistory.length > 0 && (
            <div className="flex items-center gap-2 text-[10px]">
              <span style={{ color: 'var(--c-faint)' }}>{l === 'pl' ? 'Skróty:' : l === 'en' ? 'Shortcuts:' : 'Scorciatoie:'}</span>
              <span className="kbd">/</span><span>{l === 'pl' ? 'szukaj' : l === 'en' ? 'search' : 'cerca'}</span>
              <span className="kbd">R</span><span>{l === 'pl' ? 'losowa' : l === 'en' ? 'random' : 'casuale'}</span>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};

// ─── Home Screen ──────────────────────────────────────────────────────────────

const HomeScreen: React.FC<{ onSelect: (lang: TargetLang) => void }> = ({ onSelect }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-10"
      style={{ background: 'var(--c-bg)', color: 'var(--c-text)' }}>
      <div className="text-center space-y-3">
        <div className="flex gap-1.5 justify-center mb-2">
          <div className="w-3 h-3 rounded-full" style={{ background: 'var(--c-green)' }} />
          <div className="w-3 h-3 rounded-full border" style={{ borderColor: 'var(--c-border)' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: 'var(--c-red)' }} />
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-bold tracking-tight">
          <span className="hero-gradient">Mistrz AI</span>
        </h1>
        <p className="text-sm" style={{ color: 'var(--c-muted)' }}>
          Wybierz język, którego chcesz się uczyć
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-5 w-full max-w-md">
        {/* Włoski */}
        <button
          onClick={() => onSelect('it')}
          className="flex-1 group card card-hover p-8 flex flex-col items-center gap-4 transition-all"
        >
          <Flag code="it" size={56} />
          <div className="text-center">
            <p className="font-serif font-bold text-xl" style={{ color: 'var(--c-text)' }}>Włoski</p>
            <p className="text-xs mt-1" style={{ color: 'var(--c-muted)' }}>Polsko-włoski</p>
          </div>
          <span className="text-xs font-semibold group-hover:translate-x-1 transition-transform" style={{ color: 'var(--c-green)' }}>
            Wybierz →
          </span>
        </button>

        {/* Angielski */}
        <button
          onClick={() => onSelect('en')}
          className="flex-1 group card card-hover p-8 flex flex-col items-center gap-4 transition-all"
        >
          <Flag code="en" size={56} />
          <div className="text-center">
            <p className="font-serif font-bold text-xl" style={{ color: 'var(--c-text)' }}>Angielski</p>
            <p className="text-xs mt-1" style={{ color: 'var(--c-muted)' }}>Polsko-angielski</p>
          </div>
          <span className="text-xs font-semibold group-hover:translate-x-1 transition-transform" style={{ color: 'var(--c-green)' }}>
            Wybierz →
          </span>
        </button>
      </div>
    </div>
  );
};

// ─── Root App ─────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem(API_KEY_STORAGE) || '');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [targetLang, setTargetLang] = useState<TargetLang | null>(() => {
    const saved = localStorage.getItem(APP_MODE_KEY) as TargetLang | null;
    return saved === 'it' || saved === 'en' ? saved : null;
  });

  const saveApiKey = (key: string) => {
    localStorage.setItem(API_KEY_STORAGE, key);
    setApiKey(key);
  };

  const selectLang = (lang: TargetLang) => {
    localStorage.setItem(APP_MODE_KEY, lang);
    setTargetLang(lang);
  };

  const goHome = () => {
    setTargetLang(null);
    localStorage.removeItem(APP_MODE_KEY);
  };

  if (!apiKey) return <ApiKeySetup onSave={saveApiKey} />;

  if (!targetLang) {
    return (
      <LangProvider targetLang="it">
        <HomeScreen onSelect={selectLang} />
      </LangProvider>
    );
  }

  return (
    <LangProvider targetLang={targetLang}>
      {showKeyModal && (
        <ChangeKeyModal onClose={() => setShowKeyModal(false)} onSave={saveApiKey} />
      )}
      <AppInner apiKey={apiKey} onChangeKey={() => setShowKeyModal(true)} onBackToHome={goHome} />
    </LangProvider>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
