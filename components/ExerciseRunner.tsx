import React, { useState, useEffect, useCallback } from 'react';
import {
  XMarkIcon,
  CheckIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  TrophyIcon,
  LightBulbIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { Exercise, ExerciseSet, ExerciseAttempt } from '../types';
import { useLang } from '../context/LangContext';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ExerciseRunnerProps {
  exerciseSet: ExerciseSet;
  onClose: () => void;
  initialIndex?: number;
}

// ─── Types for runner state ────────────────────────────────────────────────────

type Phase = 'answering' | 'feedback' | 'finished';

interface RunnerState {
  index: number;
  phase: Phase;
  attempts: ExerciseAttempt[];
  userAnswers: (string | null)[];
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/[.,!?;:'"„"]/g, '').replace(/\s+/g, ' ');
}

function isCorrectText(userInput: string, correct: string, acceptable?: string[]): boolean {
  const n = normalize(userInput);
  if (n === normalize(correct)) return true;
  if (acceptable) return acceptable.some(a => normalize(a) === n);
  return false;
}

// ─── Type badge ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, { pl: string; icon: string; color: string }> = {
  multiple_choice:     { pl: 'Wybór wielokrotny',    icon: '🔘', color: '#3b82f6' },
  fill_blank:          { pl: 'Uzupełnij lukę',       icon: '✏️', color: '#8b5cf6' },
  translation_tl_pl:   { pl: 'Tłumaczenie → PL',    icon: '🔄', color: '#06b6d4' },
  translation_pl_tl:   { pl: 'Tłumaczenie → TL',    icon: '🔄', color: '#0891b2' },
  matching:            { pl: 'Dopasowywanie',         icon: '🔗', color: '#f59e0b' },
  word_order:          { pl: 'Ułóż zdanie',           icon: '🔀', color: '#ec4899' },
  true_false:          { pl: 'Prawda / Fałsz',        icon: '⚖️',  color: '#10b981' },
  error_correction:    { pl: 'Popraw błąd',           icon: '🔍', color: '#ef4444' },
  conjugation:         { pl: 'Odmiana',               icon: '📝', color: '#f97316' },
  gap_fill_wordbank:   { pl: 'Bank słów',             icon: '🗃️', color: '#6366f1' },
  dialogue_completion: { pl: 'Uzupełnij dialog',      icon: '💬', color: '#14b8a6' },
  definition_match:    { pl: 'Definicja',             icon: '📖', color: '#84cc16' },
};

const DIFF_COLORS: Record<string, { bg: string; text: string }> = {
  easy:   { bg: '#d1fae5', text: '#065f46' },
  medium: { bg: '#fef3c7', text: '#92400e' },
  hard:   { bg: '#fee2e2', text: '#991b1b' },
};
const DIFF_LABELS: Record<string, string> = {
  easy: 'Łatwe', medium: 'Średnie', hard: 'Trudne',
};

// ─── Individual exercise renderers ───────────────────────────────────────────

// --- Multiple Choice ---
const MultipleChoiceUI: React.FC<{
  ex: Exercise & { type: 'multiple_choice' };
  phase: Phase;
  onAnswer: (idx: number) => void;
  selected: number | null;
}> = ({ ex, phase, onAnswer, selected }) => (
  <div className="space-y-3">
    <p className="text-base font-semibold leading-relaxed" style={{ color: 'var(--c-text)' }}>
      {ex.question}
    </p>
    {ex.question_pl && (
      <p className="text-sm italic" style={{ color: 'var(--c-muted)' }}>{ex.question_pl}</p>
    )}
    <div className="grid grid-cols-1 gap-2 mt-3">
      {ex.options.map((opt, i) => {
        const isSelected = selected === i;
        const isCorrect = i === ex.correct_index;
        let bg = 'var(--c-bg)';
        let border = 'var(--c-border)';
        let textColor = 'var(--c-text)';
        if (phase === 'feedback') {
          if (isCorrect) { bg = '#d1fae5'; border = '#6ee7b7'; textColor = '#065f46'; }
          else if (isSelected && !isCorrect) { bg = '#fee2e2'; border = '#fca5a5'; textColor = '#991b1b'; }
        } else if (isSelected) {
          border = 'var(--c-green)';
        }
        return (
          <button key={i}
            onClick={() => phase === 'answering' && onAnswer(i)}
            disabled={phase === 'feedback'}
            className="w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 text-sm font-medium"
            style={{ background: bg, border: `1.5px solid ${border}`, color: textColor }}
          >
            <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border"
              style={{ borderColor: border, background: phase === 'feedback' && isCorrect ? '#6ee7b7' : phase === 'feedback' && isSelected && !isCorrect ? '#fca5a5' : 'transparent' }}>
              {String.fromCharCode(65 + i)}
            </span>
            {opt}
            {phase === 'feedback' && isCorrect && <CheckCircleIcon className="w-4 h-4 ml-auto shrink-0" style={{ color: '#059669' }} />}
            {phase === 'feedback' && isSelected && !isCorrect && <XCircleIcon className="w-4 h-4 ml-auto shrink-0" style={{ color: '#dc2626' }} />}
          </button>
        );
      })}
    </div>
  </div>
);

// --- Fill Blank ---
const FillBlankUI: React.FC<{
  ex: Exercise & { type: 'fill_blank' };
  phase: Phase;
  value: string;
  onChange: (v: string) => void;
  isCorrect: boolean;
}> = ({ ex, phase, value, onChange, isCorrect }) => {
  const parts = ex.sentence.split('___');
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl text-base leading-relaxed" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
        {parts[0]}
        <span className="inline-block mx-1 px-3 py-0.5 rounded-lg font-bold border"
          style={{
            minWidth: 80,
            background: phase === 'feedback' ? (isCorrect ? '#d1fae5' : '#fee2e2') : 'var(--c-surface)',
            borderColor: phase === 'feedback' ? (isCorrect ? '#6ee7b7' : '#fca5a5') : 'var(--c-border)',
            color: phase === 'feedback' ? (isCorrect ? '#065f46' : '#991b1b') : 'var(--c-text)',
          }}>
          {phase === 'feedback' ? (isCorrect ? value : ex.correct) : (value || '?')}
        </span>
        {parts[1]}
      </div>
      {ex.hint && (
        <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--c-muted)' }}>
          <LightBulbIcon className="w-3.5 h-3.5 shrink-0" />
          {ex.hint}
        </p>
      )}
      {phase === 'answering' && (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Wpisz brakujące słowo…"
          autoFocus
          className="w-full px-4 py-2.5 rounded-xl text-sm border outline-none"
          style={{ background: 'var(--c-bg)', border: '1.5px solid var(--c-border)', color: 'var(--c-text)' }}
          onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
        />
      )}
      {phase === 'feedback' && !isCorrect && (
        <p className="text-sm" style={{ color: '#dc2626' }}>
          Twoja odpowiedź: <span className="font-bold line-through">{value}</span> → <span className="font-bold" style={{ color: '#059669' }}>{ex.correct}</span>
        </p>
      )}
    </div>
  );
};

// --- Translation ---
const TranslationUI: React.FC<{
  ex: Exercise & { type: 'translation_tl_pl' | 'translation_pl_tl' };
  phase: Phase;
  value: string;
  onChange: (v: string) => void;
  isCorrect: boolean;
}> = ({ ex, phase, value, onChange, isCorrect }) => (
  <div className="space-y-4">
    <div className="p-4 rounded-xl" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
      <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--c-faint)' }}>
        {ex.type === 'translation_tl_pl' ? 'Zdanie w języku obcym:' : 'Zdanie po polsku:'}
      </p>
      <p className="text-base font-semibold" style={{ color: 'var(--c-text)' }}>{ex.source}</p>
    </div>
    {phase === 'answering' ? (
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Wpisz tłumaczenie…"
        autoFocus
        rows={2}
        className="w-full px-4 py-2.5 rounded-xl text-sm border outline-none resize-none"
        style={{ background: 'var(--c-bg)', border: '1.5px solid var(--c-border)', color: 'var(--c-text)' }}
      />
    ) : (
      <div className="space-y-2">
        <div className="p-3 rounded-xl" style={{ background: isCorrect ? '#d1fae5' : '#fee2e2', border: `1px solid ${isCorrect ? '#6ee7b7' : '#fca5a5'}` }}>
          <p className="text-xs font-bold mb-0.5" style={{ color: isCorrect ? '#059669' : '#dc2626' }}>
            {isCorrect ? 'Twoja odpowiedź ✓' : 'Twoja odpowiedź ✗'}
          </p>
          <p className="text-sm" style={{ color: isCorrect ? '#065f46' : '#991b1b' }}>{value || '(brak odpowiedzi)'}</p>
        </div>
        {!isCorrect && (
          <div className="p-3 rounded-xl" style={{ background: '#d1fae5', border: '1px solid #6ee7b7' }}>
            <p className="text-xs font-bold mb-0.5" style={{ color: '#059669' }}>Przykładowa poprawna odpowiedź:</p>
            <p className="text-sm" style={{ color: '#065f46' }}>{ex.correct}</p>
          </div>
        )}
      </div>
    )}
  </div>
);

// --- Matching ---
interface MatchingState {
  selectedLeft: string | null;
  selectedRight: string | null;
  matched: Record<string, string>; // leftId → rightId
  shuffledLeft: Array<{ id: string; left: string }>;
  shuffledRight: Array<{ id: string; right: string }>;
}

const MatchingUI: React.FC<{
  ex: Exercise & { type: 'matching' };
  phase: Phase;
  matchState: MatchingState;
  setMatchState: (s: MatchingState) => void;
}> = ({ ex, phase, matchState, setMatchState }) => {
  const { shuffledLeft, shuffledRight, selectedLeft, matched } = matchState;
  const pairsMap = Object.fromEntries(ex.pairs.map(p => [p.id, p]));

  const selectLeft = (id: string) => {
    if (phase !== 'answering') return;
    if (matched[id]) return; // already matched
    setMatchState({ ...matchState, selectedLeft: matchState.selectedLeft === id ? null : id });
  };

  const selectRight = (id: string) => {
    if (phase !== 'answering') return;
    if (Object.values(matched).includes(id)) return; // already matched
    if (!matchState.selectedLeft) return;
    const leftId = matchState.selectedLeft;
    setMatchState({
      ...matchState,
      matched: { ...matched, [leftId]: id },
      selectedLeft: null,
    });
  };

  const unmatch = (leftId: string) => {
    if (phase !== 'answering') return;
    const next = { ...matched };
    delete next[leftId];
    setMatchState({ ...matchState, matched: next });
  };

  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: 'var(--c-muted)' }}>
        Kliknij słowo po lewej, następnie odpowiedające po prawej.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {/* Left column */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-center mb-1" style={{ color: 'var(--c-faint)' }}>Słowo</p>
          {shuffledLeft.map(({ id, left }) => {
            const isMatched = id in matched;
            const matchedRightId = matched[id];
            const isCorrectMatch = phase === 'feedback' && isMatched && matchedRightId === id;
            const isWrongMatch = phase === 'feedback' && isMatched && matchedRightId !== id;
            const isSelected = selectedLeft === id;
            return (
              <button key={id}
                onClick={() => isMatched ? unmatch(id) : selectLeft(id)}
                className="w-full px-3 py-2 rounded-lg text-sm font-medium text-left transition-all"
                style={{
                  background: isCorrectMatch ? '#d1fae5' : isWrongMatch ? '#fee2e2' : isMatched ? '#ede9fe' : isSelected ? '#dbeafe' : 'var(--c-bg)',
                  border: `1.5px solid ${isCorrectMatch ? '#6ee7b7' : isWrongMatch ? '#fca5a5' : isMatched ? '#c4b5fd' : isSelected ? '#93c5fd' : 'var(--c-border)'}`,
                  color: isCorrectMatch ? '#065f46' : isWrongMatch ? '#991b1b' : 'var(--c-text)',
                }}
              >
                {left}
                {phase === 'feedback' && isMatched && (
                  <span className="ml-1">{isCorrectMatch ? ' ✓' : ' ✗'}</span>
                )}
              </button>
            );
          })}
        </div>
        {/* Right column */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-center mb-1" style={{ color: 'var(--c-faint)' }}>Znaczenie</p>
          {shuffledRight.map(({ id, right }) => {
            const isMatchedLeft = Object.entries(matched).find(([, rId]) => rId === id);
            const isUsed = Boolean(isMatchedLeft);
            const isCorrectTarget = phase === 'feedback' && isMatchedLeft && isMatchedLeft[0] === id;
            const isWrongTarget = phase === 'feedback' && isMatchedLeft && isMatchedLeft[0] !== id;
            return (
              <button key={id}
                onClick={() => selectRight(id)}
                className="w-full px-3 py-2 rounded-lg text-sm font-medium text-left transition-all"
                style={{
                  background: isCorrectTarget ? '#d1fae5' : isWrongTarget ? '#fee2e2' : isUsed ? '#ede9fe' : 'var(--c-bg)',
                  border: `1.5px solid ${isCorrectTarget ? '#6ee7b7' : isWrongTarget ? '#fca5a5' : isUsed ? '#c4b5fd' : 'var(--c-border)'}`,
                  color: isCorrectTarget ? '#065f46' : isWrongTarget ? '#991b1b' : 'var(--c-text)',
                  opacity: phase !== 'answering' ? 1 : isUsed ? 0.7 : 1,
                }}
              >
                {right}
              </button>
            );
          })}
        </div>
      </div>
      {phase === 'feedback' && (
        <div className="text-xs space-y-1">
          <p className="font-bold" style={{ color: 'var(--c-muted)' }}>Poprawne pary:</p>
          {ex.pairs.map(p => (
            <p key={p.id} style={{ color: 'var(--c-muted)' }}>{p.left} → {p.right}</p>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Word Order ---
const WordOrderUI: React.FC<{
  ex: Exercise & { type: 'word_order' };
  phase: Phase;
  selectedWords: string[];
  setSelectedWords: (w: string[]) => void;
  availableWords: string[];
  setAvailableWords: (w: string[]) => void;
  isCorrect: boolean;
}> = ({ ex, phase, selectedWords, setSelectedWords, availableWords, setAvailableWords, isCorrect }) => {
  const addWord = (word: string, fromIdx: number) => {
    if (phase !== 'answering') return;
    const newAvail = [...availableWords];
    newAvail.splice(fromIdx, 1);
    setAvailableWords(newAvail);
    setSelectedWords([...selectedWords, word]);
  };
  const removeWord = (idx: number) => {
    if (phase !== 'answering') return;
    const word = selectedWords[idx];
    const newSel = [...selectedWords];
    newSel.splice(idx, 1);
    setSelectedWords(newSel);
    setAvailableWords([...availableWords, word]);
  };
  return (
    <div className="space-y-4">
      {ex.translation_hint && (
        <p className="text-sm italic" style={{ color: 'var(--c-muted)' }}>
          Znaczenie: <span className="font-semibold">{ex.translation_hint}</span>
        </p>
      )}
      {/* Sentence being built */}
      <div className="min-h-12 p-3 rounded-xl flex flex-wrap gap-2 items-center"
        style={{ background: 'var(--c-bg)', border: `1.5px solid ${phase === 'feedback' ? (isCorrect ? '#6ee7b7' : '#fca5a5') : 'var(--c-border)'}` }}>
        {selectedWords.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--c-faint)' }}>Kliknij słowa poniżej by ułożyć zdanie…</p>
        )}
        {selectedWords.map((w, i) => (
          <button key={i}
            onClick={() => removeWord(i)}
            className="px-3 py-1 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: phase === 'feedback' ? (isCorrect ? '#d1fae5' : '#fee2e2') : 'var(--c-green)',
              color: phase === 'feedback' ? (isCorrect ? '#065f46' : '#991b1b') : '#fff',
            }}
          >
            {w}
          </button>
        ))}
      </div>
      {/* Available words */}
      {phase === 'answering' && (
        <div className="flex flex-wrap gap-2">
          {availableWords.map((w, i) => (
            <button key={i}
              onClick={() => addWord(w, i)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all border"
              style={{ background: 'var(--c-surface)', border: '1.5px solid var(--c-border)', color: 'var(--c-text)' }}
            >
              {w}
            </button>
          ))}
        </div>
      )}
      {phase === 'feedback' && !isCorrect && (
        <p className="text-sm" style={{ color: '#059669' }}>
          Poprawna kolejność: <span className="font-bold">{ex.correct}</span>
        </p>
      )}
    </div>
  );
};

// --- True / False ---
const TrueFalseUI: React.FC<{
  ex: Exercise & { type: 'true_false' };
  phase: Phase;
  onAnswer: (v: boolean) => void;
  selected: boolean | null;
}> = ({ ex, phase, onAnswer, selected }) => {
  const answerTrue = selected === true;
  const answerFalse = selected === false;
  const correctTrue = ex.is_true === true;
  const correctFalse = ex.is_true === false;
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl text-base font-medium leading-relaxed"
        style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}>
        {ex.statement}
      </div>
      {ex.statement_pl && (
        <p className="text-sm italic" style={{ color: 'var(--c-muted)' }}>{ex.statement_pl}</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        {[true, false].map(val => {
          const label = val ? '✅ Prawda' : '❌ Fałsz';
          const isSelected = val ? answerTrue : answerFalse;
          const isCorrect = val === ex.is_true;
          let bg = 'var(--c-bg)';
          let border = 'var(--c-border)';
          let text = 'var(--c-text)';
          if (phase === 'feedback') {
            if (isCorrect) { bg = '#d1fae5'; border = '#6ee7b7'; text = '#065f46'; }
            else if (isSelected) { bg = '#fee2e2'; border = '#fca5a5'; text = '#991b1b'; }
          } else if (isSelected) {
            border = 'var(--c-green)'; bg = '#d1fae5';
          }
          return (
            <button key={String(val)}
              onClick={() => phase === 'answering' && onAnswer(val)}
              disabled={phase === 'feedback'}
              className="py-4 rounded-xl text-base font-bold transition-all"
              style={{ background: bg, border: `2px solid ${border}`, color: text }}
            >
              {label}
            </button>
          );
        })}
      </div>
      {phase === 'feedback' && !ex.is_true && ex.correction && (
        <div className="p-3 rounded-xl text-sm" style={{ background: '#d1fae5', border: '1px solid #6ee7b7' }}>
          <p className="font-bold text-xs mb-1" style={{ color: '#059669' }}>Poprawna wersja:</p>
          <p style={{ color: '#065f46' }}>{ex.correction}</p>
        </div>
      )}
    </div>
  );
};

// --- Error Correction ---
const ErrorCorrectionUI: React.FC<{
  ex: Exercise & { type: 'error_correction' };
  phase: Phase;
  value: string;
  onChange: (v: string) => void;
  isCorrect: boolean;
}> = ({ ex, phase, value, onChange, isCorrect }) => (
  <div className="space-y-4">
    <div className="p-4 rounded-xl" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
      <p className="text-xs font-bold uppercase mb-1" style={{ color: '#c2410c' }}>Zdanie z błędem:</p>
      <p className="text-base font-medium" style={{ color: '#9a3412' }}>{ex.incorrect_sentence}</p>
      <p className="text-xs mt-1" style={{ color: '#c2410c' }}>Typ błędu: {ex.error_type}</p>
    </div>
    {phase === 'answering' ? (
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Wpisz poprawioną wersję…"
        autoFocus
        className="w-full px-4 py-2.5 rounded-xl text-sm border outline-none"
        style={{ background: 'var(--c-bg)', border: '1.5px solid var(--c-border)', color: 'var(--c-text)' }}
      />
    ) : (
      <div className="space-y-2">
        <div className="p-3 rounded-xl" style={{ background: isCorrect ? '#d1fae5' : '#fee2e2', border: `1px solid ${isCorrect ? '#6ee7b7' : '#fca5a5'}` }}>
          <p className="text-xs font-bold mb-0.5" style={{ color: isCorrect ? '#059669' : '#dc2626' }}>
            Twoja odpowiedź {isCorrect ? '✓' : '✗'}
          </p>
          <p className="text-sm" style={{ color: isCorrect ? '#065f46' : '#991b1b' }}>{value || '(brak)'}</p>
        </div>
        {!isCorrect && (
          <div className="p-3 rounded-xl" style={{ background: '#d1fae5', border: '1px solid #6ee7b7' }}>
            <p className="text-xs font-bold mb-0.5" style={{ color: '#059669' }}>Poprawna wersja:</p>
            <p className="text-sm" style={{ color: '#065f46' }}>{ex.correct_sentence}</p>
          </div>
        )}
      </div>
    )}
  </div>
);

// --- Conjugation ---
const ConjugationUI: React.FC<{
  ex: Exercise & { type: 'conjugation' };
  phase: Phase;
  value: string;
  onChange: (v: string) => void;
  isCorrect: boolean;
}> = ({ ex, phase, value, onChange, isCorrect }) => (
  <div className="space-y-4">
    <div className="p-4 rounded-xl text-center" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
      <p className="text-xs text-center mb-2 font-medium" style={{ color: 'var(--c-muted)' }}>
        Podaj formę czasownika w {ex.tense}
      </p>
      <p className="text-2xl font-serif font-bold" style={{ color: 'var(--c-text)' }}>{ex.verb}</p>
      <p className="text-sm mt-1" style={{ color: 'var(--c-faint)' }}>
        {ex.pronoun} <span className="text-xs">({ex.pronoun_pl})</span>
      </p>
    </div>
    {phase === 'answering' ? (
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={`${ex.pronoun} ___`}
        autoFocus
        className="w-full px-4 py-2.5 rounded-xl text-sm border outline-none text-center font-bold"
        style={{ background: 'var(--c-bg)', border: '1.5px solid var(--c-border)', color: 'var(--c-text)' }}
      />
    ) : (
      <div className="p-3 rounded-xl text-center" style={{ background: isCorrect ? '#d1fae5' : '#fee2e2', border: `1px solid ${isCorrect ? '#6ee7b7' : '#fca5a5'}` }}>
        <p className="text-xs font-bold" style={{ color: isCorrect ? '#059669' : '#dc2626' }}>
          {isCorrect ? '✓ Poprawnie!' : `✗ Twoja odpowiedź: ${value}`}
        </p>
        {!isCorrect && (
          <p className="text-base font-bold mt-1" style={{ color: '#059669' }}>
            {ex.pronoun} <span>{ex.correct}</span>
          </p>
        )}
      </div>
    )}
  </div>
);

// --- Gap Fill Wordbank ---
const GapFillWordbankUI: React.FC<{
  ex: Exercise & { type: 'gap_fill_wordbank' };
  phase: Phase;
  filledAnswers: (string | null)[];
  setFilledAnswers: (a: (string | null)[]) => void;
  usedWords: Set<string>;
  setUsedWords: (s: Set<string>) => void;
  isCorrect: boolean;
}> = ({ ex, phase, filledAnswers, setFilledAnswers, usedWords, setUsedWords, isCorrect }) => {
  // Parse text into segments: text and gap markers _1_, _2_, etc.
  const gapCount = ex.correct_answers.length;
  const segments: Array<{ type: 'text' | 'gap'; content: string; gapIdx?: number }> = [];
  let remaining = ex.text;
  for (let i = 1; i <= gapCount; i++) {
    const marker = `_${i}_`;
    const idx = remaining.indexOf(marker);
    if (idx !== -1) {
      if (idx > 0) segments.push({ type: 'text', content: remaining.slice(0, idx) });
      segments.push({ type: 'gap', content: marker, gapIdx: i - 1 });
      remaining = remaining.slice(idx + marker.length);
    }
  }
  if (remaining) segments.push({ type: 'text', content: remaining });

  const fillGap = (gapIdx: number, word: string) => {
    if (phase !== 'answering') return;
    const prev = filledAnswers[gapIdx];
    const newFilled = [...filledAnswers];
    const newUsed = new Set(usedWords);
    if (prev) newUsed.delete(prev);
    newFilled[gapIdx] = word;
    newUsed.add(word);
    setFilledAnswers(newFilled);
    setUsedWords(newUsed);
  };

  const clearGap = (gapIdx: number) => {
    if (phase !== 'answering') return;
    const word = filledAnswers[gapIdx];
    const newFilled = [...filledAnswers];
    const newUsed = new Set(usedWords);
    if (word) newUsed.delete(word);
    newFilled[gapIdx] = null;
    setFilledAnswers(newFilled);
    setUsedWords(newUsed);
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl text-sm leading-8" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
        {segments.map((seg, i) => {
          if (seg.type === 'text') return <span key={i} style={{ color: 'var(--c-text)' }}>{seg.content}</span>;
          const gi = seg.gapIdx!;
          const filled = filledAnswers[gi];
          const correct = ex.correct_answers[gi];
          const gapCorrect = phase === 'feedback' && filled === correct;
          const gapWrong = phase === 'feedback' && filled !== correct;
          return (
            <button key={i}
              onClick={() => filled ? clearGap(gi) : undefined}
              className="inline-block mx-1 px-3 py-0.5 rounded-lg font-bold text-sm border transition-all"
              style={{
                minWidth: 80,
                background: gapCorrect ? '#d1fae5' : gapWrong ? '#fee2e2' : filled ? '#dbeafe' : 'var(--c-surface)',
                borderColor: gapCorrect ? '#6ee7b7' : gapWrong ? '#fca5a5' : filled ? '#93c5fd' : 'var(--c-border)',
                color: gapCorrect ? '#065f46' : gapWrong ? '#991b1b' : filled ? '#1e40af' : 'var(--c-faint)',
              }}
            >
              {filled || `(${gi + 1})`}
              {phase === 'feedback' && gapWrong && (
                <span className="ml-1" style={{ color: '#059669' }}>→ {correct}</span>
              )}
            </button>
          );
        })}
      </div>
      {/* Word bank */}
      <div className="flex flex-wrap gap-2">
        {ex.word_bank.map((word, i) => {
          const isUsed = usedWords.has(word);
          return (
            <button key={i}
              onClick={() => {
                if (phase !== 'answering') return;
                if (isUsed) return;
                // Fill the first empty gap
                const emptyIdx = filledAnswers.findIndex(f => f === null);
                if (emptyIdx !== -1) fillGap(emptyIdx, word);
              }}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all border"
              style={{
                background: isUsed ? 'var(--c-bg)' : 'var(--c-surface)',
                border: '1.5px solid var(--c-border)',
                color: isUsed ? 'var(--c-faint)' : 'var(--c-text)',
                textDecoration: isUsed ? 'line-through' : 'none',
                opacity: isUsed ? 0.5 : 1,
              }}
              disabled={isUsed || phase === 'feedback'}
            >
              {word}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// --- Dialogue Completion ---
const DialogueCompletionUI: React.FC<{
  ex: Exercise & { type: 'dialogue_completion' };
  phase: Phase;
  onAnswer: (idx: number) => void;
  selected: number | null;
}> = ({ ex, phase, onAnswer, selected }) => (
  <div className="space-y-4">
    {ex.context_pl && (
      <p className="text-xs italic" style={{ color: 'var(--c-muted)' }}>{ex.context_pl}</p>
    )}
    <div className="space-y-2">
      {ex.dialogue.map((line, i) => (
        <div key={i} className={`flex gap-2 ${i % 2 === 1 ? 'justify-end' : 'justify-start'}`}>
          <div className="max-w-[85%]">
            <p className="text-xs mb-0.5" style={{ color: 'var(--c-faint)' }}>{line.speaker}</p>
            <div className="px-3 py-2 rounded-xl text-sm"
              style={{
                background: line.is_blank
                  ? (phase === 'feedback' ? '#dbeafe' : '#ede9fe')
                  : 'var(--c-surface)',
                border: `1px solid ${line.is_blank ? '#93c5fd' : 'var(--c-border)'}`,
                color: line.is_blank ? '#1e40af' : 'var(--c-text)',
                fontWeight: line.is_blank ? 600 : 400,
              }}>
              {line.is_blank ? (phase === 'feedback'
                ? ex.options[ex.correct_index]
                : '???')
                : line.text}
            </div>
          </div>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 gap-2 mt-2">
      {ex.options.map((opt, i) => {
        const isSelected = selected === i;
        const isCorrect = i === ex.correct_index;
        let bg = 'var(--c-bg)'; let border = 'var(--c-border)'; let text = 'var(--c-text)';
        if (phase === 'feedback') {
          if (isCorrect) { bg = '#d1fae5'; border = '#6ee7b7'; text = '#065f46'; }
          else if (isSelected) { bg = '#fee2e2'; border = '#fca5a5'; text = '#991b1b'; }
        } else if (isSelected) { border = 'var(--c-green)'; }
        return (
          <button key={i}
            onClick={() => phase === 'answering' && onAnswer(i)}
            disabled={phase === 'feedback'}
            className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: bg, border: `1.5px solid ${border}`, color: text }}
          >
            {opt}
            {phase === 'feedback' && isCorrect && <span className="ml-2 text-xs">✓</span>}
            {phase === 'feedback' && isSelected && !isCorrect && <span className="ml-2 text-xs">✗</span>}
          </button>
        );
      })}
    </div>
  </div>
);

// --- Definition Match ---
const DefinitionMatchUI: React.FC<{
  ex: Exercise & { type: 'definition_match' };
  phase: Phase;
  onAnswer: (idx: number) => void;
  selected: number | null;
}> = ({ ex, phase, onAnswer, selected }) => (
  <div className="space-y-4">
    <div className="p-4 rounded-xl" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
      <p className="text-xs font-bold uppercase mb-1" style={{ color: 'var(--c-faint)' }}>Definicja:</p>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text)' }}>{ex.definition}</p>
      {ex.definition_pl && (
        <p className="text-xs italic mt-1.5" style={{ color: 'var(--c-muted)' }}>{ex.definition_pl}</p>
      )}
    </div>
    <div className="grid grid-cols-2 gap-2">
      {ex.options.map((opt, i) => {
        const isSelected = selected === i;
        const isCorrect = i === ex.correct_index;
        let bg = 'var(--c-bg)'; let border = 'var(--c-border)'; let text = 'var(--c-text)';
        if (phase === 'feedback') {
          if (isCorrect) { bg = '#d1fae5'; border = '#6ee7b7'; text = '#065f46'; }
          else if (isSelected) { bg = '#fee2e2'; border = '#fca5a5'; text = '#991b1b'; }
        } else if (isSelected) { border = 'var(--c-green)'; }
        return (
          <button key={i}
            onClick={() => phase === 'answering' && onAnswer(i)}
            disabled={phase === 'feedback'}
            className="px-4 py-3 rounded-xl text-sm font-semibold font-serif transition-all"
            style={{ background: bg, border: `1.5px solid ${border}`, color: text }}
          >
            {opt}
            {phase === 'feedback' && isCorrect && <span className="ml-1">✓</span>}
          </button>
        );
      })}
    </div>
  </div>
);

// ─── Main ExerciseRunner ───────────────────────────────────────────────────────

export const ExerciseRunner: React.FC<ExerciseRunnerProps> = ({
  exerciseSet,
  onClose,
  initialIndex = 0,
}) => {
  const { globalLang: l } = useLang();
  const exercises = exerciseSet.exercises;

  const [state, setState] = useState<RunnerState>({
    index: initialIndex,
    phase: 'answering',
    attempts: [],
    userAnswers: new Array(exercises.length).fill(null),
  });

  // Per-exercise UI state (reset when index changes)
  const [textInput, setTextInput] = useState('');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [selectedBool, setSelectedBool] = useState<boolean | null>(null);
  const [wordOrderSelected, setWordOrderSelected] = useState<string[]>([]);
  const [wordOrderAvailable, setWordOrderAvailable] = useState<string[]>([]);
  const [matchState, setMatchState] = useState<MatchingState>({
    selectedLeft: null, selectedRight: null, matched: {}, shuffledLeft: [], shuffledRight: [],
  });
  const [gapFillAnswers, setGapFillAnswers] = useState<(string | null)[]>([]);
  const [gapFillUsed, setGapFillUsed] = useState<Set<string>>(new Set());

  const currentEx = exercises[state.index];

  // Reset per-exercise state when index changes
  useEffect(() => {
    setTextInput('');
    setSelectedOption(null);
    setSelectedBool(null);
    setWordOrderSelected([]);

    if (currentEx?.type === 'word_order') {
      setWordOrderAvailable(shuffle(currentEx.words));
    }
    if (currentEx?.type === 'matching') {
      setMatchState({
        selectedLeft: null,
        selectedRight: null,
        matched: {},
        shuffledLeft: shuffle(currentEx.pairs.map(p => ({ id: p.id, left: p.left }))),
        shuffledRight: shuffle(currentEx.pairs.map(p => ({ id: p.id, right: p.right }))),
      });
    }
    if (currentEx?.type === 'gap_fill_wordbank') {
      setGapFillAnswers(new Array(currentEx.correct_answers.length).fill(null));
      setGapFillUsed(new Set());
    }
  }, [state.index]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (state.phase === 'answering') {
        if (e.key === 'Enter' && (currentEx?.type === 'translation_tl_pl' || currentEx?.type === 'translation_pl_tl' || currentEx?.type === 'fill_blank' || currentEx?.type === 'error_correction' || currentEx?.type === 'conjugation')) {
          e.preventDefault();
          checkAnswer();
        }
      } else if (state.phase === 'feedback') {
        if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          advance();
        }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const evaluateAnswer = useCallback((): boolean => {
    if (!currentEx) return false;
    switch (currentEx.type) {
      case 'multiple_choice':
        return selectedOption === currentEx.correct_index;
      case 'fill_blank':
        return isCorrectText(textInput, currentEx.correct);
      case 'translation_tl_pl':
      case 'translation_pl_tl':
        return isCorrectText(textInput, currentEx.correct, currentEx.acceptable);
      case 'matching': {
        const allCorrect = currentEx.pairs.every(p => matchState.matched[p.id] === p.id);
        return allCorrect && Object.keys(matchState.matched).length === currentEx.pairs.length;
      }
      case 'word_order':
        return normalize(wordOrderSelected.join(' ')) === normalize(currentEx.correct);
      case 'true_false':
        return selectedBool === currentEx.is_true;
      case 'error_correction':
        return isCorrectText(textInput, currentEx.correct_sentence);
      case 'conjugation':
        return isCorrectText(textInput, currentEx.correct);
      case 'gap_fill_wordbank':
        return currentEx.correct_answers.every((ans, i) => gapFillAnswers[i] === ans);
      case 'dialogue_completion':
        return selectedOption === currentEx.correct_index;
      case 'definition_match':
        return selectedOption === currentEx.correct_index;
      default:
        return false;
    }
  }, [currentEx, selectedOption, textInput, selectedBool, wordOrderSelected, matchState, gapFillAnswers]);

  const checkAnswer = useCallback(() => {
    const correct = evaluateAnswer();
    setState(prev => {
      const attempts = [...prev.attempts, { exerciseId: currentEx.id, correct }];
      const userAnswers = [...prev.userAnswers];
      userAnswers[prev.index] = String(correct);
      return { ...prev, phase: 'feedback', attempts, userAnswers };
    });
  }, [evaluateAnswer, currentEx]);

  const advance = useCallback(() => {
    const nextIndex = state.index + 1;
    if (nextIndex >= exercises.length) {
      setState(prev => ({ ...prev, phase: 'finished' }));
    } else {
      setState(prev => ({ ...prev, index: nextIndex, phase: 'answering' }));
    }
  }, [state.index, exercises.length]);

  const restart = () => {
    setState({
      index: 0,
      phase: 'answering',
      attempts: [],
      userAnswers: new Array(exercises.length).fill(null),
    });
  };

  const goTo = (i: number) => {
    setState(prev => ({ ...prev, index: i, phase: 'answering' }));
  };

  if (state.phase === 'finished') {
    const correct = state.attempts.filter(a => a.correct).length;
    const total = exercises.length;
    const pct = Math.round((correct / total) * 100);
    return (
      <div className="quiz-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="quiz-card" style={{ maxWidth: 520 }}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--c-border)' }}>
            <div className="flex items-center gap-2">
              <TrophyIcon className="w-5 h-5" style={{ color: 'var(--c-green)' }} />
              <span className="font-bold" style={{ color: 'var(--c-text)' }}>
                {l === 'pl' ? 'Wyniki ćwiczeń' : 'Exercise Results'}
              </span>
            </div>
            <button onClick={onClose} className="p-1 rounded-full" style={{ color: 'var(--c-faint)' }}>
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="p-6 flex flex-col items-center gap-5">
            <div className="text-6xl">{pct >= 80 ? '🏆' : pct >= 60 ? '🎓' : pct >= 40 ? '📚' : '💪'}</div>
            <div className="text-center">
              <p className="text-3xl font-bold font-serif" style={{ color: 'var(--c-text)' }}>{pct}%</p>
              <p className="text-sm mt-1" style={{ color: 'var(--c-muted)' }}>
                {correct} / {total} {l === 'pl' ? 'poprawnych odpowiedzi' : 'correct answers'}
              </p>
            </div>
            {/* Exercise result dots */}
            <div className="flex flex-wrap justify-center gap-2 max-w-sm">
              {exercises.map((ex, i) => {
                const attempt = state.attempts[i];
                const isOk = attempt?.correct;
                const typeInfo = TYPE_LABELS[ex.type] ?? { icon: '?', pl: ex.type, color: '#888' };
                return (
                  <button key={ex.id}
                    onClick={() => goTo(i)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all hover:scale-110"
                    style={{ background: isOk ? '#d1fae5' : '#fee2e2', border: `2px solid ${isOk ? '#6ee7b7' : '#fca5a5'}` }}
                    title={`${i + 1}. ${typeInfo.pl} – ${isOk ? 'Poprawnie' : 'Błąd'}`}
                  >
                    {isOk ? '✓' : '✗'}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button onClick={restart}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border transition-colors"
                style={{ border: '1px solid var(--c-border)', background: 'var(--c-bg)', color: 'var(--c-text)' }}
              >
                <ArrowPathIcon className="w-4 h-4" />
                {l === 'pl' ? 'Zacznij od nowa' : 'Restart'}
              </button>
              <button onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
                style={{ background: 'var(--c-green)' }}
              >
                {l === 'pl' ? 'Zakończ' : 'Finish'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const ex = currentEx;
  const typeInfo = TYPE_LABELS[ex.type] ?? { icon: '?', pl: ex.type, color: '#888' };
  const diffInfo = DIFF_COLORS[ex.difficulty] ?? { bg: '#f1f5f9', text: '#475569' };
  const isAnswered = state.phase === 'feedback';
  const currentAttempt = state.attempts.find(a => a.exerciseId === ex.id);
  const isCorrect = currentAttempt?.correct ?? false;
  const pct = Math.round((state.index / exercises.length) * 100);

  const canSubmit = (): boolean => {
    switch (ex.type) {
      case 'multiple_choice':
      case 'dialogue_completion':
      case 'definition_match':
        return selectedOption !== null;
      case 'fill_blank':
      case 'translation_tl_pl':
      case 'translation_pl_tl':
      case 'error_correction':
      case 'conjugation':
        return textInput.trim().length > 0;
      case 'matching':
        return Object.keys(matchState.matched).length === ex.pairs.length;
      case 'word_order':
        return wordOrderSelected.length === ex.words.length;
      case 'true_false':
        return selectedBool !== null;
      case 'gap_fill_wordbank':
        return gapFillAnswers.every(a => a !== null);
      default:
        return false;
    }
  };

  return (
    <div className="quiz-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="quiz-card" style={{ maxWidth: 560 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--c-border)' }}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base">{typeInfo.icon}</span>
            <span className="text-xs font-bold truncate" style={{ color: typeInfo.color }}>{typeInfo.pl}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: diffInfo.bg, color: diffInfo.text }}>
              {DIFF_LABELS[ex.difficulty]}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-bold" style={{ color: 'var(--c-muted)' }}>
              {state.index + 1} / {exercises.length}
            </span>
            <button onClick={onClose} className="p-1 rounded-full" style={{ color: 'var(--c-faint)' }}>
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="quiz-progress-track">
          <div className="quiz-progress-fill" style={{ width: `${pct}%` }} />
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 180px)' }}>
          {/* Focus + instruction */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--c-faint)' }}>
              {ex.focus}
            </p>
            <p className="text-sm font-semibold" style={{ color: 'var(--c-text)' }}>
              {ex.instruction_pl}
            </p>
            {ex.instruction_tl && (
              <p className="text-xs italic mt-0.5" style={{ color: 'var(--c-muted)' }}>{ex.instruction_tl}</p>
            )}
          </div>

          {/* Exercise-specific UI */}
          {ex.type === 'multiple_choice' && (
            <MultipleChoiceUI ex={ex} phase={state.phase} onAnswer={setSelectedOption} selected={selectedOption} />
          )}
          {ex.type === 'fill_blank' && (
            <FillBlankUI ex={ex} phase={state.phase} value={textInput} onChange={setTextInput} isCorrect={isCorrect} />
          )}
          {(ex.type === 'translation_tl_pl' || ex.type === 'translation_pl_tl') && (
            <TranslationUI ex={ex} phase={state.phase} value={textInput} onChange={setTextInput} isCorrect={isCorrect} />
          )}
          {ex.type === 'matching' && (
            <MatchingUI ex={ex} phase={state.phase} matchState={matchState} setMatchState={setMatchState} />
          )}
          {ex.type === 'word_order' && (
            <WordOrderUI ex={ex} phase={state.phase}
              selectedWords={wordOrderSelected} setSelectedWords={setWordOrderSelected}
              availableWords={wordOrderAvailable} setAvailableWords={setWordOrderAvailable}
              isCorrect={isCorrect} />
          )}
          {ex.type === 'true_false' && (
            <TrueFalseUI ex={ex} phase={state.phase} onAnswer={setSelectedBool} selected={selectedBool} />
          )}
          {ex.type === 'error_correction' && (
            <ErrorCorrectionUI ex={ex} phase={state.phase} value={textInput} onChange={setTextInput} isCorrect={isCorrect} />
          )}
          {ex.type === 'conjugation' && (
            <ConjugationUI ex={ex} phase={state.phase} value={textInput} onChange={setTextInput} isCorrect={isCorrect} />
          )}
          {ex.type === 'gap_fill_wordbank' && (
            <GapFillWordbankUI ex={ex} phase={state.phase}
              filledAnswers={gapFillAnswers} setFilledAnswers={setGapFillAnswers}
              usedWords={gapFillUsed} setUsedWords={setGapFillUsed}
              isCorrect={isCorrect} />
          )}
          {ex.type === 'dialogue_completion' && (
            <DialogueCompletionUI ex={ex} phase={state.phase} onAnswer={setSelectedOption} selected={selectedOption} />
          )}
          {ex.type === 'definition_match' && (
            <DefinitionMatchUI ex={ex} phase={state.phase} onAnswer={setSelectedOption} selected={selectedOption} />
          )}

          {/* Feedback explanation */}
          {isAnswered && (ex.explanation_pl || ex.explanation_tl) && (
            <div className="p-3 rounded-xl text-sm"
              style={{ background: isCorrect ? '#f0fdf4' : '#fffbeb', border: `1px solid ${isCorrect ? '#bbf7d0' : '#fde68a'}` }}>
              <div className="flex items-center gap-1.5 mb-1">
                <LightBulbIcon className="w-3.5 h-3.5" style={{ color: isCorrect ? '#059669' : '#d97706' }} />
                <span className="text-xs font-bold" style={{ color: isCorrect ? '#059669' : '#d97706' }}>
                  {isCorrect ? 'Doskonale!' : 'Wskazówka:'}
                </span>
              </div>
              <p style={{ color: isCorrect ? '#065f46' : '#92400e' }}>{ex.explanation_pl}</p>
              {ex.explanation_tl && (
                <p className="text-xs italic mt-1" style={{ color: 'var(--c-muted)' }}>{ex.explanation_tl}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t" style={{ borderColor: 'var(--c-border)' }}>
          <div className="flex gap-1">
            {exercises.map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full transition-all"
                style={{
                  background: state.attempts[i]?.correct === true
                    ? 'var(--c-green)'
                    : state.attempts[i]?.correct === false
                    ? '#ef4444'
                    : i === state.index
                    ? 'var(--c-text)'
                    : 'var(--c-border)',
                  transform: i === state.index ? 'scale(1.3)' : 'scale(1)',
                }}
              />
            ))}
          </div>

          {!isAnswered ? (
            <button
              onClick={checkAnswer}
              disabled={!canSubmit()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
              style={{ background: 'var(--c-green)' }}
            >
              <CheckIcon className="w-4 h-4" />
              Sprawdź
            </button>
          ) : (
            <button
              onClick={advance}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: 'var(--c-green)' }}
            >
              {state.index + 1 < exercises.length ? (
                <>Dalej <ArrowRightIcon className="w-4 h-4" /></>
              ) : (
                <>Zakończ <TrophyIcon className="w-4 h-4" /></>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
