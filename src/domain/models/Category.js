export function normalizeCategory(raw) {
  return {
    id: String(raw.category_id ?? raw.id ?? ""),
    name: raw.category_name ?? raw.name ?? "",
    parentId: raw.parent_id ? String(raw.parent_id) : null,
  };
}
