import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Global audio preference. The hero background video and UI confirmations
 * respect this, and the choice survives reloads.
 */
interface SoundContextValue {
  muted: boolean;
  toggleMuted: () => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);
const STORAGE_KEY = 'catpad_sound_muted';

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [muted, setMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== 'false';
    } catch {
      return true;
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
