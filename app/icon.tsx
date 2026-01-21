import { ImageResponse } from 'next/og';

export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

export default function Icon() {
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
          borderRadius: 6,
        }}
      >
        {/* Road/chevron accent */}
        <div
          style={{
            position: 'absolute',
            bottom: 4,
            left: 4,
            right: 4,
            height: 3,
            background: 'linear-gradient(90deg, #f97316 0%, #fb923c 100%)',
            borderRadius: 2,
          }}
        />
        {/* Bold P */}
        <span
          style={{
            color: '#f97316',
            fontSize: 22,
            fontWeight: 900,
            fontFamily: 'system-ui, sans-serif',
            letterSpacing: '-0.03em',
            marginTop: -2,
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
