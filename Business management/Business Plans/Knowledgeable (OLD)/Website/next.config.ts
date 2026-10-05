import type {NextConfig} from 'next';

const isDev = process.env.NODE_ENV !== 'production';
const useEmulators = process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === 'true';
const emulatorHosts = useEmulators ? ' http://127.0.0.1:9099 http://127.0.0.1:8080 http://127.0.0.1:9199 ws://127.0.0.1:*' : '';

// Content-Security-Policy: limits where scripts, frames, images and network requests may come
// from, so an injected script (XSS) can't load code from or send data to other sites.
const csp = [
  "default-src 'self'",
  // 'unsafe-inline' is required by Next.js' inline bootstrap scripts; apis.google.com serves the
  // Firebase Auth popup helper. 'unsafe-eval' is only needed by the dev server.
  `script-src 'self' 'unsafe-inline' https://apis.google.com${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://firebasestorage.googleapis.com https://lh3.googleusercontent.com https://covers.openlibrary.org https://archive.org https://*.archive.org${useEmulators ? ' http://127.0.0.1:9199' : ''}`,
  `media-src 'self' blob: https://firebasestorage.googleapis.com${useEmulators ? ' http://127.0.0.1:9199' : ''}`,
  "font-src 'self' data:",
  `connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebaseapp.com${emulatorHosts}${isDev ? ' ws://localhost:* ws://127.0.0.1:*' : ''}`,
  "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
  // The push-notification service worker (public/sw.js) must come from our own origin.
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // Allows the Google sign-in popup to report back while isolating the window otherwise.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  ...(isDev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/**' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'covers.openlibrary.org', pathname: '/**' },
      ...(useEmulators ? [{ protocol: 'http' as const, hostname: '127.0.0.1', port: '9199', pathname: '/**' }] : []),
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
