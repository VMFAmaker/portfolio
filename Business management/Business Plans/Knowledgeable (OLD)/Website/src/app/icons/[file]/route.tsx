import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';

const SIZES = { '192.png': 192, '512.png': 512, 'maskable-512.png': 512, 'badge-96.png': 96 } as const;
type IconFile = keyof typeof SIZES;

export function generateStaticParams() {
  return Object.keys(SIZES).map((file) => ({ file }));
}

/** App icons for the install manifest and notifications, drawn at build time. */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!(file in SIZES)) return new Response('Not found', { status: 404 });
  const size = SIZES[file as IconFile];
  const maskable = file.startsWith('maskable');
  const badge = file.startsWith('badge');

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          // Badges must be a single colour on transparent; Android tints them.
          background: badge ? 'transparent' : '#9cc7ea',
          borderRadius: maskable || badge ? 0 : size * 0.22,
          color: badge ? '#ffffff' : '#1f3a52',
          fontSize: size * (maskable ? 0.5 : 0.62),
          fontWeight: 700,
          fontFamily: 'serif',
        }}
      >
        K
      </div>
    ),
    { width: size, height: size }
  );
}
