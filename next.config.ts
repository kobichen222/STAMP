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
  // The server-side production engine reads the stamp fonts from disk.
  outputFileTracingIncludes: {
    '/api/orders': ['./public/fonts/stamp/**'],
    '/admin/orders/[id]': ['./public/fonts/stamp/**'],
  },
  async redirects() {
    return [
      // WooCommerce account area → new personal area.
      { source: '/my-account/:path*', destination: '/account/', permanent: true },
      // WordPress system URLs.
      { source: '/feed/:path*', destination: '/', permanent: true },
      { source: '/comments/feed/:path*', destination: '/', permanent: true },
      { source: '/wp-admin/:path*', destination: '/', permanent: true },
      { source: '/wp-login.php', destination: '/', permanent: true },
      { source: '/xmlrpc.php', destination: '/', permanent: true },
      { source: '/sitemap_index.xml', destination: '/sitemap.xml', permanent: true },
      { source: '/:type(page|product|product_cat|product_tag|post)-sitemap.xml', destination: '/sitemap.xml', permanent: true },
      { source: '/product/:slug/feed/:path*', destination: '/stamp/:slug/', permanent: true },
      { source: '/:slug/feed/:path*', destination: '/:slug/', permanent: true },
      { source: '/', has: [{ type: 'query', key: 'attachment_id' }], destination: '/', permanent: true },
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
