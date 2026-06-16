import React, { useState, useRef } from 'react';
import { apiUrl } from '../apiUrl';
import {
  XMarkIcon,
  SparklesIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid, ExclamationCircleIcon } from '@heroicons/react/24/solid';
import type { CorrectionResult, DetailedCorrectionResult } from '../services/aiService';
import { useLang, useTheme } from '../context/LangContext';
import { Flag } from './Flag';
import type { TargetLang } from '../types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface TextCorrectionViewProps {
  onClose: () => void;
  initialLang?: TargetLang;
}

// ─── Error type labels and colors ────────────────────────────────────────────

const ERROR_TYPE_LABELS: Record<string, { pl: string; color: string; bg: string }> = {
  grammar:     { pl: 'Gramatyka',     color: '#dc2626', bg: '#fee2e2' },
  spelling:    { pl: 'Ortografia',    color: '#9333ea', bg: '#f3e8ff' },
  style:       { pl: 'Styl',          color: '#0891b2', bg: '#cffafe' },
  punctuation: { pl: 'Interpunkcja',  color: '#d97706', bg: '#fef3c7' },
  vocabulary:  { pl: 'Słownictwo',    color: '#16a34a', bg: '#dcfce7' },
  syntax:      { pl: 'Składnia',      color: '#c026d3', bg: '#fae8ff' },
};

const SUPPORTED_LANGS: TargetLang[] = ['it', 'en', 'fr', 'es', 'de', 'cs', 'ru', 'pt', 'el'];
const LANG_NAMES: Record<TargetLang, string> = {
  it: 'Włoski', en: 'Angielski', fr: 'Francuski', es: 'Hiszpański',
  de: 'Niemiecki', cs: 'Czeski', ru: 'Rosyjski', pt: 'Portugalski', el: 'Grecki',
};

// ─── Score Ring ───────────────────────────────────────────────────────────────

const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 85 ? '#16a34a' : score >= 65 ? '#d97706' : '#dc2626';

  return (
    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--c-bg)" strokeWidth="5" />
        <circle
          cx="32" cy="32" r={r} fill="none"
          stroke={color} strokeWidth="5"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-sm font-bold" style={{ color }}>{score}</span>
    </div>
  );
};

// ─── Diff renderer — highlights changes in corrected text ────────────────────

function highlightDiff(original: string, corrected: string, errors: DetailedCorrectionResult['errors']): React.ReactNode {
  if (!errors || errors.length === 0) return <span>{corrected}</span>;

  // Simple approach: for each error, try to find and highlight the corrected text
  // We'll show the corrected text with "changed" marker when original ≠ corrected
  if (original === corrected) return <span>{corrected}</span>;

  // Mark corrections using a simple replacement approach
  let result = corrected;
  const parts: Array<{ text: string; isCorrection: boolean; original?: string }> = [];

  for (const err of errors) {
    if (!err.original || !err.corrected || err.original === err.corrected) continue;
    const idx = result.indexOf(err.corrected);
    if (idx === -1) continue;
    if (idx > 0) parts.push({ text: result.slice(0, idx), isCorrection: false });
    parts.push({ text: err.corrected, isCorrection: true, original: err.original });
    result = result.slice(idx + err.corrected.length);
  }
  if (result.length > 0) parts.push({ text: result, isCorrection: false });

  if (parts.length === 0) return <span>{corrected}</span>;

  return (
    <>
      {parts.map((p, i) =>
        p.isCorrection ? (
          <span
            key={i}
            title={`Było: "${p.original}"`}
            className="inline px-0.5 rounded font-medium"
            style={{ background: '#dcfce7', color: '#15803d', borderBottom: '2px solid #16a34a', textDecoration: 'none' }}
          >
            {p.text}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export const TextCorrectionView: React.FC<TextCorrectionViewProps> = ({ onClose, initialLang = 'it' }) => {
  const { globalLang: l } = useLang();
  const { theme } = useTheme();

  const [text, setText] = useState('');
  const [selectedLang, setSelectedLang] = useState<TargetLang>(initialLang);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'quick' | 'detailed'>('quick');
  const [result, setResult] = useState<CorrectionResult | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCorrect = async (corrMode: 'quick' | 'detailed') => {
    if (!text.trim()) return;
    setMode(corrMode);
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch(apiUrl('/api/correct'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), lang: selectedLang, mode: corrMode }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || `Błąd serwera (${res.status})`);
      }
      const r: CorrectionResult = await res.json();
      setResult(r);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.corrected);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setResult(null);
    setError('');
    setText('');
    textareaRef.current?.focus();
  };

  const detailedResult = result?.mode === 'detailed' ? result as DetailedCorrectionResult : null;
  const errorCount = detailedResult?.errors?.length ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'var(--c-bg)', color: 'var(--c-text)' }}
    >
      {/* Header */}
      <div
        className="shrink-0 border-b px-4 py-3 flex items-center gap-3"
        style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface)' }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-lg">✏️</span>
          <div>
            <h1 className="font-serif font-bold text-base leading-tight" style={{ color: 'var(--c-text)' }}>
              {l === 'pl' ? 'Korektor tekstu' : 'Text Corrector'}
            </h1>
            <p className="text-xs" style={{ color: 'var(--c-muted)' }}>
              {l === 'pl' ? 'Wklej tekst — AI wskaże błędy i zaproponuje poprawki' : 'Paste text — AI will find errors and suggest corrections'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="nav-icon-btn shrink-0">
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

          {/* Language selector + input */}
          {!result && (
            <div className="space-y-3">
              {/* Language selector */}
              <div>
                <label className="micro-label block mb-2">
                  {l === 'pl' ? 'Język tekstu' : 'Text language'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {SUPPORTED_LANGS.map(lang => (
                    <button
                      key={lang}
                      onClick={() => setSelectedLang(lang)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border"
                      style={{
                        background: selectedLang === lang ? 'var(--c-green)' : 'var(--c-surface)',
                        color: selectedLang === lang ? '#fff' : 'var(--c-muted)',
                        borderColor: selectedLang === lang ? 'var(--c-green)' : 'var(--c-border)',
                      }}
                    >
                      <Flag code={lang} size={14} />
                      {LANG_NAMES[lang]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text input */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder={l === 'pl'
                    ? `Wklej tutaj tekst po ${LANG_NAMES[selectedLang].toLowerCase()}…`
                    : `Paste ${LANG_NAMES[selectedLang]} text here…`}
                  rows={10}
                  className="w-full px-4 py-3 rounded-xl text-sm leading-relaxed outline-none resize-none"
                  style={{
                    background: 'var(--c-surface)',
                    border: '1px solid var(--c-border)',
                    color: 'var(--c-text)',
                    minHeight: 200,
                  }}
                />
                {text && (
                  <div className="absolute bottom-2 right-3 text-xs" style={{ color: 'var(--c-faint)' }}>
                    {text.length} {l === 'pl' ? 'znaków' : 'chars'}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => handleCorrect('quick')}
                  disabled={!text.trim() || loading}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                  style={{ background: 'var(--c-green)' }}
                >
                  {loading && mode === 'quick'
                    ? <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    : <CheckCircleIcon className="w-4 h-4" />}
                  {l === 'pl' ? 'Szybka korekta' : 'Quick correction'}
                </button>
                <button
                  onClick={() => handleCorrect('detailed')}
                  disabled={!text.trim() || loading}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                  style={{
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    color: '#fff',
                  }}
                >
                  {loading && mode === 'detailed'
                    ? <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    : <SparklesIcon className="w-4 h-4" />}
                  {l === 'pl' ? 'Szczegółowa analiza' : 'Detailed analysis'}
                </button>
              </div>

              {/* Mode descriptions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(0,140,69,.06)', border: '1px solid rgba(0,140,69,.15)' }}>
                  <p className="font-semibold mb-0.5" style={{ color: 'var(--c-green)' }}>
                    {l === 'pl' ? '⚡ Szybka korekta' : '⚡ Quick correction'}
                  </p>
                  <p style={{ color: 'var(--c-muted)' }}>
                    {l === 'pl'
                      ? 'Poprawiony tekst gotowy do skopiowania. Idealna, gdy potrzebujesz tylko poprawnej wersji.'
                      : 'Corrected text ready to copy. Perfect when you just need the fixed version.'}
                  </p>
                </div>
                <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(99,102,241,.06)', border: '1px solid rgba(99,102,241,.15)' }}>
                  <p className="font-semibold mb-0.5" style={{ color: '#6366f1' }}>
                    {l === 'pl' ? '🔍 Szczegółowa analiza' : '🔍 Detailed analysis'}
                  </p>
                  <p style={{ color: 'var(--c-muted)' }}>
                    {l === 'pl'
                      ? 'Lista wszystkich błędów z wyjaśnieniami po polsku, oceną tekstu i oceną punktową.'
                      : 'Full list of errors with Polish explanations, text assessment and score.'}
                  </p>
                </div>
              </div>

              {error && (
                <p className="text-sm px-3 py-2 rounded-lg" style={{ background: '#fee2e2', color: '#dc2626' }}>
                  {error}
                </p>
              )}
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: mode === 'quick' ? 'var(--c-green-dim)' : 'rgba(99,102,241,.1)' }}>
                <SparklesIcon className="w-6 h-6 animate-spin"
                  style={{ color: mode === 'quick' ? 'var(--c-green)' : '#6366f1' }} />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm" style={{ color: 'var(--c-text)' }}>
                  {mode === 'quick'
                    ? (l === 'pl' ? 'Koryguję tekst…' : 'Correcting text…')
                    : (l === 'pl' ? 'Analizuję tekst szczegółowo…' : 'Analyzing text in detail…')}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--c-muted)' }}>
                  {l === 'pl' ? 'AI przegląda każde zdanie i słowo…' : 'AI is reviewing every sentence and word…'}
                </p>
              </div>
            </div>
          )}

          {/* Results */}
          {result && !loading && (
            <div className="space-y-5 animate-fade-in">
              {/* Result header bar */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {result.has_errors ? (
                    <ExclamationCircleIcon className="w-5 h-5" style={{ color: '#f59e0b' }} />
                  ) : (
                    <CheckCircleSolid className="w-5 h-5" style={{ color: 'var(--c-green)' }} />
                  )}
                  <span className="font-bold text-sm" style={{ color: 'var(--c-text)' }}>
                    {result.has_errors
                      ? (l === 'pl' ? `Znaleziono błędy` : 'Errors found')
                      : (l === 'pl' ? 'Tekst poprawny!' : 'Text is correct!')}
                  </span>
                  {result.language_detected && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--c-bg)', color: 'var(--c-muted)', border: '1px solid var(--c-border)' }}>
                      {result.language_detected}
                    </span>
                  )}
                  {result.mode === 'detailed' && detailedResult?.register && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--c-bg)', color: 'var(--c-muted)', border: '1px solid var(--c-border)' }}>
                      {detailedResult.register}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border"
                    style={{ borderColor: 'var(--c-border)', color: 'var(--c-muted)', background: 'var(--c-surface)' }}
                  >
                    <ArrowPathIcon className="w-3 h-3" />
                    {l === 'pl' ? 'Nowy tekst' : 'New text'}
                  </button>
                </div>
              </div>

              {/* Score (detailed only) */}
              {detailedResult && (
                <div className="flex items-center gap-4 p-4 rounded-2xl"
                  style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
                  <ScoreRing score={detailedResult.score} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--c-faint)' }}>
                      {l === 'pl' ? 'Ocena tekstu' : 'Text score'}
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text)' }}>
                      {detailedResult.overall_assessment_pl}
                    </p>
                  </div>
                </div>
              )}

              {/* Original vs Corrected */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Original */}
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--c-border)' }}>
                  <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'var(--c-bg)', borderBottom: '1px solid var(--c-border)' }}>
                    <span className="text-xs font-bold" style={{ color: 'var(--c-muted)' }}>
                      {l === 'pl' ? '📝 Oryginalny tekst' : '📝 Original text'}
                    </span>
                  </div>
                  <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap" style={{ background: 'var(--c-surface)', color: 'var(--c-muted)', minHeight: 100 }}>
                    {result.mode === 'detailed' && detailedResult && detailedResult.errors.length > 0 ? (
                      // Highlight errors in original text
                      <OriginalWithErrors text={result.original} errors={detailedResult.errors} />
                    ) : (
                      result.original
                    )}
                  </div>
                </div>

                {/* Corrected */}
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,140,69,.3)' }}>
                  <div className="px-3 py-2 flex items-center justify-between gap-2"
                    style={{ background: 'rgba(0,140,69,.06)', borderBottom: '1px solid rgba(0,140,69,.2)' }}>
                    <span className="text-xs font-bold" style={{ color: 'var(--c-green)' }}>
                      {l === 'pl' ? '✅ Poprawiony tekst' : '✅ Corrected text'}
                    </span>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-all"
                      style={{ background: copied ? 'var(--c-green)' : 'rgba(0,140,69,.12)', color: copied ? '#fff' : 'var(--c-green)' }}
                    >
                      <ClipboardDocumentIcon className="w-3 h-3" />
                      {copied ? (l === 'pl' ? 'Skopiowano!' : 'Copied!') : (l === 'pl' ? 'Kopiuj' : 'Copy')}
                    </button>
                  </div>
                  <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap" style={{ background: 'var(--c-surface)', color: 'var(--c-text)', minHeight: 100 }}>
                    {result.mode === 'detailed' && detailedResult
                      ? highlightDiff(result.original, result.corrected, detailedResult.errors)
                      : result.corrected
                    }
                  </div>
                </div>
              </div>

              {/* Error list (detailed only) */}
              {detailedResult && detailedResult.errors.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-serif font-bold text-base" style={{ color: 'var(--c-text)' }}>
                      {l === 'pl' ? `Wykryte błędy (${errorCount})` : `Detected errors (${errorCount})`}
                    </h2>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(new Set(detailedResult.errors.map(e => e.type))).map(type => {
                        const info = ERROR_TYPE_LABELS[type] ?? { pl: type, color: '#6b7280', bg: '#f3f4f6' };
                        const cnt = detailedResult.errors.filter(e => e.type === type).length;
                        return (
                          <span key={type} className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: info.bg, color: info.color }}>
                            {info.pl} ×{cnt}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {detailedResult.errors.map((err, i) => {
                    const info = ERROR_TYPE_LABELS[err.type] ?? { pl: err.type, color: '#6b7280', bg: '#f3f4f6' };
                    return (
                      <div key={i} className="rounded-2xl overflow-hidden"
                        style={{ border: `1px solid ${info.color}30`, background: 'var(--c-surface)' }}>
                        {/* Error header */}
                        <div className="px-4 py-2.5 flex items-center gap-2"
                          style={{ background: `${info.bg}80`, borderBottom: `1px solid ${info.color}20` }}>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: info.bg, color: info.color }}>
                            {info.pl}
                          </span>
                          {err.rule && (
                            <span className="text-[10px] font-medium" style={{ color: info.color }}>
                              {err.rule}
                            </span>
                          )}
                          <span className="text-[10px] ml-auto font-bold" style={{ color: 'var(--c-faint)' }}>
                            #{i + 1}
                          </span>
                        </div>

                        {/* Before/After */}
                        <div className="px-4 py-3 space-y-2">
                          <div className="flex items-start gap-3 flex-wrap">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs" style={{ color: 'var(--c-faint)' }}>Było:</span>
                              <span className="text-sm font-semibold px-2 py-0.5 rounded"
                                style={{ background: '#fee2e2', color: '#dc2626', textDecoration: 'line-through' }}>
                                {err.original}
                              </span>
                            </div>
                            <span className="text-xs" style={{ color: 'var(--c-faint)' }}>→</span>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs" style={{ color: 'var(--c-faint)' }}>Powinno być:</span>
                              <span className="text-sm font-semibold px-2 py-0.5 rounded"
                                style={{ background: '#dcfce7', color: '#15803d' }}>
                                {err.corrected}
                              </span>
                            </div>
                          </div>

                          {/* Context */}
                          {(err.context_before || err.context_after) && (
                            <div className="text-xs rounded-lg px-3 py-2 font-mono"
                              style={{ background: 'var(--c-bg)', color: 'var(--c-muted)' }}>
                              {err.context_before && <span>{err.context_before} </span>}
                              <span className="font-bold px-1 rounded"
                                style={{ background: '#fee2e2', color: '#dc2626', textDecoration: 'line-through' }}>
                                {err.original}
                              </span>
                              {err.context_after && <span> {err.context_after}</span>}
                            </div>
                          )}

                          {/* Explanation */}
                          <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text)' }}>
                            {err.explanation_pl}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* No errors message */}
              {result.has_errors === false && (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                    style={{ background: 'rgba(0,140,69,.1)' }}>
                    🎉
                  </div>
                  <div>
                    <p className="font-bold" style={{ color: 'var(--c-text)' }}>
                      {l === 'pl' ? 'Tekst jest poprawny!' : 'The text is correct!'}
                    </p>
                    <p className="text-sm mt-1" style={{ color: 'var(--c-muted)' }}>
                      {l === 'pl' ? 'AI nie wykryło żadnych błędów w tym tekście.' : 'AI found no errors in this text.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Original text with errors highlighted ───────────────────────────────────

const OriginalWithErrors: React.FC<{
  text: string;
  errors: DetailedCorrectionResult['errors'];
}> = ({ text, errors }) => {
  if (!errors || errors.length === 0) return <span>{text}</span>;

  // Build segments: find error originals in text and highlight them
  let remaining = text;
  const segments: Array<{ text: string; isError: boolean; errIndex?: number }> = [];

  let errIdx = 0;
  for (const err of errors) {
    if (!err.original) continue;
    const pos = remaining.indexOf(err.original);
    if (pos === -1) continue;
    if (pos > 0) segments.push({ text: remaining.slice(0, pos), isError: false });
    segments.push({ text: err.original, isError: true, errIndex: errIdx++ });
    remaining = remaining.slice(pos + err.original.length);
  }
  if (remaining.length > 0) segments.push({ text: remaining, isError: false });

  if (segments.length === 0) return <span>{text}</span>;

  return (
    <>
      {segments.map((seg, i) =>
        seg.isError ? (
          <span
            key={i}
            className="inline px-0.5 rounded"
            style={{ background: '#fee2e2', color: '#dc2626', textDecoration: 'line-through' }}
            title={`Błąd #${(seg.errIndex ?? 0) + 1}`}
          >
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </>
  );
};
