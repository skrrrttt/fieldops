'use client';

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'fieldops_theme_preference';

// Get initial values from localStorage synchronously to avoid flash
function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
  if (stored && ['system', 'light', 'dark'].includes(stored)) {
    return stored;
  }
  return 'system';
}

function getInitialResolvedTheme(mode: ThemeMode): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Use refs for initial load to avoid setState in effect
  const initialLoadDone = useRef(false);
  const [mode, setModeState] = useState<ThemeMode>(() => getInitialMode());
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => getInitialResolvedTheme(getInitialMode()));
  const [mounted, setMounted] = useState(false);

  // Mark as mounted
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true);
    }
  }, []);

  // Resolve theme based on mode and system preference
  useEffect(() => {
    if (!mounted) return;

    const updateResolvedTheme = () => {
      if (mode === 'system') {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setResolvedTheme(systemDark ? 'dark' : 'light');
      } else {
        setResolvedTheme(mode);
      }
    };

    updateResolvedTheme();

    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (mode === 'system') {
        updateResolvedTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mode, mounted]);

  // Apply dark class to html element
  useEffect(() => {
    if (!mounted) return;

    const html = document.documentElement;
    if (resolvedTheme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [resolvedTheme, mounted]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  };

  // Prevent flash of incorrect theme
  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ mode: 'system', setMode: () => {}, resolvedTheme: 'light' }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ mode, setMode, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
