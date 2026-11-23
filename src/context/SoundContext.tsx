import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Global audio preference: on by default, remembered once changed. The pet
 * section's purr and the navbar toggle both read this.
 */
interface SoundContextValue {
  muted: boolean;
  toggleMuted: () => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);
// v2: sound used to default to muted, so old stored values are not a real choice.
const STORAGE_KEY = 'catpad_sound_muted_v2';

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  /** Sound is on by default; muting is an explicit choice that persists. */
  const [muted, setMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(muted));
    } catch {
      /* storage unavailable */
    }
  }, [muted]);

  const toggleMuted = useCallback(() => setMuted((prev) => !prev), []);
  const value = useMemo(() => ({ muted, toggleMuted }), [muted, toggleMuted]);

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
};

export const useSound = () => {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error('useSound must be used within SoundProvider');
  return ctx;
};
