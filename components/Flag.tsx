import React from 'react';
import { LANGUAGE_CONFIGS } from '../services/languages.config';

const FLAG_LABELS: Record<string, string> = {
  pl: 'Flaga Polski',
  ...Object.fromEntries(Object.values(LANGUAGE_CONFIGS).map(c => [c.code, c.flagLabelPl])),
};

// ─── Inline SVG flags — no external requests, works everywhere ────────────────
// Italian flag: green / white / red (3 vertical stripes)
// Polish flag:  white / red (2 horizontal stripes)

interface FlagProps {
  code: 'it' | 'pl' | 'en' | 'fr' | 'es' | 'de' | 'cs' | 'ru' | 'pt' | 'el';
  /** Height in px; width is auto (1.5× for IT, same for PL) */
  size?: number;
  className?: string;
  'aria-label'?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}

export const Flag: React.FC<FlagProps> = ({
  code,
  size = 18,
  className = '',
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden,
}) => {
  const hidden = ariaHidden === true || ariaHidden === 'true';
  const label = hidden ? undefined : (ariaLabel ?? FLAG_LABELS[code] ?? 'Flaga');
  const w = Math.round(size * 1.5);
  const h = size;

  return (
    <span
      role={hidden ? undefined : 'img'}
      aria-label={label}
      aria-hidden={hidden ? 'true' : undefined}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        width: w,
        height: h,
        flexShrink: 0,
        borderRadius: 2,
        overflow: 'hidden',
        verticalAlign: 'middle',
        boxShadow: '0 0 0 1px rgba(0,0,0,.10)',
        lineHeight: 0,
      }}
    >
      {code === 'it' ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2" width={w} height={h} style={{ display: 'block' }}>
          <rect width="1" height="2" fill="#009246"/>
          <rect x="1" width="1" height="2" fill="#ffffff"/>
          <rect x="2" width="1" height="2" fill="#ce2b37"/>
        </svg>
      ) : code === 'en' ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" width={w} height={h} style={{ display: 'block' }}>
          <rect width="60" height="30" fill="#012169"/>
          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4"/>
          <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10"/>
          <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6"/>
        </svg>
      ) : code === 'fr' ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2" width={w} height={h} style={{ display: 'block' }}>
          <rect width="1" height="2" fill="#002395"/>
          <rect x="1" width="1" height="2" fill="#ffffff"/>
          <rect x="2" width="1" height="2" fill="#ED2939"/>
        </svg>
      ) : code === 'es' ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2" width={w} height={h} style={{ display: 'block' }}>
          <rect width="3" height="2" fill="#c60b1e"/>
          <rect width="3" height="1" y="0.5" fill="#ffc400"/>
        </svg>
      ) : code === 'de' ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 3" width={w} height={h} style={{ display: 'block' }}>
          <rect width="3" height="1" fill="#000000"/>
          <rect width="3" height="1" y="1" fill="#dd0000"/>
          <rect width="3" height="1" y="2" fill="#ffce00"/>
        </svg>
      ) : code === 'cs' ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2" width={w} height={h} style={{ display: 'block' }}>
          <rect width="3" height="2" fill="#d7141a"/>
          <rect width="3" height="1" fill="#ffffff"/>
          <polygon points="0,0 1.5,1 0,2" fill="#11457e"/>
        </svg>
      ) : code === 'ru' ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 3" width={w} height={h} style={{ display: 'block' }}>
          <rect width="3" height="1" fill="#ffffff"/>
          <rect width="3" height="1" y="1" fill="#0039a6"/>
          <rect width="3" height="1" y="2" fill="#d52b1e"/>
        </svg>
      ) : code === 'pt' ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2" width={w} height={h} style={{ display: 'block' }}>
          <rect width="3" height="2" fill="#006600"/>
          <rect x="1" width="2" height="2" fill="#ff0000"/>
          <circle cx="1" cy="1" r="0.35" fill="#ffcc00" stroke="#006600" strokeWidth="0.05"/>
        </svg>
      ) : code === 'el' ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 27 18" width={w} height={h} style={{ display: 'block' }}>
          {/* Blue background */}
          <rect width="27" height="18" fill="#0D5EAF"/>
          {/* White stripes */}
          <rect y="2" width="27" height="2" fill="#ffffff"/>
          <rect y="6" width="27" height="2" fill="#ffffff"/>
          <rect y="10" width="27" height="2" fill="#ffffff"/>
          <rect y="14" width="27" height="2" fill="#ffffff"/>
          {/* Blue canton */}
          <rect width="10" height="10" fill="#0D5EAF"/>
          {/* White cross in canton */}
          <rect y="4" width="10" height="2" fill="#ffffff"/>
          <rect x="4" width="2" height="10" fill="#ffffff"/>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 5" width={w} height={h} style={{ display: 'block' }}>
          <rect width="8" height="5" fill="#ffffff"/>
          <rect width="8" height="2.5" y="2.5" fill="#dc143c"/>
        </svg>
      )}
    </span>
  );
};

// ─── Convenience: flag that auto-follows current language ─────────────────────

export const LangFlag: React.FC<{
  lang: 'it' | 'pl' | 'en' | 'fr' | 'es' | 'de' | 'cs' | 'ru' | 'pt' | 'el';
  size?: number;
  className?: string;
}> = ({ lang, size = 16, className }) => (
  <Flag code={lang} size={size} className={className} aria-hidden="true" />
);
