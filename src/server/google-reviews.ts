import 'server-only';

/**
 * The studio's Google reviews, read live from Google (Places API) and cached for six hours.
 *
 *   GOOGLE_PLACES_API_KEY  – a Google Maps Platform key with "Places API (New)" enabled
 *   GOOGLE_PLACE_ID        – the studio's place id (ChIJ…)
 *
 * Nothing is shown when they are not set or Google cannot be reached – reviews are never invented.
 * Google returns the rating, the number of reviews and up to five reviews; the rest are one tap
 * away on Google itself.
 */
export interface GoogleReview {
  author: string;
  photo?: string;
  rating: number;
  text: string;
  when: string;
  url?: string;
}
export interface GoogleReviews {
  rating: number;
  count: number;
  reviews: GoogleReview[];
  /** The business on Google Maps – all the reviews. */
  url: string;
  writeUrl: string;
}

interface PlacesReview {
  rating?: number;
  text?: { text?: string };
  originalText?: { text?: string };
  relativePublishTimeDescription?: string;
  googleMapsUri?: string;
  authorAttribution?: { displayName?: string; photoUri?: string };
}

export async function getGoogleReviews(): Promise<GoogleReviews | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  const id = process.env.GOOGLE_PLACE_ID?.trim();
  if (!key || !id) return null;
  const base = (process.env.GOOGLE_PLACES_ENDPOINT || 'https://places.googleapis.com/v1/places').replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/${encodeURIComponent(id)}?languageCode=he`, {
      headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'rating,userRatingCount,reviews,googleMapsUri' },
      next: { revalidate: 6 * 3600 },
    });
    if (!res.ok) {
      console.error('[google-reviews]', res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const d = (await res.json()) as { rating?: number; userRatingCount?: number; googleMapsUri?: string; reviews?: PlacesReview[] };
    if (!d.rating || !d.userRatingCount) return null;
    const reviews = (d.reviews ?? [])
      .map((r) => ({
        author: r.authorAttribution?.displayName?.trim() || 'לקוח/ה בגוגל',
        photo: r.authorAttribution?.photoUri,
        rating: Math.round(r.rating ?? 0),
        text: (r.originalText?.text || r.text?.text || '').trim(),
        when: r.relativePublishTimeDescription ?? '',
        url: r.googleMapsUri,
      }))
      // Only what a visitor would want to read here: real text, four stars and up.
      .filter((r) => r.text && r.rating >= 4);
    return {
      rating: d.rating,
      count: d.userRatingCount,
      reviews,
      url: d.googleMapsUri || `https://www.google.com/maps/place/?q=place_id:${id}`,
      writeUrl: `https://search.google.com/local/writereview?placeid=${id}`,
    };
  } catch (e) {
    console.error('[google-reviews]', e);
    return null;
  }
}
