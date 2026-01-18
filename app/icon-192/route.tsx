import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 140,
          background: '#0f172a',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 38,
        }}
      >
        <span
          style={{
            color: '#f97316',
            fontWeight: 800,
            fontFamily: 'system-ui, sans-serif',
            letterSpacing: '-0.02em',
          }}
        >
          P
        </span>
      </div>
    ),
    {
      width: 192,
      height: 192,
    }
  );
}
