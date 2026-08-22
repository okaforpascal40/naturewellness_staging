/**
 * Photography for the food cards.
 *
 * A curated map beats a live Unsplash search here: search results for a term
 * like "grape" are unpredictable, the API costs a round trip per card, and a
 * search key would have to ship in the bundle. These URLs are stable Unsplash
 * CDN links that need no key.
 *
 * Every consumer must still handle a miss — `getFoodImage` returns null for
 * unmapped foods and the caller falls back to the emoji from `food-display`.
 *
 * Unsplash photo ids do rot: seven of the twenty this map was first written
 * with had already 404'd. src/test/food-images.test.ts pings every entry, so
 * add a food only once its URL is verified reachable.
 */

/** Width requested from the Unsplash CDN; cards render at 80px, so 2x covers retina. */
const IMAGE_WIDTH = 200;

const FOOD_IMAGE_MAP: Record<string, string> = {
  Turmeric: "https://images.unsplash.com/photo-1615485500834-bc10199bc727",
  Blueberry: "https://images.unsplash.com/photo-1457296898342-cdd24585d095",
  Grape: "https://images.unsplash.com/photo-1537640538966-79f369143f8f",
  Broccoli: "https://images.unsplash.com/photo-1459411621453-7b03977f4bfc",
  Onion: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb",
  Kale: "https://images.unsplash.com/photo-1524179091875-bf99a9a6af57",
  Apple: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6",
  "Green Tea": "https://images.unsplash.com/photo-1556679343-c7306c1976bc",
  Strawberry: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6",
  Ginger: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5",
  Spinach: "https://images.unsplash.com/photo-1576045057995-568f588f82fb",
  Tomato: "https://images.unsplash.com/photo-1607305387299-a3d9611cd469",
  Avocado: "https://images.unsplash.com/photo-1519162808019-7de1683fa2ad",
  Olive: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5",
};

/**
 * Longest keys first so "Green Tea" wins over "Tea" and a multi-word food is
 * never shadowed by one of its own words.
 */
const FOOD_KEYS = Object.keys(FOOD_IMAGE_MAP).sort((a, b) => b.length - a.length);

/** Append the CDN's sizing query so we don't download a full-resolution photo. */
const sized = (url: string): string => `${url}?w=${IMAGE_WIDTH}&q=80&auto=format&fit=crop`;

/**
 * Photo URL for a food name, or null when we have no curated image.
 *
 * Matching is case-insensitive and two-way: the API returns names like
 * "grapes" and "green tea leaf", so a key matches when either string contains
 * the other.
 */
export function getFoodImage(foodName: string): string | null {
  const name = (foodName || "").trim();
  if (!name) return null;

  const direct = FOOD_IMAGE_MAP[name];
  if (direct) return sized(direct);

  const lower = name.toLowerCase();
  const key = FOOD_KEYS.find((k) => {
    const lk = k.toLowerCase();
    return lower === lk || lower.includes(lk) || lk.includes(lower);
  });
  return key ? sized(FOOD_IMAGE_MAP[key]) : null;
}

/** Whether a curated photo exists, without building the URL. */
export function hasFoodImage(foodName: string): boolean {
  return getFoodImage(foodName) !== null;
}
