'use client';

/**
 * PWAInstallPrompt - Premium install banner with electric design
 * Shows install prompt after 2nd visit or meaningful action
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useBranding, getContrastColor } from '@/lib/branding/branding-context';
import { Button } from '@/components/ui/button';
import { X, Download, Loader2, Sparkles } from 'lucide-react';

// Extended Window interface for PWA install prompt
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

// Storage keys
const VISIT_COUNT_KEY = 'fieldops_visit_count';
const INSTALL_DISMISSED_KEY = 'fieldops_install_dismissed';
const MEANINGFUL_ACTION_KEY = 'fieldops_meaningful_action';

const MIN_VISITS_FOR_BANNER = 2;

function getVisitCount(): number {
  if (typeof window === 'undefined') return 0;
  const count = localStorage.getItem(VISIT_COUNT_KEY);
  return count ? parseInt(count, 10) : 0;
}

function incrementVisitCount(): number {
  if (typeof window === 'undefined') return 0;
  const count = getVisitCount() + 1;
  localStorage.setItem(VISIT_COUNT_KEY, count.toString());
  return count;
}

function wasInstallDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(INSTALL_DISMISSED_KEY) === 'true';
}

function setInstallDismissed(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(INSTALL_DISMISSED_KEY, 'true');
}

function hasMeaningfulAction(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(MEANINGFUL_ACTION_KEY) === 'true';
}

export function trackMeaningfulAction(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MEANINGFUL_ACTION_KEY, 'true');
  window.dispatchEvent(new CustomEvent('fieldops-meaningful-action'));
}

function isAppInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function PWAInstallPrompt() {
  const { branding } = useBranding();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const hasCheckedRef = useRef(false);

  const checkShouldShowBanner = useCallback(() => {
    if (isAppInstalled() || wasInstallDismissed()) {
      return false;
    }
    const visitCount = getVisitCount();
    const meaningfulAction = hasMeaningfulAction();
    return visitCount >= MIN_VISITS_FOR_BANNER || meaningfulAction;
  }, []);

  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    incrementVisitCount();

    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (checkShouldShowBanner()) {
        setShowBanner(true);
      }
    };

    const handleAppInstalled = () => {
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    const handleMeaningfulAction = () => {
      if (deferredPrompt && !showBanner && !isAppInstalled() && !wasInstallDismissed()) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('fieldops-meaningful-action', handleMeaningfulAction);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('fieldops-meaningful-action', handleMeaningfulAction);
    };
  }, [checkShouldShowBanner, deferredPrompt, showBanner]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setShowBanner(false);
      } else {
        setInstallDismissed();
        setShowBanner(false);
      }
    } catch (error) {
      console.error('[PWA] Install error:', error);
    } finally {
      setDeferredPrompt(null);
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setInstallDismissed();
    setShowBanner(false);
  };

  if (!showBanner || !deferredPrompt) {
    return null;
  }

  const textColor = getContrastColor(branding.primary_color);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] p-4 animate-fade-up"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
    >
      <div
        className="relative max-w-lg mx-auto rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.primary_color}dd)`,
        }}
      >
        {/* Decorative glow */}
        <div
          className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-30"
          style={{ backgroundColor: branding.accent_color }}
        />

        <div className="relative p-5">
          <div className="flex items-start gap-4">
            {/* App icon or logo */}
            <div className="flex-shrink-0">
              {branding.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={branding.logo_url}
                  alt={branding.app_name}
                  className="w-16 h-16 rounded-2xl object-contain bg-white/10 backdrop-blur-sm p-2 ring-2 ring-white/20"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center ring-2 ring-white/20"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                >
                  <span
                    className="text-3xl font-bold"
                    style={{ color: textColor }}
                  >
                    {branding.app_name.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4" style={{ color: textColor, opacity: 0.8 }} />
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: textColor, opacity: 0.7 }}
                >
                  Get the app
                </span>
              </div>
              <h3
                className="text-xl font-bold tracking-tight"
                style={{ color: textColor }}
              >
                Install {branding.app_name}
              </h3>
              <p
                className="text-sm mt-1 leading-relaxed"
                style={{ color: textColor, opacity: 0.85 }}
              >
                Add to your home screen for instant access and offline use
              </p>
            </div>

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-2 rounded-xl transition-all hover:bg-white/10 active:scale-95"
              style={{ color: textColor, opacity: 0.7 }}
              aria-label="Dismiss install prompt"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Install button */}
          <Button
            onClick={handleInstall}
            disabled={isInstalling}
            size="lg"
            className="w-full mt-5 bg-white hover:bg-white/95 shadow-lg font-bold text-base h-14 rounded-xl transition-all active:scale-[0.98]"
            style={{ color: branding.primary_color }}
          >
            {isInstalling ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Installing...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Install App
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
