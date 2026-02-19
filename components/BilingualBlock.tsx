import React, { useState, useEffect, useRef, ElementType } from 'react';
import { Bilingual } from '../types';
import { useLang, Lang } from '../context/LangContext';


// ─── Types ────────────────────────────────────────────────────────────────────

interface BilingualBlockProps<T extends ElementType = 'span'> {
  content: Bilingual;
  as?: T;
  className?: string;
  /** Disable individual click-toggle (pure global-follower mode). */
  noClick?: boolean;
  /** Extra callback fired after language switches (useful for side-effects). */
  onSwitch?: (newLang: Lang) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BilingualBlock<T extends ElementType = 'span'>({
  content,
  as,
  className = '',
  noClick = false,
  onSwitch,
}: BilingualBlockProps<T>) {
  const { globalLang, syncKey, targetLang } = useLang();
  const [localLang, setLocalLang] = useState<Lang>(globalLang);
  const [flash, setFlash] = useState(false);
  const prevSyncKey = useRef(syncKey);

  // Sync with global whenever the global toggle fires.
  useEffect(() => {
    if (syncKey !== prevSyncKey.current) {
      prevSyncKey.current = syncKey;
      if (localLang !== globalLang) {
        triggerSwitch(globalLang);
      } else {
        setLocalLang(globalLang);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncKey, globalLang]);

  const triggerSwitch = (next: Lang) => {
    setFlash(true);
    setTimeout(() => {
      setLocalLang(next);
      setFlash(false);
      onSwitch?.(next);
    }, 80);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (noClick) return;
    e.stopPropagation();
    triggerSwitch(localLang === 'pl' ? targetLang : 'pl');
  };

  const text = localLang === 'pl'
    ? content.pl
    : (targetLang === 'en' ? content.en : targetLang === 'fr' ? content.fr : content.it) ?? content.pl;
  const Tag = (as ?? 'span') as ElementType;

  const tooltip = noClick
    ? undefined
    : localLang !== 'pl'
      ? 'Kliknij → Polski'
      : targetLang === 'en' ? 'Click → English' : targetLang === 'fr' ? 'Cliquez → Français' : 'Clicca → Italiano';

  return (
    <Tag
      className={[
        className,
        !noClick ? 'bb-clickable' : '',
        flash ? 'bb-flash' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={noClick ? undefined : handleClick}
      title={tooltip}
      style={flash ? { opacity: 0.15 } : { opacity: 1 }}
    >
      {text}
    </Tag>
  );
}

// ─── Convenience alias ────────────────────────────────────────────────────────
/** Short alias: <B content={...} /> */
export const B = BilingualBlock;
