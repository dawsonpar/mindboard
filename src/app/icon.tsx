import { ImageResponse } from 'next/og';
import fs from 'fs';
import path from 'path';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  const iconPath = path.join(process.cwd(), 'public', 'brain.png');
  const iconData = fs.readFileSync(iconPath);
  const base64 = iconData.toString('base64');
  const src = `data:image/png;base64,${base64}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        <img
          src={src}
          width={32}
          height={32}
          style={{ filter: 'invert(1)' }}
        />
      </div>
    ),
    { ...size }
  );
}
