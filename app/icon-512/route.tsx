import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: 96,
          position: 'relative',
        }}
      >
        {/* Subtle inner glow */}
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            right: 16,
            bottom: 16,
            borderRadius: 84,
            border: '2px solid rgba(249, 115, 22, 0.1)',
          }}
        />
        {/* Road/street accent bar at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 52,
            left: 64,
            right: 64,
            height: 28,
            background: 'linear-gradient(90deg, #f97316 0%, #fb923c 100%)',
            borderRadius: 14,
          }}
        />
        {/* Bold P */}
        <span
          style={{
            color: '#f97316',
            fontSize: 300,
            fontWeight: 900,
            fontFamily: 'system-ui, sans-serif',
            letterSpacing: '-0.03em',
            marginTop: -24,
          }}
        >
          P
        </span>
      </div>
    ),
    {
      width: 512,
      height: 512,
    }
  );
}
