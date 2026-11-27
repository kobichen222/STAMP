import data from '../../content/google-reviews.json';

/**
 * The studio's Google reviews (content/google-reviews.json).
 * The texts are the reviewers' own words, as supplied by the business on 2026-11-27 – shown for
 * 4 and 5 stars only. Reviews of 1 to 3 stars keep their rating but carry no text on the site;
 * their wording is on Google.
 */
export interface GoogleReview {
  n: number;
  name: string;
  rating: number;
  /** The year the review was written (approximate – Google shows relative dates). */
  year: number;
  /** The reviewer's own words (line breaks kept); empty for a rating without text and for 1-3 stars. */
  text: string;
  /** The reviewer's uploaded Google profile picture; absent when they use Google's default letter image. */
  avatar?: string;
  profile: string;
}

export const GOOGLE_REVIEWS = data as { rating: number; count: number; collectedAt: string; reviews: GoogleReview[] };

/** The business on Google – every review, in the reviewers' own words. */
export const GOOGLE_REVIEWS_URL = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('חותמות תוך 2 דקות הרא"ה 3 רמת גן');

/** How many reviews gave each number of stars, five first. */
export function ratingSpread(reviews: GoogleReview[] = GOOGLE_REVIEWS.reviews) {
  return [5, 4, 3, 2, 1].map((stars) => ({ stars, count: reviews.filter((r) => r.rating === stars).length }));
}

/** The newest reviews that say something, four stars and up. */
export function featuredReviews(limit = 18) {
  return GOOGLE_REVIEWS.reviews.filter((r) => r.text && r.rating >= 4).slice(0, limit);
}

/** The home page's nine reviews, in this order (three groups of three). */
const HOME_NAMES = ['יגאל נאגר', 'shay alon', 'Omri Dabush', 'Gili Basson', 'Ido Sela', 'Elad Gur-Arie', 'Keshet Brown Rotberg', 'Yotam Turgeman', 'Dean Veisser'];

/**
 * For the home page: always nine reviews. A name that is missing or has no text is replaced by the
 * next newest 4-5 star review with text that is not already in the list.
 */
export function homeReviews(): GoogleReview[] {
  const all = GOOGLE_REVIEWS.reviews;
  const usable = (r: GoogleReview | undefined): r is GoogleReview => !!r && !!r.text && r.rating >= 4;
  const picked = HOME_NAMES.map((name) => all.find((r) => r.name === name));
  const taken = new Set(picked.filter(usable).map((r) => r.n));
  const spare = all.filter((r) => usable(r) && !taken.has(r.n));
  return picked.map((r) => (usable(r) ? r : spare.shift())).filter((r): r is GoogleReview => !!r);
}
