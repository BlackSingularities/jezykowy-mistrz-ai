import React, { useState, useEffect } from 'react';
import {
  AcademicCapIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  TrashIcon,
  PlayIcon,
  CheckCircleIcon,
  ClockIcon,
  ChevronRightIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import { ExerciseSet, TargetLang } from '../types';
import { loadAllExerciseSets, deleteExerciseSet } from '../services/exerciseService';
import { ExerciseRunner } from './ExerciseRunner';
import { useLang } from '../context/LangContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExercisesViewProps {
  onBack: () => void;
  onOpenLesson?: (lessonId: string) => void;
  targetLang: TargetLang;
}

// ─── Type labels summary ────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, string> = {
  multiple_choice:     '🔘',
  fill_blank:          '✏️',
  translation_tl_pl:   '🔄',
  translation_pl_tl:   '↩️',
  matching:            '🔗',
  word_order:          '🔀',
  true_false:          '⚖️',
  error_correction:    '🔍',
  conjugation:         '📝',
  gap_fill_wordbank:   '🗃️',
  dialogue_completion: '💬',
  definition_match:    '📖',
};

const DIFF_COLORS: Record<string, { bg: string; text: string }> = {
  A1: { bg: '#d1fae5', text: '#065f46' },
  A2: { bg: '#ccfbf1', text: '#0f766e' },
  B1: { bg: '#dbeafe', text: '#1e40af' },
  B2: { bg: '#e0e7ff', text: '#3730a3' },
  C1: { bg: '#ede9fe', text: '#5b21b6' },
};

// ─── Exercise Set Card ────────────────────────────────────────────────────────

const ExerciseSetCard: React.FC<{
  set: ExerciseSet;
  onStart: () => void;
  onDelete: () => void;
  onOpenLesson?: () => void;
  lang: string;
}> = ({ set, onStart, onDelete, onOpenLesson, lang }) => {
  const tl = set.targetLang;
  const topicTl = (set.lessonTopic as Record<string, string>)[tl] ?? set.lessonTopic.pl;
  const diffInfo = DIFF_COLORS[set.difficulty_level] ?? { bg: '#f1f5f9', text: '#475569' };
  const typeStats: Record<string, number> = {};
  for (const ex of set.exercises) {
    typeStats[ex.type] = (typeStats[ex.type] ?? 0) + 1;
  }
  const date = new Date(set.generatedAt).toLocaleDateString('pl-PL', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="card p-4 flex flex-col gap-3 transition-all hover:shadow-md"
      style={{ border: '1px solid var(--c-border)' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl shrink-0">{set.lessonEmoji}</span>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight truncate" style={{ color: 'var(--c-text)' }}>
              {lang === 'pl' ? set.lessonTopic.pl : topicTl}
            </p>
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--c-muted)' }}>
              {lang !== 'pl' ? set.lessonTopic.pl : topicTl}
            </p>
          </div>
        </div>
        <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{ background: diffInfo.bg, color: diffInfo.text }}>
          {set.difficulty_level}
        </span>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--c-muted)' }}>
        <span className="flex items-center gap-1">
          <AcademicCapIcon className="w-3.5 h-3.5" />
          {set.exercises.length} ćwiczeń
        </span>
        <span className="flex items-center gap-1">
          <ClockIcon className="w-3.5 h-3.5" />
          {date}
        </span>
      </div>

      {/* Type icons */}
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(typeStats).map(([type, count]) => (
          <span key={type}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px]"
            style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)', color: 'var(--c-muted)' }}
            title={type.replace(/_/g, ' ')}>
            {TYPE_ICONS[type] ?? '📌'} <span>{count}×</span>
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-1">
        <button
          onClick={onStart}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold text-white transition-all"
          style={{ background: 'var(--c-green)' }}
        >
          <PlayIcon className="w-4 h-4" />
          {lang === 'pl' ? 'Ćwicz' : 'Start'}
        </button>
        {onOpenLesson && (
          <button
            onClick={onOpenLesson}
            className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-medium border transition-all"
            style={{ border: '1px solid var(--c-border)', color: 'var(--c-muted)' }}
            title="Przejdź do lekcji"
          >
            <BookOpenIcon className="w-3.5 h-3.5" />
            Lekcja
          </button>
        )}
        <button
          onClick={e => { e.stopPropagation(); if (confirm('Usunąć ten zestaw ćwiczeń?')) onDelete(); }}
          className="p-2 rounded-xl transition-all border"
          style={{ border: '1px solid var(--c-border)', color: 'var(--c-faint)' }}
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ─── Main ExercisesView ───────────────────────────────────────────────────────

export const ExercisesView: React.FC<ExercisesViewProps> = ({
  onBack,
  onOpenLesson,
  targetLang,
}) => {
  const { globalLang: l } = useLang();
  const [exerciseSets, setExerciseSets] = useState<ExerciseSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSet, setActiveSet] = useState<ExerciseSet | null>(null);
  const [search, setSearch] = useState('');
  const [filterDiff, setFilterDiff] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);

  const loadSets = async () => {
    setLoading(true);
    try {
      const sets = await loadAllExerciseSets();
      // Filter by targetLang
      setExerciseSets(sets.filter(s => s.targetLang === targetLang));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSets(); }, [targetLang]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (lessonId: string) => {
    await deleteExerciseSet(lessonId);
    setExerciseSets(prev => prev.filter(s => s.lessonId !== lessonId));
  };

  // Filter
  const filtered = exerciseSets.filter(set => {
    if (filterDiff && set.difficulty_level !== filterDiff) return false;
    if (filterType) {
      const hasType = set.exercises.some(ex => ex.type === filterType);
      if (!hasType) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const tl = set.targetLang;
      const topicTl = (set.lessonTopic as Record<string, string>)[tl] ?? '';
      return (
        set.lessonTopic.pl.toLowerCase().includes(q) ||
        topicTl.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // All exercise types present across sets
  const allTypes = Array.from(new Set(exerciseSets.flatMap(s => s.exercises.map(e => e.type))));
  const allDiffs = Array.from(new Set(exerciseSets.map(s => s.difficulty_level)));

  if (activeSet) {
    return (
      <ExerciseRunner
        exerciseSet={activeSet}
        onClose={() => setActiveSet(null)}
      />
    );
  }

  const totalExercises = filtered.reduce((acc, s) => acc + s.exercises.length, 0);

  return (
    <div className="min-h-screen" style={{ background: 'var(--c-bg)' }}>
      {/* Navbar */}
      <nav className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b"
        style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
        <button onClick={onBack} className="p-1.5 rounded-lg transition-all" style={{ color: 'var(--c-muted)' }}>
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <AcademicCapIcon className="w-5 h-5 shrink-0" style={{ color: 'var(--c-green)' }} />
          <p className="font-bold truncate" style={{ color: 'var(--c-text)' }}>
            {l === 'pl' ? 'Moje ćwiczenia' : 'My Exercises'}
          </p>
          {!loading && exerciseSets.length > 0 && (
            <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: 'var(--c-green)', color: '#fff' }}>
              {exerciseSets.length}
            </span>
          )}
        </div>
        <button onClick={loadSets} className="p-1.5 rounded-lg transition-all" style={{ color: 'var(--c-muted)' }}>
          <ArrowPathIcon className="w-4 h-4" />
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Search + filters */}
        {exerciseSets.length > 0 && (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--c-faint)' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={l === 'pl' ? 'Szukaj ćwiczeń…' : 'Search exercises…'}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-sm border outline-none"
                style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}
              />
            </div>
            {/* Filter pills */}
            <div className="flex flex-wrap gap-2">
              {/* Difficulty */}
              {allDiffs.map(d => (
                <button key={d}
                  onClick={() => setFilterDiff(filterDiff === d ? null : d)}
                  className="px-3 py-1 rounded-full text-xs font-bold transition-all"
                  style={filterDiff === d
                    ? { background: DIFF_COLORS[d]?.bg ?? '#e0e7ff', color: DIFF_COLORS[d]?.text ?? '#3730a3', border: `1.5px solid ${DIFF_COLORS[d]?.text ?? '#3730a3'}` }
                    : { background: 'var(--c-bg)', color: 'var(--c-muted)', border: '1px solid var(--c-border)' }}>
                  {d}
                </button>
              ))}
              {/* Type filter */}
              {allTypes.slice(0, 4).map(t => (
                <button key={t}
                  onClick={() => setFilterType(filterType === t ? null : t)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                  style={filterType === t
                    ? { background: 'var(--c-green)', color: '#fff', border: '1.5px solid var(--c-green)' }
                    : { background: 'var(--c-bg)', color: 'var(--c-muted)', border: '1px solid var(--c-border)' }}>
                  {TYPE_ICONS[t] ?? ''} {t.replace(/_/g, ' ').replace('tl', 'TL').replace('pl', 'PL')}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <SparklesIcon className="w-8 h-8 animate-pulse" style={{ color: 'var(--c-green)' }} />
            <p className="text-sm" style={{ color: 'var(--c-muted)' }}>
              {l === 'pl' ? 'Ładowanie ćwiczeń…' : 'Loading exercises…'}
            </p>
          </div>
        )}

        {/* Empty state */}
        {!loading && exerciseSets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
              style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
              📚
            </div>
            <div>
              <p className="font-bold text-lg font-serif" style={{ color: 'var(--c-text)' }}>
                {l === 'pl' ? 'Brak ćwiczeń' : 'No exercises yet'}
              </p>
              <p className="text-sm mt-1 max-w-xs" style={{ color: 'var(--c-muted)' }}>
                {l === 'pl'
                  ? 'Przejdź do lekcji i wygeneruj ćwiczenia klikając przycisk "Generuj ćwiczenia".'
                  : 'Open a lesson and click "Generate exercises" to create your first exercise set.'}
              </p>
            </div>
            <button onClick={onBack}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: 'var(--c-green)' }}>
              <ArrowLeftIcon className="w-4 h-4" />
              {l === 'pl' ? 'Wróć do lekcji' : 'Back to lessons'}
            </button>
          </div>
        )}

        {/* Grid */}
        {!loading && filtered.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold" style={{ color: 'var(--c-faint)' }}>
                {filtered.length} {l === 'pl' ? 'zestawów' : 'sets'} · {totalExercises} {l === 'pl' ? 'ćwiczeń' : 'exercises'}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(set => (
                <ExerciseSetCard
                  key={set.lessonId}
                  set={set}
                  lang={l}
                  onStart={() => setActiveSet(set)}
                  onDelete={() => handleDelete(set.lessonId)}
                  onOpenLesson={onOpenLesson ? () => onOpenLesson(set.lessonId) : undefined}
                />
              ))}
            </div>
          </>
        )}

        {/* Filtered empty */}
        {!loading && exerciseSets.length > 0 && filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: 'var(--c-muted)' }}>
              {l === 'pl' ? 'Brak wyników dla wybranych filtrów.' : 'No results for current filters.'}
            </p>
            <button onClick={() => { setSearch(''); setFilterDiff(null); setFilterType(null); }}
              className="mt-3 text-xs underline" style={{ color: 'var(--c-green)' }}>
              {l === 'pl' ? 'Wyczyść filtry' : 'Clear filters'}
            </button>
          </div>
        )}

        {/* Summary stats at the bottom */}
        {!loading && exerciseSets.length > 0 && (
          <div className="mt-6 p-4 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-4"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
            <div className="text-center">
              <p className="text-2xl font-bold font-serif" style={{ color: 'var(--c-text)' }}>
                {exerciseSets.length}
              </p>
              <p className="text-xs" style={{ color: 'var(--c-muted)' }}>
                {l === 'pl' ? 'Zestawy' : 'Sets'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold font-serif" style={{ color: 'var(--c-text)' }}>
                {exerciseSets.reduce((a, s) => a + s.exercises.length, 0)}
              </p>
              <p className="text-xs" style={{ color: 'var(--c-muted)' }}>
                {l === 'pl' ? 'Ćwiczenia' : 'Exercises'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold font-serif" style={{ color: 'var(--c-text)' }}>
                {allTypes.length}
              </p>
              <p className="text-xs" style={{ color: 'var(--c-muted)' }}>
                {l === 'pl' ? 'Typy ćwiczeń' : 'Exercise types'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold font-serif" style={{ color: 'var(--c-green)' }}>
                {allDiffs.length}
              </p>
              <p className="text-xs" style={{ color: 'var(--c-muted)' }}>
                {l === 'pl' ? 'Poziomy' : 'Levels'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
