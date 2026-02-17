import React, { useState, useEffect, FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { generateLesson } from './services/geminiService';
import { LessonView } from './components/LessonView';
import { Lesson, GenerationState } from './types';
import { ArrowRightIcon, SparklesIcon, TrashIcon, BookOpenIcon, PlusIcon, KeyIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid';

// --- API Key Setup Modal ---

interface ApiKeyModalProps {
  onSave: (key: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onSave }) => {
  const [value, setValue] = useState('');
  const [showKey, setShowKey] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSave(trimmed);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 animate-fade-in">
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-italian-green to-emerald-600 flex items-center justify-center">
            <KeyIcon className="w-7 h-7 text-white" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-serif font-bold text-slate-900">Włoski Mistrz AI</h2>
            <p className="text-slate-500 mt-1 text-sm">Podaj klucz API OpenRouter, aby zacząć</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
              Klucz API OpenRouter
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="sk-or-v1-..."
                className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-italian-green/40 focus:border-italian-green text-sm font-mono bg-slate-50"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showKey ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Klucz jest zapisywany tylko lokalnie w przeglądarce (localStorage).{' '}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-italian-green underline hover:text-emerald-700"
              >
                Uzyskaj klucz na openrouter.ai
              </a>
            </p>
          </div>

          <button
            type="submit"
            disabled={!value.trim()}
            className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-italian-green transition-colors disabled:opacity-40 disabled:hover:bg-slate-900"
          >
            Zacznij naukę →
          </button>
        </form>
      </div>
    </div>
  );
};

// --- Main App ---

const App: React.FC = () => {
  const [input, setInput] = useState('');
  const [lang, setLang] = useState<'it' | 'pl'>('pl');

  // API key state
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('openrouter_api_key') || '');

  // History State
  const [history, setHistory] = useState<Lesson[]>(() => {
    const saved = localStorage.getItem('italian_app_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Active Lesson View
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  // Generation Status
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('italian_app_history', JSON.stringify(history));
  }, [history]);

  const handleSaveApiKey = (key: string) => {
    localStorage.setItem('openrouter_api_key', key);
    setApiKey(key);
  };

  const handleClearApiKey = () => {
    localStorage.removeItem('openrouter_api_key');
    setApiKey('');
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
    } catch (err: any) {
      setStatus('error');
      setError(err?.message || "Nie udało się wygenerować artykułu. Spróbuj ponownie.");
    }
  };

  const deleteLesson = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setHistory(prev => prev.filter(l => l.id !== id));
    if (activeLesson?.id === id) {
      setActiveLesson(null);
    }
  };

  const toggleLang = () => setLang(l => l === 'it' ? 'pl' : 'it');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-italian-green/20 font-sans">

      {/* API Key Modal – shown when no key is set */}
      {!apiKey && <ApiKeyModal onSave={handleSaveApiKey} />}

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
            {apiKey && (
              <button
                onClick={handleClearApiKey}
                title="Zmień klucz API"
                className="p-2 text-slate-400 hover:text-italian-red hover:bg-red-50 rounded-full transition-colors"
              >
                <KeyIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="px-4 py-8 relative">

        {/* Active Lesson View */}
        {activeLesson ? (
          <LessonView
            lesson={activeLesson}
            lang={lang}
            onToggleLang={toggleLang}
            onBack={() => setActiveLesson(null)}
          />
        ) : (
          /* Library / Home View */
          <div className="max-w-4xl mx-auto space-y-12 animate-fade-in">

            {/* Hero & Search */}
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
                    disabled={status === 'loading' || !apiKey}
                  />
                  <button
                    type="submit"
                    disabled={status === 'loading' || !input.trim() || !apiKey}
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

            {/* Articles Grid */}
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
          <p>Włoski Mistrz AI &copy; 2025 · Powered by OpenRouter</p>
        </footer>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
