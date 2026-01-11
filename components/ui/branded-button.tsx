'use client';

/**
 * BrandedButton - Button component that uses branding colors
 * Built on top of shadcn/ui Button component
 */

import { forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useBranding, getContrastColor } from '@/lib/branding/branding-context';
import { cn } from '@/lib/utils';

interface BrandedButtonProps
  extends React.ComponentProps<typeof Button> {
  /** Button variant - primary uses primary color, accent uses accent color */
  brandVariant?: 'primary' | 'accent';
  /** Whether button is in loading state */
  isLoading?: boolean;
}

export const BrandedButton = forwardRef<HTMLButtonElement, BrandedButtonProps>(
  function BrandedButton(
    {
      brandVariant = 'primary',
      isLoading = false,
      className,
      disabled,
      children,
      style,
      variant,
      size,
      ...props
    },
    ref
  ) {
    const { branding } = useBranding();

    // Calculate styles based on brandVariant (only when no shadcn variant is specified)
    const getBrandStyles = (): React.CSSProperties => {
      // If using a shadcn variant like 'outline', 'ghost', 'destructive', use those styles
      if (variant && variant !== 'default') {
        return {};
      }

      switch (brandVariant) {
        case 'primary':
          return {
            backgroundColor: branding.primary_color,
            color: getContrastColor(branding.primary_color),
            '--tw-ring-color': branding.primary_color,
          } as React.CSSProperties;

        case 'accent':
          return {
            backgroundColor: branding.accent_color,
            color: getContrastColor(branding.accent_color),
            '--tw-ring-color': branding.accent_color,
          } as React.CSSProperties;

        default:
          return {};
      }
    };

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn('touch-target', className)}
        disabled={disabled || isLoading}
        style={{ ...getBrandStyles(), ...style }}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin" />
            Loading...
          </>
        ) : (
          children
        )}
      </Button>
    );
  }
);
