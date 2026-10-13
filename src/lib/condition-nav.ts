/**
 * Navigation to a condition's results page.
 *
 * The full-screen PremiumLoader should only appear when the user has just
 * chosen a condition in the app, never when the results page is opened cold
 * (tab restore, bookmark, shared link, PWA resume). In-app selections mark
 * themselves with this router state so the results page can tell the two apart.
 */

/** Router state carried by an in-app "show me this condition" navigation. */
export interface ConditionNavState {
  fromSearch: true;
}

export const FROM_SEARCH_STATE: ConditionNavState = { fromSearch: true };

/** Navigation options for an in-app condition selection. */
export const FROM_SEARCH_NAV = { state: FROM_SEARCH_STATE } as const;

/** True when router state says the user just picked this condition in-app. */
export const isFromSearch = (state: unknown): state is ConditionNavState =>
  typeof state === "object" &&
  state !== null &&
  (state as { fromSearch?: unknown }).fromSearch === true;

/** Path of the results page for a condition, carrying its display name when known. */
export const conditionPath = (id: string, name?: string): string =>
  name ? `/conditions/${id}?name=${encodeURIComponent(name)}` : `/conditions/${id}`;
