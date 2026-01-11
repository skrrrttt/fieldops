'use client';

/**
 * ThemeToggle - Premium theme switcher component
 * Features: elegant pill design, smooth transitions, vibrant active states
 */

import { useTheme, ThemeMode } from '@/lib/theme/theme-context';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Monitor, Sun, Moon } from 'lucide-react';

interface ThemeOption {
  value: ThemeMode;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const themeOptions: ThemeOption[] = [
  {
    value: 'system',
    label: 'System',
    description: 'Follows your device settings',
    icon: <Monitor className="w-5 h-5" />,
  },
  {
    value: 'light',
    label: 'Light',
    description: 'Always use light mode',
    icon: <Sun className="w-5 h-5" />,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Always use dark mode',
    icon: <Moon className="w-5 h-5" />,
  },
];

export function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold">Appearance</Label>
      <div className="grid grid-cols-3 gap-3">
        {themeOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setMode(option.value)}
            className={`
              relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200
              touch-target active:scale-[0.98]
              ${mode === option.value
                ? 'border-primary bg-primary/10 text-primary shadow-sm'
                : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
              }
            `}
            aria-pressed={mode === option.value}
          >
            {/* Active indicator */}
            {mode === option.value && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary animate-scale-in" />
            )}
            <span className={`transition-transform duration-200 ${mode === option.value ? 'scale-110' : ''}`}>
              {option.icon}
            </span>
            <span className="text-sm font-semibold">{option.label}</span>
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {themeOptions.find(o => o.value === mode)?.description}
      </p>
    </div>
  );
}

/**
 * Compact theme toggle for headers/navbars
 * Cycles through themes with a single tap
 */
export function ThemeToggleCompact() {
  const { mode, setMode, resolvedTheme } = useTheme();

  const cycleTheme = () => {
    const modes: ThemeMode[] = ['system', 'light', 'dark'];
    const currentIndex = modes.indexOf(mode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setMode(modes[nextIndex]);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      className="touch-target relative group"
      aria-label={`Current theme: ${mode}. Click to change.`}
      title={`Theme: ${mode}`}
    >
      <span className="relative">
        {resolvedTheme === 'dark' ? (
          <Moon className="w-5 h-5 transition-transform group-hover:rotate-12" />
        ) : (
          <Sun className="w-5 h-5 transition-transform group-hover:rotate-45" />
        )}
      </span>
    </Button>
  );
}

/**
 * Inline theme toggle with pills
 * Horizontal layout for compact spaces
 */
export function ThemeToggleInline() {
  const { mode, setMode } = useTheme();

  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-secondary">
      {themeOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => setMode(option.value)}
          className={`
            flex items-center justify-center p-2 rounded-lg transition-all duration-200
            ${mode === option.value
              ? 'bg-background text-primary shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
            }
          `}
          aria-pressed={mode === option.value}
          title={option.label}
        >
          {option.icon}
        </button>
      ))}
    </div>
  );
}
