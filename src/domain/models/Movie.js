function parseRating(value) {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isNaN(n) ? null : n;
}

export function normalizeMovie(raw) {
  return {
    // Spread raw so existing code reading stream_id, stream_icon, etc. still works
    ...raw,
    // Normalized aliases
    id: raw.stream_id ?? raw.streamId,
    poster: raw.stream_icon || raw.cover || raw.movie_image || null,
    containerExtension: raw.container_extension || "mp4",
    rating: parseRating(raw.tmdb_rating ?? raw.rating),
    categoryId: raw.category_id ? String(raw.category_id) : null,
  };
}

export function normalizeMovieInfo(raw) {
  const info = raw?.info ?? {};
  return {
    plot: info.plot || null,
    cast: info.cast || null,
    director: info.director || null,
    genre: info.genre ? info.genre.split(",")[0].trim() : null,
    year: (info.releasedate || info.release_date || "").slice(0, 4) || null,
    rating: parseRating(info.rating || info.tmdb_rating),
    duration: info.duration || null,
    age: info.age || null,
    backdrop: info.movie_image || null,
    trailer: info.youtube_trailer || null,
  };
}
