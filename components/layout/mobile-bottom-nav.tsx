'use client';

/**
 * MobileBottomNav - Premium mobile bottom navigation bar
 * Rugged, tactile design for field users
 * Features: glass morphism, smooth transitions, vibrant active states
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useBranding } from '@/lib/branding/branding-context';
import { SyncBadge } from '@/components/offline/sync-status-indicator';
import { ClipboardCheck, ImagePlus, RefreshCw, User } from 'lucide-react';

interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  showSyncBadge?: boolean;
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { branding } = useBranding();

  const navItems: NavItem[] = [
    {
      key: 'tasks',
      label: 'Tasks',
      href: '/tasks',
      icon: <ClipboardCheck className="w-6 h-6" />,
    },
    {
      key: 'upload',
      label: 'Upload',
      href: '/tasks?upload=true',
      icon: <ImagePlus className="w-6 h-6" />,
    },
    {
      key: 'sync',
      label: 'Sync',
      href: '/tasks?sync=true',
      showSyncBadge: true,
      icon: <RefreshCw className="w-6 h-6" />,
    },
    {
      key: 'profile',
      label: 'Profile',
      href: '/profile',
      icon: <User className="w-6 h-6" />,
    },
  ];

  const isActive = (href: string) => {
    const basePath = href.split('?')[0];
    if (basePath === '/tasks') {
      return pathname === '/tasks' || pathname.startsWith('/tasks/');
    }
    return pathname === basePath || pathname.startsWith(basePath + '/');
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 md:hidden z-50"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
      }}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Glass background with gradient border */}
      <div className="glass border-t border-border/30 dark:border-border/20">
        {/* Subtle gradient line at top */}
        <div
          className="absolute top-0 left-0 right-0 h-px opacity-50"
          style={{
            background: `linear-gradient(90deg, transparent, ${branding.primary_color}40, transparent)`,
          }}
        />

        <div className="flex justify-around items-center h-[var(--bottom-nav-height)]">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`
                  flex flex-col items-center justify-center flex-1 h-full
                  min-w-[var(--tap-target-min)] relative
                  transition-all duration-200 ease-out
                  active:scale-95
                  ${active
                    ? ''
                    : 'text-muted-foreground hover:text-foreground'
                  }
                `}
                style={active ? { color: branding.primary_color } : undefined}
                aria-current={active ? 'page' : undefined}
              >
                {/* Active background pill */}
                {active && (
                  <span
                    className="absolute inset-x-3 inset-y-2 rounded-xl -z-10 animate-scale-in"
                    style={{
                      backgroundColor: `${branding.primary_color}12`,
                    }}
                  />
                )}

                {/* Icon with badge */}
                <span className="relative">
                  <span className={`transition-transform duration-200 ${active ? 'scale-110' : ''}`}>
                    {item.icon}
                  </span>
                  {item.showSyncBadge && (
                    <span className="absolute -top-0.5 -right-1 scale-75 origin-top-right">
                      <SyncBadge />
                    </span>
                  )}
                </span>

                {/* Label */}
                <span className={`text-[11px] mt-1 font-semibold tracking-wide uppercase ${active ? '' : 'opacity-70'}`}>
                  {item.label}
                </span>

                {/* Active indicator dot */}
                {active && (
                  <span
                    className="absolute bottom-1 w-1 h-1 rounded-full animate-scale-in"
                    style={{ backgroundColor: branding.primary_color }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

/**
 * Wrapper to add bottom padding for pages with bottom nav
 */
export function MobileBottomNavSpacer() {
  return (
    <div
      className="md:hidden"
      style={{
        height: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px) + 8px)',
      }}
    />
  );
}
