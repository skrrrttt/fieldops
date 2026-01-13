import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getBranding } from '@/lib/branding/actions';

const sizes: Record<string, number> = {
  '192': 192,
  '512': 512,
};

// Calculate contrasting text color for the icon letter
function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: sizeParam } = await params;
  const size = sizes[sizeParam];

  if (!size) {
    return new Response('Invalid size', { status: 400 });
  }

  // Fetch branding settings
  const branding = await getBranding();
  const logoUrl = branding?.logo_url;
  const primaryColor = branding?.primary_color || '#3b82f6';
  const appName = branding?.app_name || 'Flux';

  const borderRadius = Math.round(size * 0.1875); // ~96px for 512

  // If custom logo exists, use it as the icon
  if (logoUrl) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: primaryColor,
            borderRadius: borderRadius,
            padding: size * 0.1,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt=""
            style={{
              maxWidth: '80%',
              maxHeight: '80%',
              objectFit: 'contain',
            }}
          />
        </div>
      ),
      {
        width: size,
        height: size,
      }
    );
  }

  // No custom logo - generate icon from app name + primary color
  const fontSize = Math.round(size * 0.55);
  const textColor = getContrastColor(primaryColor);

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: fontSize,
          background: primaryColor,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: borderRadius,
        }}
      >
        <span
          style={{
            color: textColor,
            fontWeight: 700,
            fontFamily: 'system-ui, sans-serif',
            letterSpacing: '-0.02em',
            marginTop: -size * 0.05,
          }}
        >
          {appName.charAt(0).toUpperCase()}
        </span>
      </div>
    ),
    {
      width: size,
      height: size,
    }
  );
}
