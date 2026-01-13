'use client';

/**
 * AdminLayout - Premium layout wrapper for admin pages
 * Features: responsive sidebar, keyboard shortcuts, refined spacing
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AdminSidebar } from './admin-sidebar';
import { LogoutButton } from '@/components/auth/logout-button';
import { ThemeToggleCompact } from '@/components/theme/theme-toggle';
import { useBranding } from '@/lib/branding/branding-context';
import { Menu, Search, X } from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'field_user';
}

interface AdminLayoutProps {
  children: React.ReactNode;
  user: AdminUser;
}

// Sidebar widths matching admin-sidebar.tsx
const SIDEBAR_WIDTH_EXPANDED = 288; // w-72 = 18rem = 288px
const SIDEBAR_WIDTH_COLLAPSED = 68; // w-[68px]

export function AdminLayout({ children, user }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { branding } = useBranding();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  // Auto-close mobile menu on navigation
  useEffect(() => {
    setShowMobileMenu(false);
  }, [pathname]);

  // Track mount state to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('admin-sidebar-collapsed');
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved));
    }
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => {
      const newValue = !prev;
      localStorage.setItem('admin-sidebar-collapsed', JSON.stringify(newValue));
      return newValue;
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
        target.isContentEditable;

      if (isInputFocused && e.key !== 'Escape') return;

      switch (e.key) {
        case 'n':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            router.push('/admin/tasks?action=create');
          }
          break;
        case '/':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            setShowSearchModal(true);
          }
          break;
        case '?':
          if (!e.metaKey && !e.ctrlKey && e.shiftKey) {
            e.preventDefault();
            setShowShortcutsModal(true);
          }
          break;
        case 'Escape':
          setShowShortcutsModal(false);
          setShowSearchModal(false);
          setShowMobileMenu(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  // Handle search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/admin/tasks?search=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearchModal(false);
      setSearchQuery('');
    }
  };

  // Calculate sidebar width for margin
  const sidebarWidth = isMounted
    ? (isCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED)
    : SIDEBAR_WIDTH_EXPANDED;

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - hidden on mobile, visible on lg+ */}
      <div className="hidden lg:block">
        <AdminSidebar isCollapsed={isCollapsed} onToggleCollapse={toggleCollapse} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden animate-fade-in"
          onClick={() => setShowMobileMenu(false)}
        >
          <div
            className="absolute left-0 top-0 h-full w-72 animate-slide-in-right"
            onClick={e => e.stopPropagation()}
          >
            <AdminSidebar isCollapsed={false} onToggleCollapse={() => setShowMobileMenu(false)} />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div
        className="min-h-screen transition-[margin] duration-300 ease-out"
        style={{
          marginLeft: isMounted && typeof window !== 'undefined' && window.innerWidth >= 1024
            ? sidebarWidth
            : 0
        }}
      >
        {/* Top header bar */}
        <header className="bg-card/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-10">
          <div className="px-4 sm:px-6 lg:px-10 py-3 sm:py-4 flex items-center justify-between gap-3">
            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              onClick={() => setShowMobileMenu(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo and app name (mobile only - sidebar shows on desktop) */}
            <div className="flex items-center gap-2 lg:hidden flex-shrink-0">
              {branding.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={branding.logo_url}
                  alt={branding.app_name}
                  className="h-7 w-auto object-contain"
                />
              ) : (
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                  style={{ backgroundColor: branding.primary_color }}
                >
                  {branding.app_name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="font-semibold text-foreground text-sm hidden xs:inline truncate max-w-[120px]">
                {branding.app_name}
              </span>
            </div>

            {/* Search button (desktop) */}
            <button
              onClick={() => setShowSearchModal(true)}
              className="hidden lg:flex items-center gap-3 px-4 py-2 rounded-xl bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <Search className="w-4 h-4" />
              <span className="text-sm">Search...</span>
              <kbd className="px-1.5 py-0.5 text-xs bg-background rounded font-mono">/</kbd>
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Right side controls */}
            <div className="flex items-center gap-3">
              <ThemeToggleCompact />
              <div className="hidden sm:block h-6 w-px bg-border" />
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user.email}
              </span>
              <LogoutButton />
            </div>
          </div>
        </header>

        {/* Page content with generous padding */}
        <main className="p-6 lg:p-10">
          {children}
        </main>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setShowShortcutsModal(false)}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl border border-border/50 max-w-md w-full p-6 animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">
                Keyboard Shortcuts
              </h2>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <ShortcutRow shortcut="n" description="Create new task" />
              <ShortcutRow shortcut="/" description="Search tasks" />
              <ShortcutRow shortcut="?" description="Show this help" />
              <ShortcutRow shortcut="Esc" description="Close modals" />
            </div>

            <p className="mt-8 text-xs text-muted-foreground text-center">
              Press <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs font-mono">Esc</kbd> to close
            </p>
          </div>
        </div>
      )}

      {/* Search Modal */}
      {showSearchModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 pt-[15vh] animate-fade-in"
          onClick={() => setShowSearchModal(false)}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl border border-border/50 max-w-xl w-full mx-4 animate-scale-in overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <form onSubmit={handleSearch}>
              <div className="flex items-center px-5 py-4 gap-4">
                <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search tasks..."
                  className="flex-1 bg-transparent border-none outline-none text-foreground placeholder-muted-foreground text-lg"
                  autoFocus
                />
                <kbd className="hidden sm:inline-block px-2 py-1 text-xs bg-secondary rounded font-mono text-muted-foreground">
                  Enter
                </kbd>
              </div>
            </form>
            <div className="px-5 py-3 bg-secondary/30 border-t border-border/50 text-sm text-muted-foreground">
              Press <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs font-mono">Enter</kbd> to search or{' '}
              <kbd className="px-1.5 py-0.5 bg-secondary rounded text-xs font-mono">Esc</kbd> to close
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ShortcutRow({ shortcut, description }: { shortcut: string; description: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{description}</span>
      <kbd className="px-3 py-1.5 bg-secondary rounded-lg text-sm font-mono font-medium text-foreground">
        {shortcut}
      </kbd>
    </div>
  );
}
