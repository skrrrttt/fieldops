'use client';

/**
 * Client-side wrapper for BrandingProvider and ThemeProvider
 * Used in root layout to provide branding and theme context to all pages
 */

import { BrandingProvider } from '@/lib/branding/branding-context';
import { ThemeProvider } from '@/lib/theme/theme-context';
import type { Branding } from '@/lib/database.types';

interface BrandingProviderWrapperProps {
  children: React.ReactNode;
  initialBranding?: Branding | null;
}

export function BrandingProviderWrapper({
  children,
  initialBranding,
}: BrandingProviderWrapperProps) {
  return (
    <ThemeProvider>
      <BrandingProvider initialBranding={initialBranding}>
        {children}
      </BrandingProvider>
    </ThemeProvider>
  );
}
