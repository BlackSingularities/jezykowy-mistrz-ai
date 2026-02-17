import React, { useState, useEffect } from 'react';
import { Lesson, Bilingual } from '../types';
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
  ListBulletIcon,
  AcademicCapIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

interface LessonViewProps {
  lesson: Lesson;
  lang: 'it' | 'pl';
  onToggleLang: () => void;
  onBack: () => void;
}

export const LessonView: React.FC<LessonViewProps> = ({ lesson, lang, onToggleLang, onBack }) => {
  const [activeSection, setActiveSection] = useState('intro');
  const [ttsRate, setTtsRate] = useState(0.9); // 0.9 normal, 0.6 slow

  const toggleRate = () => setTtsRate(r => r === 0.9 ? 0.6 : 0.9);

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'it-IT';
      utterance.rate = ttsRate;
      window.speechSynthesis.speak(utterance);
    }
  };

  const BilingualText: React.FC<{ content: Bilingual; className?: string }> = ({ content, className = "" }) => (
    <span className={`transition-opacity duration-300 ${className}`}>
      {lang === 'it' ? content.it : content.pl}
    </span>
  );

  const SectionHeading: React.FC<{ id: string; icon: any; title: string }> = ({ id, icon: Icon, title }) => (
    <div id={id} className="scroll-mt-24 flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
      <Icon className="w-7 h-7 text-italian-green" />
      <h2 className="text-2xl md:text-3xl font-serif font-bold text-slate-800">
        {title}
      </h2>
    </div>
  );

  // Scroll spy for sidebar
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['intro', 'vocab', 'phrases', 'grammar', 'mistakes', 'dialogue', 'culture'];
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= 300) {
            setActiveSection(section);
            break;
          }
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setActiveSection(id);
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-fade-in-up">
      
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 mb-8 shadow-sm flex justify-between items-center">
        <button
           onClick={onBack}
           className="flex items-center gap-2 text-slate-600 hover:text-italian-green transition-colors font-medium text-sm"
        >
           <ArrowLeftIcon className="w-4 h-4" />
           Biblioteka
        </button>

        <div className="flex items-center gap-3">
          {/* TTS Speed Toggle */}
          <button 
            onClick={toggleRate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-colors"
            title="Prędkość wymowy"
          >
            <SpeakerWaveIcon className="w-3 h-3" />
            {ttsRate === 0.9 ? '1.0x' : '0.6x'}
          </button>

          {/* Language Toggle */}
          <button 
            onClick={onToggleLang}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white hover:bg-italian-green transition-all shadow-md active:scale-95"
          >
            <LanguageIcon className="w-4 h-4" />
            <span className="font-mono text-xs font-bold tracking-wide">
              {lang === 'it' ? 'ITALIANO' : 'POLSKI'}
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 lg:px-8">
        
        {/* Sidebar Navigation (Desktop) */}
        <aside className="hidden lg:block lg:col-span-3">
          <div className="sticky top-24 space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 pl-3">Spis Treści</h3>
            {[
              { id: 'intro', label: 'Wstęp', icon: SparklesIcon },
              { id: 'vocab', label: 'Słownictwo', icon: BookOpenIcon },
              { id: 'phrases', label: 'Zwroty', icon: ChatBubbleBottomCenterTextIcon },
              { id: 'grammar', label: 'Gramatyka', icon: AcademicCapIcon },
              { id: 'mistakes', label: 'Uwaga na błędy', icon: ExclamationTriangleIcon },
              { id: 'dialogue', label: 'Dialog', icon: ListBulletIcon },
              { id: 'culture', label: 'Kultura', icon: GlobeEuropeAfricaIcon },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeSection === item.id 
                    ? 'bg-italian-green/10 text-italian-green shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
            
            {/* Metadata Card */}
            <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
               <div className="text-xs font-bold text-slate-400 uppercase mb-2">Poziom</div>
               <div className="flex items-center gap-2 mb-4">
                  <span className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-xs font-bold">{lesson.difficulty_level}</span>
                  <span className="text-slate-500 text-xs">Średniozaawansowany</span>
               </div>
               {lesson.trivia && (
                 <>
                   <div className="text-xs font-bold text-slate-400 uppercase mb-2">Ciekawostka</div>
                   <p className="text-xs text-slate-600 italic leading-relaxed">
                     <BilingualText content={lesson.trivia} />
                   </p>
                 </>
               )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="col-span-1 lg:col-span-9 space-y-16">
          
          {/* Header / Intro */}
          <section id="intro" className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-white shadow-xl text-7xl mb-4 border-4 border-slate-50 relative">
              {lesson.emoji}
              <div className="absolute -bottom-2 -right-2 bg-italian-green text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                {lesson.difficulty_level}
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-serif font-bold text-slate-900 tracking-tight leading-tight">
              <BilingualText content={lesson.topic} />
            </h1>
            <div className="prose prose-lg text-slate-600 mx-auto font-light leading-relaxed">
              <p><BilingualText content={lesson.introduction} /></p>
            </div>
            <div className="flex justify-center gap-4 text-xs text-slate-400 font-medium uppercase tracking-widest pt-4">
               <span>{new Date(lesson.timestamp).toLocaleDateString()}</span>
               <span>•</span>
               <span>{lang === 'it' ? 'Articolo' : 'Artykuł'}</span>
            </div>
          </section>

          {/* Vocabulary Grid */}
          <section id="vocab" className="scroll-mt-24">
            <SectionHeading id="vocab" icon={BookOpenIcon} title={lang === 'it' ? 'Lessico & Dettagli' : 'Słownictwo i Szczegóły'} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lesson.vocabulary.map((item, idx) => (
                <div key={idx} className="group bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:border-italian-green/50 hover:shadow-md transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-italian-green transition-colors">{item.word}</h3>
                        {item.gender && (
                          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                            item.gender === 'm' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                            item.gender === 'f' ? 'bg-pink-50 text-pink-600 border-pink-100' :
                            'bg-slate-50 text-slate-500 border-slate-100'
                          }`}>
                            {item.gender}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-serif italic text-slate-500 mb-2">{item.translation}</p>
                    </div>
                    <button 
                      onClick={() => speak(item.word)}
                      className="p-2 rounded-full bg-slate-50 text-slate-400 hover:bg-italian-green hover:text-white transition-colors"
                    >
                      <SpeakerWaveIcon className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-2 mt-2">
                    {item.plural && (
                      <div className="flex gap-2 text-xs">
                        <span className="text-slate-400">l.mn:</span>
                        <span className="font-medium text-slate-700">{item.plural}</span>
                      </div>
                    )}
                    {item.audio_hint && (
                       <div className="flex gap-2 text-xs">
                        <span className="text-slate-400">wymowa:</span>
                        <span className="font-mono text-slate-500">[{item.audio_hint}]</span>
                      </div>
                    )}
                    <p className="text-xs text-slate-500 border-t border-slate-100 pt-2 mt-2">
                      <BilingualText content={item.definition} />
                    </p>
                    <div className="bg-slate-50 p-2 rounded-lg mt-2 text-xs text-slate-700 italic border-l-2 border-italian-green/30">
                      "<BilingualText content={item.context_sentence} />"
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Useful Phrases (New Section) */}
          <section id="phrases" className="scroll-mt-24">
             <SectionHeading id="phrases" icon={ChatBubbleBottomCenterTextIcon} title={lang === 'it' ? 'Frasi Utili' : 'Przydatne Zwroty'} />
             <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-1 overflow-hidden shadow-xl">
               <div className="bg-white/5 backdrop-blur-sm p-6 sm:p-8 space-y-4">
                 {lesson.useful_phrases.map((phrase, idx) => (
                   <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                     <div className="flex-1">
                       <div className="flex items-center gap-3">
                         <span className="text-italian-green font-bold font-serif text-lg">{phrase.expression}</span>
                         <button onClick={() => speak(phrase.expression)} className="text-slate-400 hover:text-italian-green"><SpeakerWaveIcon className="w-4 h-4"/></button>
                       </div>
                       <div className="text-slate-300 text-sm mt-1">{phrase.translation}</div>
                     </div>
                     <div className="sm:w-1/3 text-xs text-slate-400 italic border-l border-white/10 pl-4">
                       <BilingualText content={phrase.context} />
                     </div>
                   </div>
                 ))}
               </div>
             </div>
          </section>

          {/* Grammar & Mistakes */}
          <section id="grammar" className="scroll-mt-24">
            <SectionHeading id="grammar" icon={AcademicCapIcon} title={lang === 'it' ? 'Focus Grammaticale' : 'Gramatyka'} />
            
            <div className="space-y-8">
              {lesson.grammar.map((point, idx) => (
                <div key={idx} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-5">
                      <AcademicCapIcon className="w-32 h-32" />
                   </div>
                   <h3 className="text-xl font-bold text-italian-green mb-4 relative z-10"><BilingualText content={point.title} /></h3>
                   <div className="prose prose-slate text-slate-600 mb-6 relative z-10">
                     <p><BilingualText content={point.content} /></p>
                   </div>
                   <div className="grid grid-cols-1 gap-2 relative z-10">
                      {point.examples.map((ex, i) => (
                        <div key={i} className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                           <div className="w-1.5 h-1.5 rounded-full bg-italian-green shrink-0"></div>
                           <p className="text-sm font-medium text-slate-700"><BilingualText content={ex} /></p>
                        </div>
                      ))}
                   </div>
                </div>
              ))}
            </div>

            {/* Common Mistakes Block */}
            <div id="mistakes" className="mt-12 scroll-mt-24">
              <div className="bg-amber-50 rounded-3xl p-8 border border-amber-100">
                <div className="flex items-center gap-3 mb-6 text-amber-800">
                   <ExclamationTriangleIcon className="w-6 h-6" />
                   <h3 className="font-bold text-lg">Attenzione agli Errori (Uwaga na błędy)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {lesson.common_mistakes.map((mistake, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-amber-100/50">
                       <div className="mb-3">
                          <div className="text-xs font-bold text-red-500 uppercase mb-1">Źle (Wrong)</div>
                          <div className="line-through text-slate-400 font-mono text-sm">{mistake.wrong}</div>
                       </div>
                       <div className="mb-3">
                          <div className="text-xs font-bold text-green-600 uppercase mb-1">Dobrze (Correct)</div>
                          <div className="text-slate-800 font-bold font-mono text-sm">{mistake.correct}</div>
                       </div>
                       <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
                          <BilingualText content={mistake.explanation} />
                       </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Dialogue - Script Style */}
          <section id="dialogue" className="scroll-mt-24">
            <SectionHeading id="dialogue" icon={ListBulletIcon} title={lang === 'it' ? 'Dialogo in Contesto' : 'Dialog w Kontekście'} />
            
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-slate-700"><BilingualText content={lesson.dialogue.title} /></h3>
               </div>
               <div className="divide-y divide-slate-100">
                  {lesson.dialogue.lines.map((line, idx) => (
                    <div key={idx} className="p-6 hover:bg-slate-50 transition-colors flex gap-4 md:gap-8 group">
                       <div className="w-16 shrink-0 text-center">
                          <div className="w-10 h-10 mx-auto rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs mb-1">
                            {line.speaker.substring(0, 2)}
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{line.speaker}</span>
                       </div>
                       <div className="flex-1">
                          {line.annotation && (
                            <span className="text-[10px] text-slate-400 italic mb-1 block">
                              ( <BilingualText content={line.annotation} /> )
                            </span>
                          )}
                          <p className="text-lg text-slate-800 font-medium cursor-pointer hover:text-italian-green transition-colors" onClick={() => speak(line.text.it)}>
                             <BilingualText content={line.text} />
                          </p>
                          <button 
                            onClick={() => speak(line.text.it)}
                            className="mt-2 text-xs font-bold text-italian-green opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                          >
                             <PlayIcon className="w-3 h-3" /> Odsłuchaj
                          </button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </section>

          {/* Culture & Idiom Grid */}
          <section id="culture" className="scroll-mt-24 pb-12">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Culture Card */}
                <div className="bg-italian-white rounded-3xl p-8 border border-slate-200 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-40 h-40 bg-italian-green/5 rounded-full -mr-10 -mt-10"></div>
                   <div className="flex items-center gap-2 mb-6 text-slate-800">
                      <GlobeEuropeAfricaIcon className="w-6 h-6" />
                      <h3 className="font-bold uppercase tracking-wider text-sm">Cultura Italiana</h3>
                   </div>
                   <h4 className="text-2xl font-serif font-bold text-slate-900 mb-4">
                      <BilingualText content={lesson.culture.title} />
                   </h4>
                   <div className="prose prose-sm text-slate-600 leading-relaxed">
                      <BilingualText content={lesson.culture.content} />
                   </div>
                </div>

                {/* Idiom Card */}
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-3xl p-8 shadow-xl relative">
                   <div className="flex items-center gap-2 mb-6 text-indigo-200">
                      <LightBulbIcon className="w-6 h-6" />
                      <h3 className="font-bold uppercase tracking-wider text-sm">Modo di Dire</h3>
                   </div>
                   
                   <div className="text-4xl font-serif font-bold mb-2 text-white">"{lesson.idiom.phrase}"</div>
                   
                   <div className="mt-8 space-y-4 bg-white/10 p-4 rounded-xl border border-white/10 backdrop-blur-md">
                      <div>
                         <span className="text-[10px] uppercase font-bold text-indigo-200">Znaczenie</span>
                         <p className="text-indigo-50 font-medium"><BilingualText content={lesson.idiom.meaning} /></p>
                      </div>
                      <div className="pt-2 border-t border-white/10">
                         <span className="text-[10px] uppercase font-bold text-indigo-200">Dosłownie</span>
                         <p className="text-indigo-200 italic text-sm"><BilingualText content={lesson.idiom.literal} /></p>
                      </div>
                      {lesson.idiom.origin && (
                        <div className="pt-2 border-t border-white/10">
                           <span className="text-[10px] uppercase font-bold text-indigo-200">Pochodzenie</span>
                           <p className="text-indigo-200 text-xs"><BilingualText content={lesson.idiom.origin} /></p>
                        </div>
                      )}
                   </div>
                </div>
             </div>
          </section>

        </div>
      </div>
    </div>
  );
};