import { memo, useState } from "react";
import { colors } from "../../ui/tokens";

/**
 * Poster card — web/TV (raw DOM, no Tamagui). Shared across Movies/Series/LiveTV.
 *
 * Uses an EXPLICIT poster height (width × 3/2) rather than `aspect-ratio`, which
 * isn't supported on older webOS Chromium and collapsed the box there. Focus and
 * hover both show the cyan Aurora ring (hover via the `.lumen-poster-card` CSS
 * class so it can't shift layout / overlap neighbours like a transform would).
 */
function PosterCardWeb({ item, onPress, isFocused, width = 200 }) {
  const [imageError, setImageError] = useState(false);
  const posterH = Math.round(width * 1.5);
  const poster = item.stream_icon || item.cover || item.movie_image || item.backdrop_path || null;
  const ratingValue = item.tmdb_rating ?? item.rating;
  const ratingLabel = ratingValue != null && ratingValue !== ""
    ? (typeof ratingValue === "number" ? ratingValue.toFixed(1) : ratingValue)
    : null;

  return (
    <div
      className="lumen-poster-card"
      onClick={() => onPress?.(item)}
      data-tv-focused={isFocused ? "true" : undefined}
      style={{
        width,
        cursor: "pointer",
        borderRadius: 14,
        outline: isFocused ? "2px solid #22D3EE" : "none",
        outlineOffset: 3,
      }}
    >
      <div style={{ width, height: posterH, borderRadius: 12, backgroundColor: "#141A2E", overflow: "hidden", position: "relative" }}>
        {poster && !imageError ? (
          <img src={poster} alt={item.name} loading="lazy" onError={() => setImageError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#141A2E", fontSize: 32 }}>🎬</div>
        )}
        <div style={{ position: "absolute", top: 8, right: 8, zIndex: 4, backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 4, padding: "2px 5px" }}>
          <span style={{ color: "#ccc", fontSize: 9, fontWeight: 700, letterSpacing: 0.5 }}>HD</span>
        </div>
        {ratingLabel && (
          <div style={{ position: "absolute", top: 8, left: 8, zIndex: 4, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 4, padding: "2px 5px" }}>
            <span style={{ color: colors.rating, fontSize: 9, fontWeight: 700 }}>⭐ {ratingLabel}</span>
          </div>
        )}
      </div>
      <div style={{
        width, color: "#EAF0FF", fontSize: 13, fontWeight: 600, marginTop: 8, lineHeight: "17px", height: 34,
        overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box",
        WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
      }}>{item.name}</div>
    </div>
  );
}

export default memo(PosterCardWeb);
