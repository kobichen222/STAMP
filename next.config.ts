import type { NextConfig } from 'next';

/**
 * Where images that were not downloaded into /public/wp-content/uploads are
 * fetched from. Once scripts/download-media.mjs has been run and the files are
 * deployed, this fallback is never hit.
 */
const MEDIA_ORIGIN = (process.env.WP_MEDIA_ORIGIN || 'https://www.stamp2go.co.il').replace(/\/$/, '');

const nextConfig: NextConfig = {
  // WordPress URLs end with "/" – keep the exact same URL structure for SEO.
  trailingSlash: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  // resvg (PNG proof for the studio's e-mail, /api/orders/[id]/preview?format=png) loads a native binary: not bundled.
  serverExternalPackages: ['@resvg/resvg-js'],
  // The server-side production engine reads the stamp fonts from disk: the designer's (public/fonts/stamp) and,
  // for a stamp-bot line, the bot's drawer (src/stamp-bot/fonts, read through process.cwd()). Every route that
  // renders a stamp needs them: order creation, payment confirmation, file export / print / regeneration in the
  // admin, and the home page, whose server actions draw the bot's stamps.
  outputFileTracingIncludes: {
    '/': ['./src/stamp-bot/fonts/**'],
    '/api/orders': ['./public/fonts/stamp/**', './src/stamp-bot/fonts/**'],
    '/api/payments/tranzila/notify': ['./public/fonts/stamp/**', './src/stamp-bot/fonts/**'],
    '/api/admin/export': ['./public/fonts/stamp/**', './src/stamp-bot/fonts/**'],
    '/admin/orders/[id]': ['./public/fonts/stamp/**', './src/stamp-bot/fonts/**'],
    '/admin/orders/[id]/edit': ['./public/fonts/stamp/**', './src/stamp-bot/fonts/**'],
    '/admin/orders/[id]/print': ['./public/fonts/stamp/**', './src/stamp-bot/fonts/**'],
    '/admin/print-station': ['./public/fonts/stamp/**', './src/stamp-bot/fonts/**'],
  },
  async redirects() {
    return [
      // WooCommerce account area → new personal area.
      { source: '/my-account/:path*', destination: '/account/', statusCode: 301 },
      // WordPress system URLs.
      { source: '/feed/:path*', destination: '/', statusCode: 301 },
      { source: '/comments/feed/:path*', destination: '/', statusCode: 301 },
      { source: '/wp-admin/:path*', destination: '/', statusCode: 301 },
      { source: '/wp-login.php', destination: '/', statusCode: 301 },
      { source: '/xmlrpc.php', destination: '/', statusCode: 301 },
      { source: '/sitemap_index.xml', destination: '/sitemap.xml', statusCode: 301 },
      { source: '/:type(page|product|product_cat|product_tag|post)-sitemap.xml', destination: '/sitemap.xml', statusCode: 301 },
      { source: '/product/:slug/feed/:path*', destination: '/stamp/:slug/', statusCode: 301 },
      { source: '/:slug/feed/:path*', destination: '/:slug/', statusCode: 301 },
      { source: '/', has: [{ type: 'query', key: 'attachment_id' }], destination: '/', statusCode: 301 },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      // Only used when a file is missing from /public (see download-media script).
      fallback: [{ source: '/wp-content/:path*', destination: `${MEDIA_ORIGIN}/wp-content/:path*` }],
    };
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/wp-content/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000' }],
      },
    ];
  },
};

export default nextConfig;
