import React, { useState } from 'react';
import { QuizQuestion } from '../types';

interface QuizSectionProps {
  questions: QuizQuestion[];
}

export const QuizSection: React.FC<QuizSectionProps> = ({ questions }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  const handleOptionClick = (index: number) => {
    if (showResult) return;
    setSelectedOption(index);
  };

  const checkAnswer = () => {
    if (selectedOption === null) return;
    
    const isCorrect = selectedOption === questions[currentQuestion].correct_index;
    if (isCorrect) setScore(s => s + 1);
    
    setShowResult(true);

    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(c => c + 1);
        setSelectedOption(null);
        setShowResult(false);
      } else {
        // Quiz finished state handled in render
      }
    }, 2000);
  };

  const isFinished = showResult && currentQuestion === questions.length - 1;

  if (isFinished) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center animate-fade-in">
        <div className="text-6xl mb-4">🏆</div>
        <h3 className="text-2xl font-bold text-slate-800 mb-2">Quiz Completato!</h3>
        <p className="text-slate-600 mb-6">Hai ottenuto {score} su {questions.length} punti.</p>
        <button 
          onClick={() => {
            setCurrentQuestion(0);
            setSelectedOption(null);
            setShowResult(false);
            setScore(0);
          }}
          className="px-6 py-2 bg-italian-green text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Ricomincia (Restart)
        </button>
      </div>
    );
  }

  const question = questions[currentQuestion];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <span className="bg-italian-green/10 text-italian-green p-1 rounded">
            Test
          </span>
          Mettiti alla prova
        </h3>
        <span className="text-xs font-medium text-slate-400">
          {currentQuestion + 1} / {questions.length}
        </span>
      </div>

      <div className="mb-6">
        <p className="text-lg text-slate-800 font-medium">{question.question}</p>
      </div>

      <div className="space-y-3">
        {question.options.map((option, idx) => {
          let buttonClass = "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ";
          
          if (showResult) {
            if (idx === question.correct_index) {
              buttonClass += "border-italian-green bg-italian-green/5 text-italian-green";
            } else if (idx === selectedOption) {
              buttonClass += "border-italian-red bg-italian-red/5 text-italian-red";
            } else {
              buttonClass += "border-slate-100 opacity-50";
            }
          } else {
            if (selectedOption === idx) {
              buttonClass += "border-slate-800 bg-slate-50";
            } else {
              buttonClass += "border-slate-100 hover:border-slate-300 hover:bg-slate-50";
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleOptionClick(idx)}
              className={buttonClass}
              disabled={showResult}
            >
              {option}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={checkAnswer}
          disabled={selectedOption === null || showResult}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            selectedOption !== null && !showResult
              ? 'bg-slate-900 text-white shadow-lg shadow-slate-200 hover:scale-105'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {showResult ? (currentQuestion < questions.length - 1 ? 'Prossima...' : 'Risultati') : 'Conferma'}
        </button>
      </div>
    </div>
  );
};