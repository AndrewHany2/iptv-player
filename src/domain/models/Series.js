function parseRating(value) {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isNaN(n) ? null : n;
}

export function normalizeSeries(raw) {
  return {
    ...raw,
    id: raw.series_id ?? raw.seriesId,
    poster: raw.cover || raw.backdrop_path || null,
    rating: parseRating(raw.rating),
    plot: raw.plot || null,
    genre: raw.genre ? raw.genre.split(",")[0].trim() : null,
    releaseDate: raw.releaseDate || raw.release_date || null,
    categoryId: raw.category_id ? String(raw.category_id) : null,
  };
}

export function normalizeSeriesInfo(raw) {
  const info = raw?.info ?? {};
  const seasons = raw?.seasons ?? {};
  const episodes = raw?.episodes ?? {};
  return {
    plot: info.plot || null,
    cast: info.cast || null,
    director: info.director || null,
    genre: info.genre ? info.genre.split(",")[0].trim() : null,
    year: (info.releaseDate || info.release_date || "").slice(0, 4) || null,
    rating: info.rating ? Number.parseFloat(info.rating) || null : null,
    backdrop: info.backdrop_path || info.cover || null,
    trailer: info.youtube_trailer || null,
    seasons,
    episodes,
  };
}
