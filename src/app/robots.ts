import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.VERCEL_ENV ? process.env.VERCEL_ENV === 'production' : true;
  return {
    // Preview deployments must never be indexed.
    rules: isProduction ? { userAgent: '*', allow: '/', disallow: ['/api/'] } : { userAgent: '*', disallow: '/' },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
