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
          borderRadius: 38,
          position: 'relative',
        }}
      >
        {/* Road/street accent bar at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: 24,
            right: 24,
            height: 12,
            background: 'linear-gradient(90deg, #f97316 0%, #fb923c 100%)',
            borderRadius: 6,
          }}
        />
        {/* Bold P */}
        <span
          style={{
            color: '#f97316',
            fontSize: 120,
            fontWeight: 900,
            fontFamily: 'system-ui, sans-serif',
            letterSpacing: '-0.03em',
            marginTop: -12,
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
