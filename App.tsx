import React, { useState, useEffect, FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { generateLesson } from './services/geminiService';
import { LessonView } from './components/LessonView';
import { Lesson, GenerationState } from './types';
import { ArrowRightIcon, SparklesIcon, TrashIcon, BookOpenIcon, PlusIcon, KeyIcon, XMarkIcon } from '@heroicons/react/24/solid';

const API_KEY_STORAGE = 'openrouter_api_key';

/* ─────────── Ekran konfiguracji klucza API ─────────── */
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
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="flex gap-2 justify-center">
            <div className="w-4 h-4 rounded-full bg-italian-green"></div>
            <div className="w-4 h-4 rounded-full bg-white border border-slate-200"></div>
            <div className="w-4 h-4 rounded-full bg-italian-red"></div>
          </div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">Włoski Mistrz AI</h1>
          <p className="text-slate-500 text-sm">
            Aby korzystać z aplikacji, podaj swój klucz API OpenRouter.
          </p>
        </div>

        {/* Form */}
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
            {error && (
              <p className="mt-2 text-xs text-italian-red">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!value.trim()}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-italian-green transition-colors disabled:opacity-40 disabled:hover:bg-slate-900"
          >
            Zapisz i kontynuuj
          </button>
        </form>

        {/* Info */}
        <p className="text-xs text-slate-400 text-center leading-relaxed">
          Klucz jest przechowywany wyłącznie w przeglądarce (localStorage) i nigdy nie opuszcza Twojego urządzenia.
          <br />
          Uzyskaj klucz bezpłatnie na{' '}
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-italian-green underline hover:text-emerald-700"
          >
            openrouter.ai/keys
          </a>
        </p>
      </div>
    </div>
  );
};

/* ─────────── Główna aplikacja ─────────── */
const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>(() =>
    localStorage.getItem(API_KEY_STORAGE) || ''
  );
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState('');
  const [keyModalError, setKeyModalError] = useState('');

  const [input, setInput] = useState('');
  const [lang, setLang] = useState<'it' | 'pl'>('pl');

  const [history, setHistory] = useState<Lesson[]>(() => {
    const saved = localStorage.getItem('italian_app_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('italian_app_history', JSON.stringify(history));
  }, [history]);

  const saveApiKey = (key: string) => {
    localStorage.setItem(API_KEY_STORAGE, key);
    setApiKey(key);
  };

  const handleKeyModalSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newKeyValue.trim();
    if (!trimmed.startsWith('sk-or-')) {
      setKeyModalError('Klucz powinien zaczynać się od "sk-or-".');
      return;
    }
    saveApiKey(trimmed);
    setShowKeyModal(false);
    setNewKeyValue('');
    setKeyModalError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setStatus('loading');
    setError(null);

    try {
      const lesson = await generateLesson(input, apiKey);
      setHistory(prev => [lesson, ...prev]);
      setActiveLesson(lesson);
      setInput('');
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setError("Nie udało się wygenerować artykułu. Sprawdź klucz API i spróbuj ponownie.");
    }
  };

  const deleteLesson = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(l => l.id !== id));
    if (activeLesson?.id === id) setActiveLesson(null);
  };

  const toggleLang = () => setLang(l => l === 'it' ? 'pl' : 'it');

  /* Jeśli brak klucza — pokaż ekran konfiguracji */
  if (!apiKey) {
    return <ApiKeySetup onSave={saveApiKey} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-italian-green/20 font-sans">

      {/* Navbar */}
      <nav className="w-full bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveLesson(null)}>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-full bg-italian-green"></div>
              <div className="w-3 h-3 rounded-full bg-white border border-slate-200"></div>
              <div className="w-3 h-3 rounded-full bg-italian-red"></div>
            </div>
            <span className="font-serif font-bold text-xl tracking-tight text-slate-900">Włoski Mistrz AI</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-widest hidden sm:inline-block">
              Twoja Biblioteka
            </span>
            <button
              onClick={() => { setNewKeyValue(''); setKeyModalError(''); setShowKeyModal(true); }}
              title="Zmień klucz API"
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <KeyIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Modal zmiany klucza API */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-8 max-w-sm w-full space-y-6 relative">
            <button
              onClick={() => setShowKeyModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-700"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-serif font-bold text-xl text-slate-900 mb-1">Zmień klucz API</h2>
              <p className="text-sm text-slate-500">Podaj nowy klucz OpenRouter.</p>
            </div>
            <form onSubmit={handleKeyModalSubmit} className="space-y-4">
              <input
                type="password"
                value={newKeyValue}
                onChange={(e) => { setNewKeyValue(e.target.value); setKeyModalError(''); }}
                placeholder="sk-or-v1-..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-italian-green/40 focus:border-italian-green outline-none text-slate-800 font-mono text-sm transition"
                autoFocus
              />
              {keyModalError && <p className="text-xs text-italian-red">{keyModalError}</p>}
              <button
                type="submit"
                disabled={!newKeyValue.trim()}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-italian-green transition-colors disabled:opacity-40"
              >
                Zapisz
              </button>
            </form>
          </div>
        </div>
      )}

      <main className="px-4 py-8 relative">

        {/* Aktywna lekcja */}
        {activeLesson ? (
          <LessonView
            lesson={activeLesson}
            lang={lang}
            onToggleLang={toggleLang}
            onBack={() => setActiveLesson(null)}
          />
        ) : (
          <div className="max-w-4xl mx-auto space-y-12 animate-fade-in">

            {/* Hero & wyszukiwanie */}
            <div className="text-center space-y-8 py-8 md:py-16">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl font-serif font-bold text-slate-900 tracking-tight leading-tight">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-italian-green via-emerald-600 to-teal-700">
                    O czym chcesz dzisiaj poczytać?
                  </span>
                </h1>
                <p className="text-lg text-slate-600 max-w-lg mx-auto font-light">
                  Twórz własne artykuły, lekcje i opracowania kulturowe.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="relative max-w-lg mx-auto w-full group">
                <div className="absolute -inset-1 bg-gradient-to-r from-italian-green via-emerald-400 to-teal-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative flex items-center bg-white rounded-xl shadow-2xl transform transition-transform group-hover:scale-[1.01]">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Wpisz temat (np. 'Renesans', 'Kawa', 'Opera')..."
                    className="w-full px-6 py-5 rounded-xl bg-transparent border-0 focus:ring-0 text-lg placeholder:text-slate-400 text-slate-800"
                    disabled={status === 'loading'}
                  />
                  <button
                    type="submit"
                    disabled={status === 'loading' || !input.trim()}
                    className="absolute right-2 p-3 bg-slate-900 text-white rounded-lg hover:bg-italian-green transition-colors disabled:opacity-50 disabled:hover:bg-slate-900"
                  >
                    {status === 'loading' ? (
                      <SparklesIcon className="w-6 h-6 animate-spin" />
                    ) : (
                      <PlusIcon className="w-6 h-6" />
                    )}
                  </button>
                </div>
              </form>

              {status === 'error' && (
                <div className="animate-fade-in text-italian-red bg-red-50 px-4 py-3 rounded-xl border border-red-100 inline-block text-sm font-medium">
                  {error}
                </div>
              )}
            </div>

            {/* Siatka artykułów */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-4">
                <BookOpenIcon className="w-5 h-5 text-slate-400" />
                <h2 className="text-lg font-bold text-slate-700 uppercase tracking-wide">
                  Twoje Artykuły ({history.length})
                </h2>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400">
                  <p>Brak artykułów w historii. Stwórz pierwszy!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {history.map((lesson) => (
                    <div
                      key={lesson.id}
                      onClick={() => setActiveLesson(lesson)}
                      className="group bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:border-italian-green/30 transition-all cursor-pointer relative overflow-hidden flex flex-col h-full"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-4xl p-2 bg-slate-50 rounded-xl group-hover:scale-110 transition-transform duration-300">
                          {lesson.emoji}
                        </span>
                        <button
                          onClick={(e) => deleteLesson(e, lesson.id)}
                          className="p-2 text-slate-300 hover:text-italian-red hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                          title="Usuń"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>

                      <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-2 font-serif group-hover:text-italian-green transition-colors">
                        {lang === 'pl' ? lesson.topic.pl : lesson.topic.it}
                      </h3>

                      <p className="text-slate-500 text-sm line-clamp-3 mb-4 flex-grow">
                        {lang === 'pl' ? lesson.introduction.pl : lesson.introduction.it}
                      </p>

                      <div className="pt-4 border-t border-slate-50 flex justify-between items-center text-xs text-slate-400 mt-auto">
                        <span>{new Date(lesson.timestamp).toLocaleDateString()}</span>
                        <span className="group-hover:translate-x-1 transition-transform text-italian-green font-medium">Czytaj →</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      {!activeLesson && (
        <footer className="py-12 text-center text-slate-400 text-sm border-t border-slate-200/50 mt-12 bg-white/50 backdrop-blur-sm">
          <p>Włoski Mistrz AI &copy; 2025</p>
        </footer>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
