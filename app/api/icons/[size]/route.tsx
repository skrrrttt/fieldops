import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

const sizes: Record<string, number> = {
  '192': 192,
  '512': 512,
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: sizeParam } = await params;
  const size = sizes[sizeParam];

  if (!size) {
    return new Response('Invalid size', { status: 400 });
  }

  const borderRadius = Math.round(size * 0.1875); // ~96px for 512
  const fontSize = Math.round(size * 0.55);

  return new ImageResponse(
    (
      <div
        style={{
          fontSize: fontSize,
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
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
            color: 'white',
            fontWeight: 700,
            fontFamily: 'system-ui, sans-serif',
            letterSpacing: '-0.02em',
            marginTop: -size * 0.05,
          }}
        >
          F
        </span>
      </div>
    ),
    {
      width: size,
      height: size,
    }
  );
}
