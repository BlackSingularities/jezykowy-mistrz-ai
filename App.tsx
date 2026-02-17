import React, { useState, useEffect, FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { generateLesson } from './services/geminiService';
import { LessonView } from './components/LessonView';
import { Lesson, GenerationState } from './types';
import { ArrowRightIcon, SparklesIcon, TrashIcon, BookOpenIcon, PlusIcon } from '@heroicons/react/24/solid';

const App: React.FC = () => {
  const [input, setInput] = useState('');
  const [lang, setLang] = useState<'it' | 'pl'>('pl');
  
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setStatus('loading');
    setError(null);

    try {
      const lesson = await generateLesson(input);
      setHistory(prev => [lesson, ...prev]);
      setActiveLesson(lesson);
      setInput('');
      setStatus('idle');
    } catch (error) {
      setStatus('error');
      setError("Nie udało się wygenerować artykułu. Spróbuj ponownie.");
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
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-widest hidden sm:inline-block">
              Twoja Biblioteka
            </span>
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
                    placeholder="Wpisz temat (np. 'Renament', 'Kawa', 'Opera')..."
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
          <p>Włoski Mistrz AI &copy; 2024</p>
        </footer>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);