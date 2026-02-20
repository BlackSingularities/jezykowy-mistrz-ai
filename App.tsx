import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { loadModels, getSavedModel, saveModel, ORModel } from './services/geminiService';
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
  targetLang?: 'it' | 'en' | 'fr';
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

const DIFF_LABELS: Record<string, { pl: string; it: string; en: string; fr: string }> = {
  A1: { pl: 'Początkujący',        it: 'Principiante',    en: 'Beginner',           fr: 'Débutant' },
  A2: { pl: 'Elementarny',         it: 'Elementare',      en: 'Elementary',         fr: 'Élémentaire' },
  B1: { pl: 'Średniozaawansowany', it: 'Intermedio',      en: 'Intermediate',       fr: 'Intermédiaire' },
  B2: { pl: 'Wyższy średni',       it: 'Intermedio sup.', en: 'Upper-Intermediate', fr: 'Interm. supérieur' },
  C1: { pl: 'Zaawansowany',        it: 'Avanzato',        en: 'Advanced',           fr: 'Avancé' },
};

// ─── ModelPicker ──────────────────────────────────────────────────────────────

const ModelPicker: React.FC<{
  apiKey: string;
  activeModel: string;
  onChange: (modelId: string) => void;
  lang: 'it' | 'pl' | 'en' | 'fr';
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
      setError(lang === 'it' ? 'Impossibile caricare i modelli.' : lang === 'en' ? 'Could not load models.' : lang === 'fr' ? 'Impossible de charger les modèles.' : 'Nie udało się załadować modeli.');
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
                placeholder={lang === 'it' ? 'Cerca modello…' : lang === 'en' ? 'Search model…' : lang === 'fr' ? 'Rechercher un modèle…' : 'Szukaj modelu…'}
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
                {lang === 'it' ? 'Nessun risultato.' : lang === 'en' ? 'No results.' : lang === 'fr' ? 'Aucun résultat.' : 'Brak wyników.'}
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
          <h1 className="text-2xl font-serif font-bold" style={{ color: 'var(--c-text)' }}>Językowy Mistrz AI</h1>
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
  const getTlText = (b?: { it?: string; en?: string; fr?: string; pl: string }) =>
    b ? (tl === 'en' ? b.en : tl === 'fr' ? b.fr : b.it) ?? b.pl : '';
  const topicText = lang === 'pl' ? lesson.topic.pl : getTlText(lesson.topic);
  const subtitleText = lesson.subtitle ? (lang === 'pl' ? lesson.subtitle.pl : getTlText(lesson.subtitle)) : null;
  const introText = lang === 'pl' ? lesson.introduction?.pl : getTlText(lesson.introduction);

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
            <p className="micro-label mb-1">{lang === 'pl' ? 'Kluczowe słowa' : lang === 'en' ? 'Key words' : lang === 'fr' ? 'Mots clés' : 'Parole chiave'}</p>
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
          {lang === 'pl' ? 'Czytaj →' : lang === 'en' ? 'Read →' : lang === 'fr' ? 'Lire →' : 'Leggi →'}
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
      setError(l === 'pl' ? 'Klucz powinien zaczynać się od "sk-or-".' : l === 'en' ? 'Key must start with "sk-or-".' : l === 'fr' ? 'La clé doit commencer par "sk-or-".' : 'La chiave deve iniziare con "sk-or-".');
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
            {l === 'pl' ? 'Zmień klucz API' : l === 'en' ? 'Change API Key' : l === 'fr' ? 'Changer la clé API' : 'Cambia chiave API'}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--c-muted)' }}>
            {l === 'pl' ? 'Podaj nowy klucz OpenRouter.' : l === 'en' ? 'Enter a new OpenRouter key.' : l === 'fr' ? 'Entrez une nouvelle clé OpenRouter.' : 'Inserisci una nuova chiave OpenRouter.'}
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
            {l === 'pl' ? 'Zapisz' : l === 'en' ? 'Save' : l === 'fr' ? 'Enregistrer' : 'Salva'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── Inner App ────────────────────────────────────────────────────────────────

const DIFF_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;

const AppInner: React.FC<{
  apiKey: string;
  onChangeKey: () => void;
  onBackToHome: () => void;
  onChangeLang: (lang: TargetLang) => void;
}> = ({ apiKey, onChangeKey, onBackToHome, onChangeLang }) => {
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
  const [currentPage, setCurrentPage] = useState(1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const ITEMS_PER_PAGE = 20;

  // Wczytaj historię z pliku przy starcie
  useEffect(() => {
    loadHistory().then(h => {
      setHistory(h);
      setHistoryLoaded(true);
    });
  }, []);

  // ── Server-side job polling ──────────────────────────────────────────────────
  // Track which lesson IDs we've already fetched to avoid re-loading
  const pendingLessonLoads = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!historyLoaded) return;

    // Mark all already-loaded lessons so we don't re-fetch them
    pendingLessonLoads.current = new Set(history.map(l => l.id));

    const poll = async () => {
      try {
        const res = await fetch('/api/jobs');
        if (!res.ok) return;
        const serverJobs: Array<{
          id: string; topic: string; targetLang: string;
          status: string; lessonId?: string; error?: string; createdAt: number;
        }> = await res.json();

        // Sync local queue with server state
        setQueue(serverJobs.map(sj => ({
          qid: sj.id,
          topic: sj.topic,
          status: sj.status as QueueStatus,
          targetLang: sj.targetLang as 'it' | 'en' | 'fr' | undefined,
          lessonId: sj.lessonId,
          error: sj.error,
          startedAt: sj.createdAt,
        })));

        // Load any newly completed lessons not yet in history
        for (const sj of serverJobs) {
          if (sj.status === 'done' && sj.lessonId && !pendingLessonLoads.current.has(sj.lessonId)) {
            pendingLessonLoads.current.add(sj.lessonId);
            fetch(`/api/history/${sj.lessonId}`)
              .then(r => r.ok ? r.json() : null)
              .then(lesson => {
                if (lesson) setHistory(prev => [lesson, ...prev.filter(l => l.id !== lesson.id)]);
              })
              .catch(() => { pendingLessonLoads.current.delete(sj.lessonId!); });
          }
        }
      } catch { /* ignore transient poll errors */ }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [historyLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Enqueue topics via server ────────────────────────────────────────────────
  const enqueueTopics = async () => {
    const topics = input.split('\n').map(t => t.trim()).filter(Boolean);
    if (topics.length === 0) return;
    setInput('');

    // Optimistic local entries while server responds
    const tempItems: QueueItem[] = topics.map(topic => ({
      qid: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      topic,
      status: 'pending',
      targetLang,
    }));
    setQueue(prev => [...prev, ...tempItems]);

    // Create server-side jobs and replace temp entries with real IDs
    const settled = await Promise.allSettled(
      topics.map((topic, i) =>
        fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, targetLang, model: activeModel, apiKey }),
        })
          .then(r => r.ok ? r.json() : Promise.reject(new Error('Server error')))
          .then(({ jobId }: { jobId: string }) => ({ tempQid: tempItems[i].qid, jobId, topic }))
      )
    );

    setQueue(prev => {
      let next = [...prev];
      for (const result of settled) {
        if (result.status === 'fulfilled') {
          const { tempQid, jobId, topic: t } = result.value;
          next = next.map(j => j.qid === tempQid
            ? { qid: jobId, topic: t, status: 'pending' as QueueStatus, startedAt: Date.now() }
            : j
          );
        } else {
          // Mark the temp item as error if server rejected
          const idx = settled.indexOf(result);
          const tempQid = tempItems[idx]?.qid;
          if (tempQid) {
            next = next.map(j => j.qid === tempQid
              ? { ...j, status: 'error' as QueueStatus, error: 'Failed to submit to server' }
              : j
            );
          }
        }
      }
      return next;
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    enqueueTopics();
  };

  const removeQueueItem = async (qid: string) => {
    // Don't remove running jobs
    const job = queue.find(j => j.qid === qid);
    if (job?.status === 'running') return;
    setQueue(prev => prev.filter(j => j.qid !== qid));
    if (!qid.startsWith('tmp-')) {
      await fetch(`/api/jobs/${qid}`, { method: 'DELETE' }).catch(() => {});
    }
  };

  const retryQueueItem = async (qid: string) => {
    setQueue(prev => prev.map(j =>
      j.qid === qid ? { ...j, status: 'pending' as QueueStatus, error: undefined } : j
    ));
    await fetch(`/api/jobs/${qid}/retry`, { method: 'POST' }).catch(() => {});
  };

  const clearFinished = async () => {
    const finishedIds = queue.filter(j => j.status === 'done' || j.status === 'error').map(j => j.qid);
    setQueue(prev => prev.filter(j => j.status !== 'done' && j.status !== 'error'));
    await Promise.allSettled(
      finishedIds.filter(id => !id.startsWith('tmp-')).map(id =>
        fetch(`/api/jobs/${id}`, { method: 'DELETE' })
      )
    );
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

  // ── Open a completed queue lesson (may be in a different language) ──────────
  const [openingLessonId, setOpeningLessonId] = useState<string | null>(null);

  const openQueueLesson = async (job: QueueItem) => {
    if (!job.lessonId) return;
    setOpeningLessonId(job.lessonId);
    try {
      // Look in local history first
      let lesson = history.find(h => h.id === job.lessonId) ?? null;

      // If not loaded yet, fetch directly from server
      if (!lesson) {
        const res = await fetch(`/api/history/${job.lessonId}`);
        if (res.ok) {
          lesson = await res.json();
          if (lesson) setHistory(prev => [lesson!, ...prev.filter(l => l.id !== lesson!.id)]);
        }
      }

      if (!lesson) return;

      // Switch to the lesson's language if it differs from current
      const lessonLang = (lesson.targetLang ?? job.targetLang ?? 'it') as TargetLang;
      if (lessonLang !== targetLang) {
        onChangeLang(lessonLang);
      }

      setActiveLesson(lesson);
    } finally {
      setOpeningLessonId(null);
    }
  };

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [search, diffFilter, showFavsOnly, targetLang]);

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
          (lesson.topic.fr ?? '').toLowerCase().includes(q) ||
          lesson.tags?.some(t => t.toLowerCase().includes(q))
        );
      }
      return true;
    });

  const totalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE);
  const pagedHistory = filteredHistory.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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
  const isFr = targetLang === 'fr';
  const L = {
    appName:      l === 'pl' ? 'Językowy Mistrz AI' : isEn ? 'Language Master AI' : isFr ? 'Maître Linguistique IA' : 'Maestro Linguistico AI',
    headline:     l === 'pl' ? 'O czym chcesz dzisiaj poczytać?' : isEn ? 'What do you want to read about today?' : isFr ? "De quoi voulez-vous lire aujourd'hui ?" : 'Di cosa vuoi leggere oggi?',
    subtitle:     l === 'pl' ? 'Twórz artykuły, lekcje i opracowania kulturowe z AI.' : isEn ? 'Create articles, lessons and cultural insights with AI.' : isFr ? "Créez des articles, des leçons et des analyses culturelles avec l'IA." : "Crea articoli, lezioni e approfondimenti culturali con l'AI.",
    placeholder:  l === 'pl' ? 'Temat… (kilka linii = kilka artykułów równolegle)' : isEn ? 'Topic… (multiple lines = parallel articles)' : isFr ? 'Sujet… (plusieurs lignes = plusieurs articles en parallèle)' : 'Argomento… (più righe = più articoli in parallelo)',
    generating:   l === 'pl' ? 'Generowanie — to może chwilę zająć…' : isEn ? 'Generating — this may take a moment…' : isFr ? 'Génération en cours…' : 'Generazione in corso…',
    yourArticles: l === 'pl' ? 'Twoje artykuły' : isEn ? 'Your articles' : isFr ? 'Vos articles' : 'I tuoi articoli',
    search:       l === 'pl' ? 'Szukaj…' : isEn ? 'Search…' : isFr ? 'Rechercher…' : 'Cerca…',
    noArticles:   l === 'pl' ? 'Brak artykułów. Stwórz swój pierwszy!' : isEn ? 'No articles yet. Create your first!' : isFr ? 'Pas encore d\'articles. Créez le vôtre !' : 'Nessun articolo. Crea il tuo primo!',
    noArticlesSub:l === 'pl' ? (isIt ? 'Np. "Pizza", "Rzym" lub "Wenecja"' : isFr ? 'Np. "Cuisine", "Paris" lub "Culture française"' : 'Np. "greetings", "food" lub "British culture"') : isEn ? 'E.g. "Greetings", "Food" or "British culture"' : isFr ? 'Ex. "Cuisine", "Paris" ou "Culture française"' : 'Es. "Pizza", "Roma" o "Venezia"',
    noResults:    (q: string) => l === 'pl' ? `Brak wyników dla "${q}"` : isEn ? `No results for "${q}"` : isFr ? `Aucun résultat pour "${q}"` : `Nessun risultato per "${q}"`,
    langToggle:   l === 'pl' ? 'Zmień język' : isEn ? 'Change language' : isFr ? 'Changer de langue' : 'Cambia lingua',
    apiKey:       l === 'pl' ? 'Zmień klucz API' : isEn ? 'Change API key' : isFr ? 'Changer la clé API' : 'Cambia chiave API',
    backToHome:   l === 'pl' ? 'Zmień tryb' : isEn ? 'Change mode' : isFr ? 'Changer de mode' : 'Cambia modalità',
  };

  return (
    <div className="min-h-screen font-sans flex flex-col" style={{ background: 'var(--c-bg)', color: 'var(--c-text)' }}>
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
              <span>{l === 'pl' ? 'PL' : l === 'en' ? 'EN' : l === 'fr' ? 'FR' : 'IT'}</span>
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

      <main className="flex-1 px-4 py-8">
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
                  title={l === 'pl' ? 'Dodaj do kolejki (Enter)' : l === 'en' ? 'Add to queue (Enter)' : l === 'fr' ? 'Ajouter à la file (Entrée)' : 'Aggiungi alla coda (Enter)'}
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
                    : l === 'fr'
                    ? `${input.split('\n').filter(t => t.trim()).length} sujets — Entrée pour tout ajouter`
                    : `${input.split('\n').filter(t => t.trim()).length} argomenti — Enter per aggiungere tutti`)
                  : (l === 'pl' ? 'Enter by dodać · Shift+Enter = nowa linia · kilka linii = równolegle'
                    : l === 'en' ? 'Enter to add · Shift+Enter = new line · multiple lines = parallel'
                    : l === 'fr' ? 'Entrée pour ajouter · Shift+Entrée = nouvelle ligne · plusieurs lignes = parallèle'
                    : 'Enter per aggiungere · Shift+Enter = nuova riga · più righe = parallelo')
                }
              </p>
            </form>

            {/* ── Queue panel ─────────────────────────────────────────── */}
            {queue.length > 0 && (
              <div className="max-w-lg mx-auto w-full space-y-1 animate-fade-in">
                <div className="flex items-center justify-between px-1 mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--c-faint)' }}>
                    {l === 'pl' ? 'Kolejka generowania' : l === 'en' ? 'Generation queue' : l === 'fr' ? 'File de génération' : 'Coda generazione'}
                    {queue.filter(j => j.status === 'running').length > 0 && (
                      <span className="ml-1 normal-case font-normal">
                        — {queue.filter(j => j.status === 'running').length} {l === 'pl' ? 'w toku' : l === 'en' ? 'running' : l === 'fr' ? 'en cours' : 'in corso'}
                        {queue.filter(j => j.status === 'pending').length > 0 && `, ${queue.filter(j => j.status === 'pending').length} ${l === 'pl' ? 'czeka' : l === 'en' ? 'waiting' : l === 'fr' ? 'en attente' : 'in attesa'}`}
                      </span>
                    )}
                  </span>
                  {queue.some(j => j.status === 'done' || j.status === 'error') && (
                    <button onClick={clearFinished} className="text-[10px] underline" style={{ color: 'var(--c-faint)' }}>
                      {l === 'pl' ? 'Wyczyść zakończone' : l === 'en' ? 'Clear finished' : l === 'fr' ? 'Effacer terminés' : 'Pulisci'}
                    </button>
                  )}
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }} className="space-y-1 pr-0.5">
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

                    {/* Language flag */}
                    {job.targetLang && (
                      <span className="shrink-0 opacity-70" title={job.targetLang === 'it' ? 'Włoski' : job.targetLang === 'en' ? 'Angielski' : 'Francuski'}>
                        <Flag code={job.targetLang} size={12} />
                      </span>
                    )}

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
                      {job.status === 'running' && (l === 'pl' ? 'Generuję…' : l === 'en' ? 'Generating…' : l === 'fr' ? 'Génération…' : 'Generando…')}
                      {job.status === 'pending' && (l === 'pl' ? 'W kolejce' : l === 'en' ? 'Queued' : l === 'fr' ? 'En attente' : 'In attesa')}
                      {job.status === 'done' && (
                        <button
                          onClick={() => openQueueLesson(job)}
                          disabled={openingLessonId === job.lessonId}
                          className="underline font-bold disabled:opacity-50"
                          style={{ color: 'var(--c-green)' }}
                        >
                          {openingLessonId === job.lessonId
                            ? (l === 'pl' ? 'Ładuję…' : l === 'en' ? 'Loading…' : l === 'fr' ? 'Chargement…' : 'Carico…')
                            : (l === 'pl' ? 'Otwórz →' : l === 'en' ? 'Open →' : l === 'fr' ? 'Ouvrir →' : 'Apri →')}
                        </button>
                      )}
                      {job.status === 'error' && (
                        <button
                          onClick={() => retryQueueItem(job.qid)}
                          className="flex items-center gap-0.5 font-bold underline"
                          style={{ color: 'var(--c-red)' }}
                          title={l === 'pl' ? 'Ponów próbę' : l === 'en' ? 'Retry' : l === 'fr' ? 'Réessayer' : 'Riprova'}
                        >
                          <ArrowPathIcon className="w-3 h-3" />
                          {l === 'pl' ? 'Ponów' : l === 'en' ? 'Retry' : l === 'fr' ? 'Réessayer' : 'Riprova'}
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
                    title={(l === 'pl' ? 'Losowa lekcja' : l === 'en' ? 'Random article' : l === 'fr' ? 'Article aléatoire' : 'Articolo casuale') + ' [R]'}
                  >
                    <ArrowPathIcon className="w-3 h-3" />
                    {l === 'pl' ? 'Losowa' : l === 'en' ? 'Random' : l === 'fr' ? 'Aléatoire' : 'Casuale'}
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
                    title={l === 'pl' ? 'Tylko ulubione' : l === 'en' ? 'Favourites only' : l === 'fr' ? 'Favoris seulement' : 'Solo preferiti'}
                  >
                    {showFavsOnly ? <StarIcon className="w-3 h-3" /> : <StarOutlineIcon className="w-3 h-3" />}
                    {l === 'pl' ? 'Ulubione' : l === 'en' ? 'Favourites' : l === 'fr' ? 'Favoris' : 'Preferiti'}
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
                  {l === 'pl' ? 'Wszystkie' : l === 'en' ? 'All' : l === 'fr' ? 'Tous' : 'Tutti'}
                </button>
                {DIFF_LEVELS.filter(d => filteredHistory.some(lesson => lesson.difficulty_level === d)).map(d => (
                  <button
                    key={d}
                    onClick={() => setDiffFilter(prev => prev === d ? null : d)}
                    className={`diff-pill ${diffFilter === d ? 'active' : ''}`}
                  >
                    {d}
                    <span className="ml-1 opacity-70 font-normal text-[9px]">
                      {DIFF_LABELS[d]?.[l === 'pl' ? 'pl' : isEn ? 'en' : isFr ? 'fr' : 'it'] ?? ''}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {!historyLoaded ? (
              <div className="text-center py-12 text-xs animate-pulse" style={{ color: 'var(--c-faint)' }}>
                <SparklesIcon className="w-4 h-4 mx-auto mb-2" style={{ color: 'var(--c-green)' }} />
                {l === 'pl' ? 'Wczytywanie biblioteki…' : l === 'en' ? 'Loading library…' : l === 'fr' ? 'Chargement de la bibliothèque…' : 'Caricamento biblioteca…'}
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
                {search.trim() ? L.noResults(search) : (l === 'pl' ? 'Brak artykułów spełniających filtry.' : l === 'en' ? 'No articles match the filters.' : l === 'fr' ? 'Aucun article ne correspond aux filtres.' : 'Nessun articolo corrisponde ai filtri.')}
                {(diffFilter || showFavsOnly) && (
                  <div>
                    <button onClick={() => { setDiffFilter(null); setShowFavsOnly(false); setSearch(''); }}
                      className="text-xs underline mt-1" style={{ color: 'var(--c-green)' }}>
                      {l === 'pl' ? 'Wyczyść filtry' : l === 'en' ? 'Clear filters' : l === 'fr' ? 'Effacer les filtres' : 'Azzera filtri'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {pagedHistory.map((lesson) => (
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
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-30"
                      style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)', color: 'var(--c-text)' }}
                    >
                      ← {l === 'pl' ? 'Poprzednia' : l === 'en' ? 'Previous' : l === 'fr' ? 'Précédente' : 'Precedente'}
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                        .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                          if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((item, idx) =>
                          item === 'ellipsis' ? (
                            <span key={`e${idx}`} className="px-1 text-xs" style={{ color: 'var(--c-faint)' }}>…</span>
                          ) : (
                            <button
                              key={item}
                              onClick={() => setCurrentPage(item as number)}
                              className="w-8 h-8 rounded-lg text-xs font-bold transition-all"
                              style={currentPage === item
                                ? { background: 'var(--c-text)', color: theme === 'dark' ? '#13151b' : '#fff' }
                                : { background: 'var(--c-surface)', color: 'var(--c-muted)', border: '1px solid var(--c-border)' }
                              }
                            >
                              {item}
                            </button>
                          )
                        )}
                    </div>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-30"
                      style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)', color: 'var(--c-text)' }}
                    >
                      {l === 'pl' ? 'Następna' : l === 'en' ? 'Next' : l === 'fr' ? 'Suivante' : 'Successiva'} →
                    </button>
                  </div>
                )}
              </>
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
              <span style={{ color: 'var(--c-faint)' }}>{l === 'pl' ? 'Skróty:' : l === 'en' ? 'Shortcuts:' : l === 'fr' ? 'Raccourcis :' : 'Scorciatoie:'}</span>
              <span className="kbd">/</span><span>{l === 'pl' ? 'szukaj' : l === 'en' ? 'search' : l === 'fr' ? 'chercher' : 'cerca'}</span>
              <span className="kbd">R</span><span>{l === 'pl' ? 'losowa' : l === 'en' ? 'random' : l === 'fr' ? 'aléatoire' : 'casuale'}</span>
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
          <span className="hero-gradient">Językowy Mistrz AI</span>
        </h1>
        <p className="text-sm" style={{ color: 'var(--c-muted)' }}>
          Wybierz język, którego chcesz się uczyć
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-5 w-full max-w-2xl">
        {/* Angielski — sortowane alfabetycznie */}
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

        {/* Francuski */}
        <button
          onClick={() => onSelect('fr')}
          className="flex-1 group card card-hover p-8 flex flex-col items-center gap-4 transition-all"
        >
          <Flag code="fr" size={56} />
          <div className="text-center">
            <p className="font-serif font-bold text-xl" style={{ color: 'var(--c-text)' }}>Francuski</p>
            <p className="text-xs mt-1" style={{ color: 'var(--c-muted)' }}>Polsko-francuski</p>
          </div>
          <span className="text-xs font-semibold group-hover:translate-x-1 transition-transform" style={{ color: 'var(--c-green)' }}>
            Wybierz →
          </span>
        </button>

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
    return saved === 'it' || saved === 'en' || saved === 'fr' ? saved : null;
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
      <AppInner apiKey={apiKey} onChangeKey={() => setShowKeyModal(true)} onBackToHome={goHome} onChangeLang={selectLang} />
    </LangProvider>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
