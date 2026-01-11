'use client';

/**
 * AppHeader - Branded header component that uses branding context
 * Displays logo (or app name initial), app name, and supports custom children
 */

import Link from 'next/link';
import { useBranding, getContrastColor } from '@/lib/branding/branding-context';

interface AppHeaderProps {
  /** Right-side content (user info, logout button, etc.) */
  children?: React.ReactNode;
  /** Subtitle to show after app name (e.g., "/ Tasks", "- Admin Dashboard") */
  subtitle?: string;
  /** Link destination for the logo/app name */
  href?: string;
  /** Whether to apply primary color as background (true for main headers) */
  usePrimaryBackground?: boolean;
  /** Additional classes for the header container */
  className?: string;
}

export function AppHeader({
  children,
  subtitle,
  href = '/',
  usePrimaryBackground = false,
  className = '',
}: AppHeaderProps) {
  const { branding } = useBranding();

  // Calculate text color based on background
  const textColor = usePrimaryBackground
    ? getContrastColor(branding.primary_color)
    : undefined;

  // Get initial for fallback when no logo
  const initial = branding.app_name.charAt(0).toUpperCase();

  return (
    <header
      className={`shadow-sm sticky top-0 z-10 ${className}`}
      style={
        usePrimaryBackground
          ? { backgroundColor: branding.primary_color }
          : undefined
      }
    >
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo and App Name */}
        <div className="flex items-center gap-3">
          <Link
            href={href}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            {/* Logo or Initial */}
            {branding.logo_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={branding.logo_url}
                alt={branding.app_name}
                className="h-8 w-auto object-contain"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold"
                style={{
                  backgroundColor: usePrimaryBackground
                    ? 'rgba(255,255,255,0.2)'
                    : branding.primary_color,
                  color: usePrimaryBackground
                    ? textColor
                    : getContrastColor(branding.primary_color),
                }}
              >
                {initial}
              </div>
            )}
            {/* App Name */}
            <span
              className={`text-xl font-semibold ${
                usePrimaryBackground
                  ? ''
                  : 'text-zinc-900 dark:text-white'
              }`}
              style={usePrimaryBackground ? { color: textColor } : undefined}
            >
              {branding.app_name}
            </span>
          </Link>

          {/* Subtitle */}
          {subtitle && (
            <>
              <span
                className={
                  usePrimaryBackground
                    ? 'opacity-60'
                    : 'text-zinc-400'
                }
                style={usePrimaryBackground ? { color: textColor } : undefined}
              >
                /
              </span>
              <span
                className={`text-lg ${
                  usePrimaryBackground
                    ? 'opacity-80'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
                style={usePrimaryBackground ? { color: textColor } : undefined}
              >
                {subtitle}
              </span>
            </>
          )}
        </div>

        {/* Right side content */}
        {children && (
          <div className="flex items-center gap-4">{children}</div>
        )}
      </div>
    </header>
  );
}

/**
 * Simple header with back button for detail pages
 */
interface DetailHeaderProps {
  /** Title to display */
  title: string;
  /** Back link destination */
  backHref: string;
}

export function DetailHeader({ title, backHref }: DetailHeaderProps) {
  const { branding } = useBranding();

  return (
    <header className="bg-white dark:bg-zinc-800 shadow-sm sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
        <Link
          href={backHref}
          className="flex items-center justify-center w-12 h-12 rounded-lg active:bg-zinc-100 dark:active:bg-zinc-700 transition-colors touch-target"
          style={{ backgroundColor: `${branding.primary_color}15` }}
          aria-label="Go back"
        >
          <svg
            className="w-6 h-6"
            style={{ color: branding.primary_color }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-white truncate flex-1">
          {title}
        </h1>
      </div>
    </header>
  );
}
