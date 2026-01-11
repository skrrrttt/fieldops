'use client';

/**
 * BrandedLink - Link component that uses accent color for styling
 */

import Link from 'next/link';
import { forwardRef, type AnchorHTMLAttributes } from 'react';
import { useBranding } from '@/lib/branding/branding-context';

interface BrandedLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  /** Link destination */
  href: string;
  /** Whether this is an external link */
  external?: boolean;
}

export const BrandedLink = forwardRef<HTMLAnchorElement, BrandedLinkProps>(
  function BrandedLink({ href, external, children, className = '', style, ...props }, ref) {
    const { branding } = useBranding();

    const linkStyle = {
      color: branding.accent_color,
      ...style,
    };

    const classes = `hover:underline transition-colors ${className}`;

    if (external) {
      return (
        <a
          ref={ref}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={classes}
          style={linkStyle}
          {...props}
        >
          {children}
        </a>
      );
    }

    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={classes}
        style={linkStyle}
        {...props}
      >
        {children}
      </Link>
    );
  }
);
