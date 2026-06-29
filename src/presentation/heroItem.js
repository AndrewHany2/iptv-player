/**
 * heroItem — pure hero-item selection helper (no React, no side effects).
 *
 * The cinematic Hero needs ONE featured item out of a content list. The best
 * candidate is the first item that actually has art to show (a backdrop/cover),
 * so the full-bleed hero isn't a gradient placeholder. If nothing has art we
 * still want a hero, so we fall back to the first usable item; an empty/missing
 * list yields null so the caller can skip rendering entirely.
 *
 * Image resolution mirrors Hero.{web,native}: backdrop_path > cover >
 * movie_image > stream_icon. A non-empty string in any of those counts as art.
 */

/** True if the item carries a usable image URL (non-empty string). */
function hasImage(item) {
  if (!item) return false;
  const src =
    item.backdrop_path || item.cover || item.movie_image || item.stream_icon;
  return typeof src === "string" && src.trim() !== "";
}

/**
 * Pick the best featured item for the Hero.
 *
 * @param {Array<object>} items  Content list (movies/series/etc). Undefined or
 *   non-array input is treated as empty. Undefined/null entries are ignored.
 * @returns {object|null}  First item WITH an image; else the first usable item;
 *   else null when there is nothing to feature.
 */
export function selectHeroItem(items) {
  if (!Array.isArray(items)) return null;

  let firstUsable = null;
  for (const item of items) {
    if (item == null) continue; // ignore undefined/null holes
    if (firstUsable === null) firstUsable = item;
    if (hasImage(item)) return item;
  }
  return firstUsable;
}

export default selectHeroItem;
