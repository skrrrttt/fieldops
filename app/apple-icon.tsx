import { ImageResponse } from 'next/og';

export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

export default function AppleIcon() {
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
          borderRadius: 36,
          position: 'relative',
        }}
      >
        {/* Road/street accent bar at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 18,
            left: 22,
            right: 22,
            height: 10,
            background: 'linear-gradient(90deg, #f97316 0%, #fb923c 100%)',
            borderRadius: 5,
          }}
        />
        {/* Bold P */}
        <span
          style={{
            color: '#f97316',
            fontSize: 110,
            fontWeight: 900,
            fontFamily: 'system-ui, sans-serif',
            letterSpacing: '-0.03em',
            marginTop: -10,
          }}
        >
          P
        </span>
      </div>
    ),
    {
      ...size,
    }
  );
}
