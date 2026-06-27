import { test, describe } from "node:test";
import assert from "node:assert/strict";

// Inline the normalizers so these tests run without React Native available.
// If the normalizer implementations change, update here or import directly.

function normalizeCategory(raw) {
  return {
    id: String(raw.category_id ?? raw.id ?? ""),
    name: raw.category_name ?? raw.name ?? "",
    parentId: raw.parent_id ? String(raw.parent_id) : null,
  };
}

function parseRating(v) {
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

function normalizeMovie(raw) {
  return {
    ...raw,
    id: raw.stream_id ?? raw.streamId,
    poster: raw.stream_icon || raw.cover || raw.movie_image || null,
    containerExtension: raw.container_extension || "mp4",
    rating: parseRating(raw.tmdb_rating ?? raw.rating),
    categoryId: raw.category_id ? String(raw.category_id) : null,
  };
}

function normalizeChannel(raw) {
  return {
    ...raw,
    id: raw.stream_id ?? raw.streamId,
    logo: raw.stream_icon || null,
    epgId: raw.epg_channel_id || null,
    categoryId: raw.category_id ? String(raw.category_id) : null,
    streamType: raw.stream_type || "live",
  };
}

function normalizeSeries(raw) {
  return {
    ...raw,
    id: raw.series_id ?? raw.seriesId,
    poster: raw.cover || null,
    rating: parseRating(raw.rating),
    categoryId: raw.category_id ? String(raw.category_id) : null,
  };
}

// ── Category ────────────────────────────────────────────────────────────────

describe("normalizeCategory", () => {
  test("maps category_id and category_name to id/name", () => {
    const result = normalizeCategory({ category_id: "42", category_name: "Action" });
    assert.equal(result.id, "42");
    assert.equal(result.name, "Action");
    assert.equal(result.parentId, null);
  });

  test("falls back to id/name when category_id/category_name absent", () => {
    const result = normalizeCategory({ id: 7, name: "Drama" });
    assert.equal(result.id, "7");
    assert.equal(result.name, "Drama");
  });

  test("maps parent_id to string", () => {
    const result = normalizeCategory({ category_id: "1", category_name: "Sub", parent_id: 2 });
    assert.equal(result.parentId, "2");
  });

  test("returns empty string id when no id field present", () => {
    const result = normalizeCategory({ category_name: "Unknown" });
    assert.equal(result.id, "");
  });
});

// ── Movie ───────────────────────────────────────────────────────────────────

describe("normalizeMovie", () => {
  test("exposes id alias for stream_id", () => {
    const raw = { stream_id: 101, name: "Test Movie" };
    const result = normalizeMovie(raw);
    assert.equal(result.id, 101);
    assert.equal(result.stream_id, 101); // backward compat spread
  });

  test("prefers stream_icon for poster, falls back to cover then movie_image", () => {
    assert.equal(normalizeMovie({ stream_id: 1, stream_icon: "icon.jpg", cover: "c.jpg" }).poster, "icon.jpg");
    assert.equal(normalizeMovie({ stream_id: 1, cover: "c.jpg" }).poster, "c.jpg");
    assert.equal(normalizeMovie({ stream_id: 1, movie_image: "m.jpg" }).poster, "m.jpg");
    assert.equal(normalizeMovie({ stream_id: 1 }).poster, null);
  });

  test("defaults containerExtension to mp4", () => {
    assert.equal(normalizeMovie({ stream_id: 1 }).containerExtension, "mp4");
    assert.equal(normalizeMovie({ stream_id: 1, container_extension: "mkv" }).containerExtension, "mkv");
  });

  test("parses rating as float, null when invalid", () => {
    assert.equal(normalizeMovie({ stream_id: 1, rating: "7.5" }).rating, 7.5);
    assert.equal(normalizeMovie({ stream_id: 1, tmdb_rating: "8.1" }).rating, 8.1);
    assert.equal(normalizeMovie({ stream_id: 1, rating: "N/A" }).rating, null);
    assert.equal(normalizeMovie({ stream_id: 1 }).rating, null);
  });

  test("categoryId is stringified", () => {
    assert.equal(normalizeMovie({ stream_id: 1, category_id: 5 }).categoryId, "5");
    assert.equal(normalizeMovie({ stream_id: 1 }).categoryId, null);
  });
});

// ── Channel ─────────────────────────────────────────────────────────────────

describe("normalizeChannel", () => {
  test("maps stream_id → id and stream_icon → logo", () => {
    const raw = { stream_id: 200, stream_icon: "logo.png", name: "BBC" };
    const result = normalizeChannel(raw);
    assert.equal(result.id, 200);
    assert.equal(result.logo, "logo.png");
    assert.equal(result.stream_id, 200); // backward compat
  });

  test("logo is null when stream_icon absent", () => {
    assert.equal(normalizeChannel({ stream_id: 1 }).logo, null);
  });

  test("defaults streamType to live", () => {
    assert.equal(normalizeChannel({ stream_id: 1 }).streamType, "live");
  });

  test("maps epg_channel_id → epgId", () => {
    assert.equal(normalizeChannel({ stream_id: 1, epg_channel_id: "EPG123" }).epgId, "EPG123");
    assert.equal(normalizeChannel({ stream_id: 1 }).epgId, null);
  });
});

// ── Series ──────────────────────────────────────────────────────────────────

describe("normalizeSeries", () => {
  test("maps series_id → id and cover → poster", () => {
    const raw = { series_id: 300, cover: "cover.jpg", name: "Westworld" };
    const result = normalizeSeries(raw);
    assert.equal(result.id, 300);
    assert.equal(result.poster, "cover.jpg");
    assert.equal(result.series_id, 300); // backward compat
  });

  test("poster is null when cover absent", () => {
    assert.equal(normalizeSeries({ series_id: 1 }).poster, null);
  });

  test("rating parsed as float", () => {
    assert.equal(normalizeSeries({ series_id: 1, rating: "9.0" }).rating, 9.0);
    assert.equal(normalizeSeries({ series_id: 1 }).rating, null);
  });
});
