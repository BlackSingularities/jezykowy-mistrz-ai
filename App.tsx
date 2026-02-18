import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { generateLesson, loadModels, getSavedModel, saveModel, DEFAULT_MODEL, ORModel } from './services/geminiService';
import { LessonView, getFavorites, toggleFavorite } from './components/LessonView';
import { LangProvider, useLang, useTheme } from './context/LangContext';
import { Lesson } from './types';
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
} from '@heroicons/react/24/solid';
import { LanguageIcon, SunIcon, MoonIcon, ArrowPathIcon, StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';

const API_KEY_STORAGE = 'openrouter_api_key';
const HISTORY_KEY    = 'italian_app_history'; // localStorage fallback key

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

const DIFF_LABELS: Record<string, { pl: string; it: string }> = {
  A1: { pl: 'Początkujący',        it: 'Principiante' },
  A2: { pl: 'Elementarny',         it: 'Elementare' },
  B1: { pl: 'Średniozaawansowany', it: 'Intermedio' },
  B2: { pl: 'Wyższy średni',       it: 'Intermedio sup.' },
  C1: { pl: 'Zaawansowany',        it: 'Avanzato' },
};

// ─── ModelPicker ──────────────────────────────────────────────────────────────

const ModelPicker: React.FC<{
  apiKey: string;
  activeModel: string;
  onChange: (modelId: string) => void;
  lang: 'it' | 'pl';
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
      setError(lang === 'it' ? 'Impossibile caricare i modelli.' : 'Nie udało się załadować modeli.');
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
                placeholder={lang === 'it' ? 'Cerca modello…' : 'Szukaj modelu…'}
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
                {lang === 'it' ? 'Nessun risultato.' : 'Brak wyników.'}
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
  lang: 'it' | 'pl';
  onOpen: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isFav: boolean;
  onToggleFav: (e: React.MouseEvent) => void;
}> = ({ lesson, lang, onOpen, onDelete, isFav, onToggleFav }) => {
  const gradient = DIFF_GRADIENT[lesson.difficulty_level] ?? DIFF_GRADIENT.B1;
  const diffLabels = DIFF_LABELS[lesson.difficulty_level];
  const diffLabel = diffLabels ? diffLabels[lang] : lesson.difficulty_level;
  const topicText = lang === 'pl' ? lesson.topic.pl : lesson.topic.it;
  const subtitleText = lesson.subtitle ? (lang === 'pl' ? lesson.subtitle.pl : lesson.subtitle.it) : null;
  const introText = lang === 'pl' ? lesson.introduction?.pl : lesson.introduction?.it;

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
            <p className="micro-label mb-1">{lang === 'it' ? 'Parole chiave' : 'Kluczowe słowa'}</p>
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
          {lang === 'it' ? 'Leggi →' : 'Czytaj →'}
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
      setError(l === 'it' ? 'La chiave deve iniziare con "sk-or-".' : 'Klucz powinien zaczynać się od "sk-or-".');
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
            {l === 'it' ? 'Cambia chiave API' : 'Zmień klucz API'}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--c-muted)' }}>
            {l === 'it' ? 'Inserisci una nuova chiave OpenRouter.' : 'Podaj nowy klucz OpenRouter.'}
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
            {l === 'it' ? 'Salva' : 'Zapisz'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── Inner App ────────────────────────────────────────────────────────────────

const DIFF_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;

const AppInner: React.FC<{ apiKey: string; onChangeKey: () => void }> = ({ apiKey, onChangeKey }) => {
  const { globalLang, toggleGlobal } = useLang();
  const { theme, toggleTheme } = useTheme();

  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Lesson[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeModel, setActiveModel] = useState<string>(() => getSavedModel());
  const [diffFilter, setDiffFilter] = useState<string | null>(null);
  const [showFavsOnly, setShowFavsOnly] = useState(false);
  const [favSet, setFavSet] = useState<Set<string>>(() => getFavorites());
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Wczytaj historię z pliku przy starcie
  useEffect(() => {
    loadHistory().then(h => {
      setHistory(h);
      setHistoryLoaded(true);
    });
  }, []);

  // Keyboard shortcuts on main page
  useEffect(() => {
    if (activeLesson) return;
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      // '/' → focus search
      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // 'r' or 'R' → random lesson
      if (e.key === 'r' || e.key === 'R') {
        if (history.length > 0) {
          const rand = history[Math.floor(Math.random() * history.length)];
          setActiveLesson(rand);
        }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [activeLesson, history]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setStatus('loading');
    setErrorMsg(null);
    try {
      const lesson = await generateLesson(input, apiKey, activeModel);
      await saveLesson(lesson);
      setHistory(prev => [lesson, ...prev]);
      setActiveLesson(lesson);
      setInput('');
      setStatus('idle');
    } catch {
      setStatus('error');
      setErrorMsg('Nie udało się wygenerować artykułu. Sprawdź klucz API i spróbuj ponownie.');
    }
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

  const filteredHistory = history.filter(lesson => {
    if (diffFilter && lesson.difficulty_level !== diffFilter) return false;
    if (showFavsOnly && !favSet.has(lesson.id)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        lesson.topic.pl.toLowerCase().includes(q) ||
        lesson.topic.it.toLowerCase().includes(q) ||
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
  const L = {
    headline:     l === 'it' ? 'Di cosa vuoi leggere oggi?' : 'O czym chcesz dzisiaj poczytać?',
    subtitle:     l === 'it' ? "Crea articoli, lezioni e approfondimenti culturali con l'AI." : 'Twórz artykuły, lekcje i opracowania kulturowe z AI.',
    placeholder:  l === 'it' ? "Argomento (es. 'Rinascimento', 'Caffè', 'Opera')…" : "Temat (np. 'Renesans', 'Kawa', 'Opera')…",
    generating:   l === 'it' ? 'Generazione in corso…' : 'Generowanie — to może chwilę zająć…',
    yourArticles: l === 'it' ? 'I tuoi articoli' : 'Twoje artykuły',
    search:       l === 'it' ? 'Cerca…' : 'Szukaj…',
    noArticles:   l === 'it' ? 'Nessun articolo. Crea il tuo primo!' : 'Brak artykułów. Stwórz swój pierwszy!',
    noArticlesSub:l === 'it' ? 'Es. "Pizza", "Roma" o "Venezia"' : 'Np. "Pizza", "Rzym" lub "Wenecja"',
    noResults:    (q: string) => l === 'it' ? `Nessun risultato per "${q}"` : `Brak wyników dla "${q}"`,
    langToggle:   l === 'it' ? 'Cambia lingua' : 'Zmień język',
    apiKey:       l === 'it' ? 'Cambia chiave API' : 'Zmień klucz API',
  };

  return (
    <div className="min-h-screen font-sans" style={{ background: 'var(--c-bg)', color: 'var(--c-text)' }}>
      {/* Navbar */}
      <nav className="glass-nav sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setActiveLesson(null)}>
            <div className="flex gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--c-green)' }} />
              <div className="w-2.5 h-2.5 rounded-full border" style={{ borderColor: 'var(--c-border)' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--c-red)' }} />
            </div>
            <span className="font-serif font-bold text-lg tracking-tight" style={{ color: 'var(--c-text)' }}>
              {l === 'it' ? 'Maestro Italiano AI' : 'Włoski Mistrz AI'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <ModelPicker
              apiKey={apiKey}
              activeModel={activeModel}
              onChange={handleModelChange}
              lang={l}
            />
            <button
              onClick={toggleGlobal}
              title={L.langToggle}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full transition-all active:scale-95"
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
            <button
              onClick={onChangeKey}
              title={L.apiKey}
              className="p-2 rounded-lg"
              style={{ color: 'var(--c-faint)' }}
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
              <div className="relative flex items-center rounded-xl shadow-lg" style={{ background: 'var(--c-surface)' }}>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={L.placeholder}
                  className="w-full px-4 py-3 rounded-xl bg-transparent border-0 focus:ring-0 text-sm placeholder:text-slate-400 outline-none"
                  style={{ color: 'var(--c-text)' }}
                  disabled={status === 'loading'}
                />
                <button
                  type="submit"
                  disabled={status === 'loading' || !input.trim()}
                  className="absolute right-1.5 p-2 rounded-lg transition-colors disabled:opacity-50"
                  style={{ background: 'var(--c-text)', color: '#fff' }}
                >
                  {status === 'loading'
                    ? <SparklesIcon className="w-4 h-4 animate-spin" />
                    : <PlusIcon className="w-4 h-4" />
                  }
                </button>
              </div>
            </form>

            {status === 'loading' && (
              <div className="flex items-center justify-center gap-2 text-xs animate-pulse" style={{ color: 'var(--c-muted)' }}>
                <SparklesIcon className="w-3.5 h-3.5" style={{ color: 'var(--c-green)' }} />
                {L.generating}
              </div>
            )}
            {status === 'error' && (
              <div className="inline-block text-xs font-medium px-3 py-2 rounded-lg animate-fade-in"
                style={{ background: '#fef2f2', color: 'var(--c-red)', border: '1px solid #fecaca' }}>
                {errorMsg}
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
                  ({filteredHistory.length}{filteredHistory.length !== history.length ? `/${history.length}` : ''})
                </span>
                {/* Random lesson button */}
                {history.length > 1 && (
                  <button
                    onClick={() => { const r = history[Math.floor(Math.random() * history.length)]; setActiveLesson(r); }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all"
                    style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)', color: 'var(--c-muted)' }}
                    title={(l === 'it' ? 'Articolo casuale' : 'Losowa lekcja') + ' [R]'}
                  >
                    <ArrowPathIcon className="w-3 h-3" />
                    {l === 'it' ? 'Casuale' : 'Losowa'}
                  </button>
                )}
                {/* Favorites filter */}
                {history.length > 0 && favSet.size > 0 && (
                  <button
                    onClick={() => setShowFavsOnly(v => !v)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${showFavsOnly ? 'active' : ''}`}
                    style={showFavsOnly
                      ? { background: 'rgba(245,158,11,.12)', color: '#d97706', border: '1px solid rgba(245,158,11,.35)' }
                      : { background: 'var(--c-bg)', border: '1px solid var(--c-border)', color: 'var(--c-muted)' }
                    }
                    title={l === 'it' ? 'Solo preferiti' : 'Tylko ulubione'}
                  >
                    {showFavsOnly ? <StarIcon className="w-3 h-3" /> : <StarOutlineIcon className="w-3 h-3" />}
                    {l === 'it' ? 'Preferiti' : 'Ulubione'}
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
                  {l === 'it' ? 'Tutti' : 'Wszystkie'}
                </button>
                {DIFF_LEVELS.filter(d => history.some(lesson => lesson.difficulty_level === d)).map(d => (
                  <button
                    key={d}
                    onClick={() => setDiffFilter(prev => prev === d ? null : d)}
                    className={`diff-pill ${diffFilter === d ? 'active' : ''}`}
                  >
                    {d}
                    <span className="ml-1 opacity-70 font-normal text-[9px]">
                      {DIFF_LABELS[d]?.[l] ?? ''}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {!historyLoaded ? (
              <div className="text-center py-12 text-xs animate-pulse" style={{ color: 'var(--c-faint)' }}>
                <SparklesIcon className="w-4 h-4 mx-auto mb-2" style={{ color: 'var(--c-green)' }} />
                {l === 'it' ? 'Caricamento biblioteca…' : 'Wczytywanie biblioteki…'}
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border-2 border-dashed space-y-1.5"
                style={{ borderColor: 'var(--c-border)', color: 'var(--c-faint)' }}>
                <p className="text-3xl">🇮🇹</p>
                <p className="font-medium text-sm">{L.noArticles}</p>
                <p className="text-xs">{L.noArticlesSub}</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-12 text-sm space-y-1" style={{ color: 'var(--c-faint)' }}>
                {search.trim() ? L.noResults(search) : (l === 'it' ? 'Nessun articolo corrisponde ai filtri.' : 'Brak artykułów spełniających filtry.')}
                {(diffFilter || showFavsOnly) && (
                  <div>
                    <button onClick={() => { setDiffFilter(null); setShowFavsOnly(false); setSearch(''); }}
                      className="text-xs underline mt-1" style={{ color: 'var(--c-green)' }}>
                      {l === 'it' ? 'Azzera filtri' : 'Wyczyść filtry'}
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
            {l === 'it' ? 'Maestro Italiano AI' : 'Włoski Mistrz AI'} &copy; 2025 · Powered by OpenRouter
          </span>
          {history.length > 0 && (
            <div className="flex items-center gap-2 text-[10px]">
              <span style={{ color: 'var(--c-faint)' }}>{l === 'it' ? 'Scorciatoie:' : 'Skróty:'}</span>
              <span className="kbd">/</span><span>{l === 'it' ? 'cerca' : 'szukaj'}</span>
              <span className="kbd">R</span><span>{l === 'it' ? 'casuale' : 'losowa'}</span>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};

// ─── Root App ─────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem(API_KEY_STORAGE) || '');
  const [showKeyModal, setShowKeyModal] = useState(false);

  const saveApiKey = (key: string) => {
    localStorage.setItem(API_KEY_STORAGE, key);
    setApiKey(key);
  };

  if (!apiKey) return <ApiKeySetup onSave={saveApiKey} />;

  return (
    <LangProvider>
      {showKeyModal && (
        <ChangeKeyModal onClose={() => setShowKeyModal(false)} onSave={saveApiKey} />
      )}
      <AppInner apiKey={apiKey} onChangeKey={() => setShowKeyModal(true)} />
    </LangProvider>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
