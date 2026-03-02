'use client';

/**
 * AdminSidebar - Premium side navigation for admin pages
 * Refined, polished design with smooth transitions
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  ImageIcon,
  Settings,
  Users,
  Tags,
  CheckCircle,
  ChevronLeft,
  ChevronDown,
  Layers,
  MessageSquareText,
  Archive,
  ListChecks,
  Building2,
} from 'lucide-react';

// ProStreet brand constants
const APP_NAME = 'ProStreet';
const PRIMARY_COLOR = '#f97316';
const DARK_BG = '#0f172a';

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/admin/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    label: 'Tasks',
    href: '/admin/tasks',
    icon: <ClipboardList className="w-5 h-5" />,
  },
  {
    label: 'Customers',
    href: '/admin/customers',
    icon: <Building2 className="w-5 h-5" />,
  },
  {
    label: 'Archive',
    href: '/admin/archive',
    icon: <Archive className="w-5 h-5" />,
  },
  {
    label: 'Media',
    href: '/admin/media',
    icon: <ImageIcon className="w-5 h-5" />,
  },
  {
    label: 'Responses',
    href: '/admin/responses',
    icon: <MessageSquareText className="w-5 h-5" />,
  },
  {
    label: 'Configuration',
    icon: <Settings className="w-5 h-5" />,
    children: [
      {
        label: 'Users',
        href: '/admin/users',
        icon: <Users className="w-4 h-4" />,
      },
      {
        label: 'Divisions',
        href: '/admin/divisions',
        icon: <Tags className="w-4 h-4" />,
      },
      {
        label: 'Statuses',
        href: '/admin/statuses',
        icon: <CheckCircle className="w-4 h-4" />,
      },
      {
        label: 'Custom Fields',
        href: '/admin/custom-fields',
        icon: <Layers className="w-4 h-4" />,
      },
      {
        label: 'Checklists',
        href: '/admin/checklists',
        icon: <ListChecks className="w-4 h-4" />,
      },
    ],
  },
];

interface AdminSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function AdminSidebar({ isCollapsed, onToggleCollapse }: AdminSidebarProps) {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<string[]>(['Configuration']);

  useEffect(() => {
    const configItem = navItems.find(item => item.label === 'Configuration');
    if (configItem?.children?.some(child => child.href === pathname)) {
      setExpandedSections(prev =>
        prev.includes('Configuration') ? prev : [...prev, 'Configuration']
      );
    }
  }, [pathname]);

  const toggleSection = (label: string) => {
    setExpandedSections(prev =>
      prev.includes(label)
        ? prev.filter(l => l !== label)
        : [...prev, label]
    );
  };

  const isActive = (href: string | undefined) => {
    if (!href) return false;
    return pathname === href;
  };

  const isParentActive = (item: NavItem) => {
    if (item.href && isActive(item.href)) return true;
    if (item.children) {
      return item.children.some(child => isActive(child.href));
    }
    return false;
  };

  const initial = APP_NAME.charAt(0).toUpperCase();

  return (
    <aside
      className={`
        fixed left-0 top-0 h-full z-20 flex flex-col
        bg-sidebar border-r border-sidebar-border
        transition-all duration-300 ease-out
        ${isCollapsed ? 'w-[68px]' : 'w-72'}
      `}
    >
      {/* Header with logo/name */}
      <div className="flex items-center justify-between p-4 h-16 border-b border-sidebar-border">
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-3 overflow-hidden group"
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0 shadow-md transition-transform group-hover:scale-105"
            style={{
              backgroundColor: DARK_BG,
              color: PRIMARY_COLOR,
            }}
          >
            {initial}
          </div>
          {!isCollapsed && (
            <span className="text-lg font-bold text-sidebar-foreground truncate tracking-tight">
              {APP_NAME}
            </span>
          )}
        </Link>
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground transition-all flex-shrink-0"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft
            className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {navItems.map(item => (
            <li key={item.label}>
              {item.href ? (
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                    ${isActive(item.href)
                      ? 'shadow-md'
                      : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                    }
                  `}
                  style={
                    isActive(item.href)
                      ? {
                          background: `linear-gradient(135deg, ${PRIMARY_COLOR}, ${PRIMARY_COLOR}dd)`,
                          color: DARK_BG,
                        }
                      : undefined
                  }
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!isCollapsed && (
                    <span className="font-medium">{item.label}</span>
                  )}
                </Link>
              ) : (
                <>
                  <button
                    onClick={() => toggleSection(item.label)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                      ${isParentActive(item)
                        ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                        : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                      }
                    `}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 text-left font-medium">{item.label}</span>
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${expandedSections.includes(item.label) ? 'rotate-180' : ''}`}
                        />
                      </>
                    )}
                  </button>

                  {item.children && (expandedSections.includes(item.label) || isCollapsed) && (
                    <ul className={`mt-1 space-y-0.5 ${isCollapsed ? '' : 'ml-3 pl-3 border-l-2 border-sidebar-border'}`}>
                      {item.children.map(child => (
                        <li key={child.label}>
                          <Link
                            href={child.href!}
                            className={`
                              flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm
                              ${isActive(child.href)
                                ? 'font-semibold'
                                : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                              }
                            `}
                            style={
                              isActive(child.href)
                                ? { color: PRIMARY_COLOR }
                                : undefined
                            }
                            title={isCollapsed ? child.label : undefined}
                          >
                            <span className="flex-shrink-0 opacity-70">{child.icon}</span>
                            {!isCollapsed && <span>{child.label}</span>}
                            {isActive(child.href) && !isCollapsed && (
                              <span
                                className="ml-auto w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: PRIMARY_COLOR }}
                              />
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Keyboard shortcuts hint */}
      {!isCollapsed && (
        <div className="p-4 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/50 text-center flex items-center justify-center gap-1.5">
            Press
            <kbd className="px-1.5 py-0.5 bg-sidebar-accent rounded text-xs font-mono">?</kbd>
            for shortcuts
          </p>
        </div>
      )}
    </aside>
  );
}
