export function normalizeChannel(raw) {
  return {
    ...raw,
    id: raw.stream_id ?? raw.streamId,
    logo: raw.stream_icon || null,
    epgId: raw.epg_channel_id || null,
    categoryId: raw.category_id ? String(raw.category_id) : null,
    streamType: raw.stream_type || "live",
  };
}
