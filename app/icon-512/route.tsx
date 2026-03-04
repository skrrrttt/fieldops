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
        {/* Road/street accent bar at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 52,
            left: 64,
            right: 64,
            height: 28,
            background: 'linear-gradient(90deg, #d4863f 0%, #e0a060 100%)',
            borderRadius: 14,
          }}
        />
        {/* Bold P */}
        <span
          style={{
            color: '#d4863f',
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
