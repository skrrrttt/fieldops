'use client';

/**
 * PWASplashScreen - Shows branded splash screen on PWA app launch
 * Displays company logo (from branding) and theme colors
 * Only shown when app is running in standalone mode (installed PWA)
 */

import { useEffect, useState, useRef } from 'react';
import { useBranding, getContrastColor } from '@/lib/branding/branding-context';

// Key to track if splash has been shown this session
const SPLASH_SHOWN_KEY = 'fieldops_splash_shown';

/**
 * Check if app is running in standalone mode (installed PWA)
 */
function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari specific check
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Check if splash was already shown this session
 */
function wasSplashShown(): boolean {
  if (typeof window === 'undefined') return true;
  return sessionStorage.getItem(SPLASH_SHOWN_KEY) === 'true';
}

function markSplashShown(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SPLASH_SHOWN_KEY, 'true');
}

export function PWASplashScreen() {
  const { branding, isLoading } = useBranding();
  const [showSplash, setShowSplash] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    // Only check once
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    // Only show splash in standalone mode and if not shown this session
    if (isStandaloneMode() && !wasSplashShown()) {
      setShowSplash(true);
      markSplashShown();

      // Hide splash after a short delay (let branding load + animation)
      const hideTimer = setTimeout(() => {
        setIsExiting(true);
        // Remove from DOM after exit animation
        setTimeout(() => {
          setShowSplash(false);
        }, 300);
      }, 1500); // Show for 1.5 seconds

      return () => clearTimeout(hideTimer);
    }
  }, []);

  // Don't render if not showing
  if (!showSplash) {
    return null;
  }

  const textColor = getContrastColor(branding.primary_color);

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center transition-opacity duration-300 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ backgroundColor: branding.primary_color }}
    >
      {/* Logo or initial */}
      <div className={`animate-fade-in-up ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
        {branding.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={branding.logo_url}
            alt={branding.app_name}
            className="w-32 h-32 object-contain"
          />
        ) : (
          <div
            className="w-32 h-32 rounded-3xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            <span
              className="text-6xl font-bold"
              style={{ color: textColor }}
            >
              {branding.app_name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* App name */}
      <h1
        className="mt-6 text-2xl font-bold animate-fade-in-up"
        style={{ color: textColor, animationDelay: '100ms' }}
      >
        {branding.app_name}
      </h1>

      {/* Loading indicator */}
      <div
        className="mt-8 animate-fade-in-up"
        style={{ animationDelay: '200ms' }}
      >
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full animate-bounce"
              style={{
                backgroundColor: textColor,
                opacity: 0.6,
                animationDelay: `${i * 150}ms`,
              }}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
