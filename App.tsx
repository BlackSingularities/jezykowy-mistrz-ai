import React, { useState, useEffect, FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { generateLesson } from './services/geminiService';
import { LessonView } from './components/LessonView';
import { LangProvider, useLang } from './context/LangContext';
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
} from '@heroicons/react/24/solid';
import { LanguageIcon } from '@heroicons/react/24/outline';

const API_KEY_STORAGE = 'openrouter_api_key';

// ─── Difficulty colours ───────────────────────────────────────────────────────

const DIFF_GRADIENT: Record<string, string> = {
  A1: 'from-emerald-400 to-emerald-600',
  A2: 'from-teal-400 to-teal-600',
  B1: 'from-sky-400 to-blue-600',
  B2: 'from-indigo-400 to-indigo-600',
  C1: 'from-violet-500 to-purple-700',
};

const DIFF_TEXT: Record<string, string> = {
  A1: 'Początkujący',
  A2: 'Elementarny',
  B1: 'Średniozaawansowany',
  B2: 'Wyższy średni',
  C1: 'Zaawansowany',
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-10 max-w-md w-full space-y-8">
        <div className="text-center space-y-3">
          <div className="flex gap-2 justify-center">
            <div className="w-4 h-4 rounded-full bg-italian-green"></div>
            <div className="w-4 h-4 rounded-full bg-white border border-slate-200"></div>
            <div className="w-4 h-4 rounded-full bg-italian-red"></div>
          </div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">Włoski Mistrz AI</h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            Aby korzystać z aplikacji, podaj swój klucz API OpenRouter.<br/>
            Wszystkie dane pozostają wyłącznie w Twojej przeglądarce.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
              Klucz API OpenRouter
            </label>
            <input
              type="password"
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(''); }}
              placeholder="sk-or-v1-..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-italian-green/40 focus:border-italian-green outline-none text-slate-800 font-mono text-sm transition"
              autoFocus
            />
            {error && <p className="mt-2 text-xs text-italian-red">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={!value.trim()}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-italian-green transition-colors disabled:opacity-40"
          >
            Zapisz i kontynuuj →
          </button>
        </form>

        <p className="text-xs text-slate-400 text-center leading-relaxed">
          Uzyskaj klucz bezpłatnie na{' '}
          <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer"
            className="text-italian-green underline hover:text-emerald-700">
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
}> = ({ lesson, lang, onOpen, onDelete }) => {
  const gradient = DIFF_GRADIENT[lesson.difficulty_level] ?? DIFF_GRADIENT.B1;
  const diffLabel = DIFF_TEXT[lesson.difficulty_level] ?? lesson.difficulty_level;
  const topicText = lang === 'pl' ? lesson.topic.pl : lesson.topic.it;
  const subtitleText = lesson.subtitle ? (lang === 'pl' ? lesson.subtitle.pl : lesson.subtitle.it) : null;
  const introText = lang === 'pl' ? lesson.introduction?.pl : lesson.introduction?.it;

  return (
    <article
      onClick={onOpen}
      className="group bg-white rounded-3xl border border-slate-100 hover:border-italian-green/30 hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden flex flex-col"
    >
      {/* Gradient header */}
      <div className={`relative bg-gradient-to-br ${gradient} p-6 text-white overflow-hidden`}>
        {/* Decorative blob */}
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -right-2 -bottom-6 w-20 h-20 rounded-full bg-white/5" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Emoji + difficulty */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-3xl">{lesson.emoji}</span>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">
                  {lesson.difficulty_level}
                </span>
                <span className="ml-2 text-[10px] text-white/70">{diffLabel}</span>
              </div>
            </div>
            {/* Title */}
            <h3 className="text-xl font-serif font-bold leading-snug text-white mb-1 line-clamp-2">
              {topicText}
            </h3>
            {/* Subtitle */}
            {subtitleText && (
              <p className="text-xs text-white/70 italic line-clamp-1">{subtitleText}</p>
            )}
          </div>
          {/* Delete */}
          <button
            onClick={onDelete}
            className="shrink-0 p-1.5 rounded-full bg-white/10 hover:bg-white/30 text-white/60 hover:text-white transition-all opacity-0 group-hover:opacity-100"
            title="Usuń"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Card body */}
      <div className="flex-1 p-5 space-y-4">
        {/* Tags */}
        {lesson.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {lesson.tags.slice(0, 4).map((tag, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium border border-slate-200">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Intro excerpt */}
        {introText && (
          <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">{introText}</p>
        )}

        {/* Vocabulary preview */}
        {lesson.vocabulary?.length > 0 && (
          <div>
            <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest mb-1.5">Kluczowe słowa</p>
            <div className="flex flex-wrap gap-1.5">
              {lesson.vocabulary.slice(0, 3).map((v, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-medium">
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

      {/* Card footer */}
      <div className="px-5 pb-5 pt-2 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span>{new Date(lesson.timestamp).toLocaleDateString('pl-PL')}</span>
          {lesson.estimated_reading_minutes && (
            <span className="flex items-center gap-1">
              <ClockIcon className="w-3 h-3" />
              {lesson.estimated_reading_minutes} min
            </span>
          )}
        </div>
        <span className="text-italian-green font-semibold group-hover:translate-x-1 transition-transform">
          Czytaj →
        </span>
      </div>
    </article>
  );
};

// ─── Change API Key Modal ─────────────────────────────────────────────────────

const ChangeKeyModal: React.FC<{ onClose: () => void; onSave: (key: string) => void }> = ({ onClose, onSave }) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed.startsWith('sk-or-')) {
      setError('Klucz powinien zaczynać się od "sk-or-".');
      return;
    }
    onSave(trimmed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-8 max-w-sm w-full space-y-5 relative animate-fade-in">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-700">
          <XMarkIcon className="w-5 h-5" />
        </button>
        <div>
          <h2 className="font-serif font-bold text-xl text-slate-900 mb-1">Zmień klucz API</h2>
          <p className="text-sm text-slate-500">Podaj nowy klucz OpenRouter.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(''); }}
            placeholder="sk-or-v1-..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-italian-green/40 focus:border-italian-green outline-none text-slate-800 font-mono text-sm transition"
            autoFocus
          />
          {error && <p className="text-xs text-italian-red">{error}</p>}
          <button
            type="submit"
            disabled={!value.trim()}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-italian-green transition-colors disabled:opacity-40"
          >
            Zapisz
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── Inner App (uses LangContext) ─────────────────────────────────────────────

const AppInner: React.FC<{ apiKey: string; onChangeKey: () => void }> = ({ apiKey, onChangeKey }) => {
  const { globalLang, toggleGlobal } = useLang();

  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Lesson[]>(() => {
    try { return JSON.parse(localStorage.getItem('italian_app_history') || '[]'); }
    catch { return []; }
  });
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    localStorage.setItem('italian_app_history', JSON.stringify(history));
  }, [history]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setStatus('loading');
    setErrorMsg(null);
    try {
      const lesson = await generateLesson(input, apiKey);
      setHistory(prev => [lesson, ...prev]);
      setActiveLesson(lesson);
      setInput('');
      setStatus('idle');
    } catch {
      setStatus('error');
      setErrorMsg('Nie udało się wygenerować artykułu. Sprawdź klucz API i spróbuj ponownie.');
    }
  };

  const deleteLesson = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(l => l.id !== id));
    if (activeLesson?.id === id) setActiveLesson(null);
  };

  const filteredHistory = search.trim()
    ? history.filter(l =>
        l.topic.pl.toLowerCase().includes(search.toLowerCase()) ||
        l.topic.it.toLowerCase().includes(search.toLowerCase()) ||
        l.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
      )
    : history;

  // ── Active lesson view ──────────────────────────────────────────────────────

  if (activeLesson) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <nav className="w-full bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            <button
              onClick={() => setActiveLesson(null)}
              className="flex items-center gap-2 text-slate-500 hover:text-italian-green transition-colors text-sm font-medium"
            >
              ← Biblioteka
            </button>
            <button
              onClick={onChangeKey}
              title="Zmień klucz API"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <KeyIcon className="w-4 h-4" />
            </button>
          </div>
        </nav>
        <div className="px-2 py-6">
          <LessonView lesson={activeLesson} onBack={() => setActiveLesson(null)} />
        </div>
      </div>
    );
  }

  // ── Home / Library view ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navbar */}
      <nav className="w-full bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setActiveLesson(null)}>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-full bg-italian-green" />
              <div className="w-3 h-3 rounded-full bg-white border border-slate-200" />
              <div className="w-3 h-3 rounded-full bg-italian-red" />
            </div>
            <span className="font-serif font-bold text-xl tracking-tight text-slate-900">Włoski Mistrz AI</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleGlobal}
              title="Przełącz język kart"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <LanguageIcon className="w-3.5 h-3.5" />
              {globalLang === 'it' ? '🇮🇹 IT' : '🇵🇱 PL'}
            </button>
            <button
              onClick={onChangeKey}
              title="Zmień klucz API"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <KeyIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <main className="px-4 py-10">
        <div className="max-w-5xl mx-auto space-y-14">

          {/* Hero */}
          <div className="text-center space-y-8 py-6 md:py-12">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-serif font-bold text-slate-900 tracking-tight leading-tight">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-italian-green via-emerald-600 to-teal-700">
                  O czym chcesz dzisiaj poczytać?
                </span>
              </h1>
              <p className="text-lg text-slate-500 max-w-lg mx-auto font-light">
                Twórz artykuły, lekcje i opracowania kulturowe z AI.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="relative max-w-lg mx-auto w-full group">
              <div className="absolute -inset-1 bg-gradient-to-r from-italian-green via-emerald-400 to-teal-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
              <div className="relative flex items-center bg-white rounded-xl shadow-2xl">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Wpisz temat (np. 'Renesans', 'Kawa', 'Opera')..."
                  className="w-full px-6 py-5 rounded-xl bg-transparent border-0 focus:ring-0 text-lg placeholder:text-slate-400 text-slate-800 outline-none"
                  disabled={status === 'loading'}
                />
                <button
                  type="submit"
                  disabled={status === 'loading' || !input.trim()}
                  className="absolute right-2 p-3 bg-slate-900 text-white rounded-lg hover:bg-italian-green transition-colors disabled:opacity-50 disabled:hover:bg-slate-900"
                >
                  {status === 'loading'
                    ? <SparklesIcon className="w-6 h-6 animate-spin" />
                    : <PlusIcon className="w-6 h-6" />
                  }
                </button>
              </div>
            </form>

            {/* Loading indicator */}
            {status === 'loading' && (
              <div className="flex items-center justify-center gap-3 text-sm text-slate-500 animate-pulse">
                <SparklesIcon className="w-4 h-4 text-italian-green" />
                Generowanie lekcji — to może chwilę zająć…
              </div>
            )}

            {status === 'error' && (
              <div className="text-italian-red bg-red-50 px-4 py-3 rounded-xl border border-red-100 inline-block text-sm font-medium animate-fade-in">
                {errorMsg}
              </div>
            )}
          </div>

          {/* Library */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <BookOpenIcon className="w-5 h-5 text-slate-400" />
                <h2 className="text-lg font-bold text-slate-700 uppercase tracking-wide">
                  Twoje Artykuły
                </h2>
                <span className="text-xs text-slate-400 font-normal">({history.length})</span>
              </div>
              {/* Search */}
              {history.length > 3 && (
                <div className="sm:ml-auto relative">
                  <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Szukaj..."
                    className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:ring-2 focus:ring-italian-green/30 outline-none transition w-48"
                  />
                </div>
              )}
            </div>

            {history.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 space-y-2">
                <p className="text-4xl">🇮🇹</p>
                <p className="font-medium">Brak artykułów. Stwórz swój pierwszy!</p>
                <p className="text-sm">Wpisz temat powyżej — np. "Pizza", "Rzym" lub "Passat Verbano"</p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <p>Brak wyników dla <strong>"{search}"</strong></p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredHistory.map((lesson) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    lang={globalLang}
                    onOpen={() => setActiveLesson(lesson)}
                    onDelete={(e) => deleteLesson(e, lesson.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="py-10 text-center text-slate-400 text-sm border-t border-slate-200/50 mt-8 bg-white/50">
        <p>Włoski Mistrz AI &copy; 2025 · Powered by OpenRouter</p>
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
