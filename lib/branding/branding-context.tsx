'use client';

/**
 * BrandingProvider - React context for app-wide branding settings
 * Fetches branding on load, caches in IndexedDB for offline use,
 * and applies CSS custom properties for colors
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Branding } from '@/lib/database.types';

/**
 * Default branding values when none is configured
 */
export const DEFAULT_BRANDING: Branding = {
  id: 'default',
  logo_url: null,
  primary_color: '#3b82f6', // Blue
  accent_color: '#10b981', // Green
  app_name: 'Flux',
  created_at: new Date().toISOString(),
};

interface BrandingContextValue {
  branding: Branding;
  isLoading: boolean;
  isFromCache: boolean;
  refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextValue | null>(null);

/**
 * IndexedDB storage for branding cache
 */
const BRANDING_CACHE_KEY = 'flux_branding_cache';

async function getCachedBranding(): Promise<Branding | null> {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(BRANDING_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as Branding;
    }
  } catch (error) {
    console.error('Error reading branding cache:', error);
  }
  return null;
}

async function setCachedBranding(branding: Branding): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(branding));
  } catch (error) {
    console.error('Error caching branding:', error);
  }
}

/**
 * Calculate contrasting text color for a background
 */
export function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return white for dark backgrounds, black for light backgrounds
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Apply branding colors as CSS custom properties
 */
function applyBrandingColors(branding: Branding): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Primary color
  root.style.setProperty('--brand-primary', branding.primary_color);
  root.style.setProperty('--brand-primary-text', getContrastColor(branding.primary_color));

  // Accent color
  root.style.setProperty('--brand-accent', branding.accent_color);
  root.style.setProperty('--brand-accent-text', getContrastColor(branding.accent_color));

  // Update theme-color meta tag
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', branding.primary_color);
  }
}

interface BrandingProviderProps {
  children: ReactNode;
  initialBranding?: Branding | null;
}

export function BrandingProvider({
  children,
  initialBranding,
}: BrandingProviderProps) {
  const [branding, setBranding] = useState<Branding>(
    initialBranding ?? DEFAULT_BRANDING
  );
  const [isLoading, setIsLoading] = useState(!initialBranding);
  const [isFromCache, setIsFromCache] = useState(false);

  // Apply colors whenever branding changes
  useEffect(() => {
    applyBrandingColors(branding);
  }, [branding]);

  // Load branding from cache or server on mount
  useEffect(() => {
    let isMounted = true;

    async function loadBranding() {
      // If we already have server-provided branding, just cache it
      if (initialBranding) {
        await setCachedBranding(initialBranding);
        return;
      }

      // Try to load from cache first
      const cached = await getCachedBranding();
      if (cached && isMounted) {
        setBranding(cached);
        setIsFromCache(true);
        setIsLoading(false);
      }

      // Then try to fetch from server (will update if online)
      try {
        const response = await fetch('/api/branding');
        if (response.ok) {
          const data = await response.json();
          if (data.branding && isMounted) {
            setBranding(data.branding);
            setIsFromCache(false);
            await setCachedBranding(data.branding);
          }
        }
      } catch (error) {
        // Network error - stick with cached or default
        console.log('Could not fetch branding, using cached/default');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadBranding();

    return () => {
      isMounted = false;
    };
  }, [initialBranding]);

  const refreshBranding = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/branding');
      if (response.ok) {
        const data = await response.json();
        if (data.branding) {
          setBranding(data.branding);
          setIsFromCache(false);
          await setCachedBranding(data.branding);
        }
      }
    } catch (error) {
      console.error('Error refreshing branding:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <BrandingContext.Provider
      value={{
        branding,
        isLoading,
        isFromCache,
        refreshBranding,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
}

/**
 * Hook to access branding context
 */
export function useBranding(): BrandingContextValue {
  const context = useContext(BrandingContext);

  if (!context) {
    // Return default branding if used outside provider (SSR safety)
    return {
      branding: DEFAULT_BRANDING,
      isLoading: false,
      isFromCache: false,
      refreshBranding: async () => {},
    };
  }

  return context;
}
