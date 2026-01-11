'use client';

/**
 * Pull-to-refresh container component
 * Wraps content and adds pull-to-refresh gesture support
 */

import { useRef, useState, useCallback, useEffect } from 'react';

interface PullToRefreshProps {
  children: React.ReactNode;
  // Called when refresh is triggered
  onRefresh: () => Promise<void>;
  // Is currently refreshing
  isRefreshing?: boolean;
  // Disable pull-to-refresh (e.g., when offline)
  disabled?: boolean;
  // Custom class for the container
  className?: string;
}

// Pull thresholds in pixels
const PULL_THRESHOLD = 80;
const MAX_PULL = 120;

export function PullToRefresh({
  children,
  onRefresh,
  isRefreshing = false,
  disabled = false,
  className = '',
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const isAtTop = useRef(false);

  // Calculate visual progress (0 to 1)
  const pullProgress = Math.min(pullDistance / MAX_PULL, 1);
  const shouldTrigger = pullDistance >= PULL_THRESHOLD;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;

    touchStartY.current = e.touches[0].clientY;

    // Check if scrolled to top
    const container = containerRef.current;
    if (container) {
      isAtTop.current = container.scrollTop <= 0;
    }
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing || !touchStartY.current || !isAtTop.current) {
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;

    if (diff > 0) {
      // Pulling down from top
      setIsPulling(true);
      // Apply resistance - diminishing returns as you pull further
      const resistedPull = Math.min(diff * 0.5, MAX_PULL);
      setPullDistance(resistedPull);

      // Prevent default scroll when pulling
      if (diff > 10) {
        e.preventDefault();
      }
    } else {
      setIsPulling(false);
      setPullDistance(0);
    }
  }, [disabled, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing) return;

    if (shouldTrigger && !isRefreshing) {
      // Keep showing indicator while refreshing
      setPullDistance(PULL_THRESHOLD * 0.5);
      try {
        await onRefresh();
      } finally {
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }

    touchStartY.current = null;
    setIsPulling(false);
  }, [disabled, isRefreshing, shouldTrigger, onRefresh]);

  // Reset pull distance when refresh completes
  useEffect(() => {
    if (!isRefreshing) {
      setPullDistance(0);
    }
  }, [isRefreshing]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: isPulling ? 'none' : 'auto' }}
    >
      {/* Pull indicator */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center overflow-hidden transition-all duration-200 pointer-events-none"
        style={{
          height: isRefreshing ? 48 : pullDistance,
          top: 0,
          opacity: pullProgress > 0.1 || isRefreshing ? 1 : 0,
        }}
      >
        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          {isRefreshing ? (
            <>
              {/* Spinning loader */}
              <svg
                className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Refreshing...</span>
            </>
          ) : (
            <>
              {/* Pull arrow with rotation */}
              <svg
                className="w-5 h-5 transition-transform duration-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{
                  transform: `rotate(${shouldTrigger ? 180 : 0}deg)`,
                }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
              <span>
                {shouldTrigger ? 'Release to refresh' : 'Pull to refresh'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Content with transform for pull effect */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: `translateY(${isRefreshing ? 48 : pullDistance}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
