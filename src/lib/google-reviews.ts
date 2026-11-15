import data from '../../content/google-reviews.json';

/**
 * The studio's Google reviews, as collected from its Google page (content/google-reviews.json).
 * The texts are short summaries of what each reviewer wrote – not their exact words – so the site
 * always labels them as summaries and links to the reviewer's own Google profile for the original.
 */
export interface GoogleReview {
  n: number;
  name: string;
  rating: number;
  /** The year the review was written (approximate – Google shows relative dates). */
  year: number;
  /** Summary of the review; empty for a rating without text. */
  text: string;
  profile: string;
}

export const GOOGLE_REVIEWS = data as { rating: number; count: number; collectedAt: string; reviews: GoogleReview[] };

/** The business on Google – every review, in the reviewers' own words. */
export const GOOGLE_REVIEWS_URL = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('חותמות תוך 2 דקות הרא"ה 3 רמת גן');

/** How many reviews gave each number of stars, five first. */
export function ratingSpread(reviews: GoogleReview[] = GOOGLE_REVIEWS.reviews) {
  return [5, 4, 3, 2, 1].map((stars) => ({ stars, count: reviews.filter((r) => r.rating === stars).length }));
}

/** For the home page: the newest reviews that say something, four stars and up. */
export function featuredReviews(limit = 18) {
  return GOOGLE_REVIEWS.reviews.filter((r) => r.text && r.rating >= 4).slice(0, limit);
}
