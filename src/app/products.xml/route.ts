import { SITE } from '@/lib/config';
import { productFacts, SERIES_LABEL } from '@/lib/catalog';
import { site } from '@/lib/content';

/**
 * Product feed for external stores and marketplaces (RSS 2.0 + Google
 * Merchant namespace – the format most marketplaces import). Built from the
 * catalogue, so it stays in sync with the site on every deploy.
 */
export const dynamic = 'force-static';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const abs = (path: string) => SITE.url + encodeURI(path);
const categoryName = new Map(site.categories.map((c) => [c.id, c.name]));

function description(p: (typeof site.products)[number]) {
  const f = productFacts(p);
  const parts = [
    p.shortDescription.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    SERIES_LABEL[f.series],
    p.stampArea && `שטח החתמה ${p.stampArea.replace('*', '×')} מ״מ`,
    p.rowsCount && (/^\d+$/.test(p.rowsCount.trim()) ? `${p.rowsCount.trim()} שורות` : p.rowsCount),
    'עיצוב אונליין ותצוגה מקדימה, ייצור בלייזר תוך 2 דקות, גוף COLOP מאוסטריה.',
  ];
  return parts.filter(Boolean).join(' · ');
}

export function GET() {
  const items = site.products
    .filter((p) => p.price != null && p.image)
    .map((p) => {
      const f = productFacts(p);
      const images = p.gallery.filter((g) => g.src !== p.image!.src).slice(0, 10);
      const sale = p.regularPrice != null && p.price! < p.regularPrice;
      return `    <item>
      <g:id>${p.id}</g:id>
      <g:title>${esc(p.title)}</g:title>
      <g:description>${esc(description(p))}</g:description>
      <g:link>${esc(abs(`/stamp/${p.slug}/`))}</g:link>
      <g:image_link>${esc(abs(p.image!.src))}</g:image_link>
${images.map((g) => `      <g:additional_image_link>${esc(abs(g.src))}</g:additional_image_link>`).join('\n')}
      <g:price>${(sale ? p.regularPrice! : p.price!).toFixed(2)} ILS</g:price>
${sale ? `      <g:sale_price>${p.price!.toFixed(2)} ILS</g:sale_price>\n` : ''}      <g:availability>in_stock</g:availability>
      <g:condition>new</g:condition>
      <g:brand>COLOP</g:brand>
      <g:identifier_exists>no</g:identifier_exists>
      <g:google_product_category>2986</g:google_product_category>
      <g:product_type>${esc([p.primaryCategoryId && categoryName.get(p.primaryCategoryId), SERIES_LABEL[f.series]].filter(Boolean).join(' > '))}</g:product_type>
${f.size ? `      <g:size>${esc(f.size)}</g:size>\n` : ''}      <g:shipping>
        <g:country>IL</g:country>
        <g:service>איסוף עצמי – רמת גן</g:service>
        <g:price>0.00 ILS</g:price>
      </g:shipping>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${esc(`${SITE.hebrewName} – ${SITE.name}`)}</title>
    <link>${SITE.url}/</link>
    <description>${esc(SITE.tagline)}</description>
    <language>he</language>
${items}
  </channel>
</rss>
`;
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
