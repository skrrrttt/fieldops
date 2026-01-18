'use client';

/**
 * AppHeader - Header component for ProStreet
 * Displays app name initial and supports custom children
 */

import Link from 'next/link';
import { ConnectionIndicator } from '@/components/offline/connection-indicator';

// ProStreet brand constants
const APP_NAME = 'ProStreet';
const PRIMARY_COLOR = '#f97316';

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
  return (
    <header
      className={`shadow-sm sticky top-0 z-10 ${className}`}
      style={
        usePrimaryBackground
          ? { backgroundColor: PRIMARY_COLOR }
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
            {/* ProStreet Initial */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg font-bold"
              style={{
                backgroundColor: usePrimaryBackground
                  ? 'rgba(255,255,255,0.2)'
                  : '#0f172a',
                color: PRIMARY_COLOR,
              }}
            >
              P
            </div>
            {/* App Name */}
            <span
              className={`text-xl font-semibold ${
                usePrimaryBackground
                  ? 'text-white'
                  : 'text-zinc-900 dark:text-white'
              }`}
            >
              {APP_NAME}
            </span>
          </Link>

          {/* Subtitle */}
          {subtitle && (
            <>
              <span
                className={
                  usePrimaryBackground
                    ? 'text-white/60'
                    : 'text-zinc-400'
                }
              >
                /
              </span>
              <span
                className={`text-lg ${
                  usePrimaryBackground
                    ? 'text-white/80'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                {subtitle}
              </span>
            </>
          )}
        </div>

        {/* Right side content */}
        <div className="flex items-center gap-4">
          {/* Connection indicator - mobile only */}
          <div className="md:hidden">
            <ConnectionIndicator />
          </div>
          {children}
        </div>
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
  return (
    <header className="bg-white dark:bg-zinc-800 shadow-sm sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
        <Link
          href={backHref}
          className="flex items-center justify-center w-12 h-12 rounded-lg active:bg-zinc-100 dark:active:bg-zinc-700 transition-colors touch-target bg-primary/10"
          aria-label="Go back"
        >
          <svg
            className="w-6 h-6 text-primary"
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
