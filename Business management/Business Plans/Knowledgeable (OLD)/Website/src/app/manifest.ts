import type { MetadataRoute } from 'next';

/** Makes Knowledgeable installable ("Add to Home Screen"), which is also what enables push on iPhone. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Knowledgeable',
    short_name: 'Knowledgeable',
    description: 'Learn a little every day — ideas, papers, books and short videos from people who read.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#9cc7ea',
    icons: [
      { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
