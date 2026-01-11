'use client';

/**
 * BrandedBadge - Badge component that can use custom or accent colors
 * Built on top of shadcn/ui Badge component
 */

import { Badge } from '@/components/ui/badge';
import { useBranding, getContrastColor } from '@/lib/branding/branding-context';
import { cn } from '@/lib/utils';

interface BrandedBadgeProps extends React.ComponentProps<typeof Badge> {
  /** Custom color (hex). If not provided, uses accent color */
  color?: string;
  /** Brand badge variant */
  brandVariant?: 'filled' | 'outline' | 'subtle';
}

export function BrandedBadge({
  children,
  color,
  brandVariant = 'subtle',
  className,
  variant,
  ...props
}: BrandedBadgeProps) {
  const { branding } = useBranding();

  // Use provided color or fall back to accent
  const badgeColor = color || branding.accent_color;

  // If using a shadcn variant, use that instead of brand styling
  if (variant) {
    return (
      <Badge variant={variant} className={className} {...props}>
        {children}
      </Badge>
    );
  }

  // Get styles based on brandVariant
  const getStyles = (): React.CSSProperties => {
    switch (brandVariant) {
      case 'filled':
        return {
          backgroundColor: badgeColor,
          color: getContrastColor(badgeColor),
          borderColor: 'transparent',
        };

      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: badgeColor,
          borderColor: badgeColor,
        };

      case 'subtle':
      default:
        return {
          backgroundColor: `${badgeColor}20`,
          color: badgeColor,
          borderColor: 'transparent',
        };
    }
  };

  return (
    <Badge
      className={cn('border', className)}
      style={getStyles()}
      {...props}
    >
      {children}
    </Badge>
  );
}
