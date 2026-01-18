'use client';

/**
 * Client-side wrapper for ThemeProvider
 * Used in root layout to provide theme context to all pages
 */

import { ThemeProvider } from '@/lib/theme/theme-context';

interface ThemeProviderWrapperProps {
  children: React.ReactNode;
}

export function ThemeProviderWrapper({
  children,
}: ThemeProviderWrapperProps) {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
}
