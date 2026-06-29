import { useState, useEffect, useRef, useCallback } from "react";

const BUFFER_ROWS = 2; // rows above/below viewport to keep rendered

/**
 * Virtual-scrolling grid for TV screens.
 *
 * Only renders items in the visible viewport ± BUFFER_ROWS, dramatically
 * reducing DOM nodes for large channel/movie lists on memory-constrained TVs.
 *
 * D-pad compatible: the TV screens drive a single `focusIndex` (absolute item
 * index) rather than tab focus. When `focusIndex` changes we (a) extend the
 * rendered window to include the focused row and (b) scroll it into view, so
 * the focused card is always mounted and visible even when the user jumps past
 * the current window. `renderItem` receives the ABSOLUTE index so callers keep
 * their existing `i === focus` styling logic unchanged.
 *
 * @param {object}   props
 * @param {any[]}    props.items         - Flat array of all items.
 * @param {number}   props.cols          - Columns per row (default 8).
 * @param {number}   props.rowHeight     - Pixel height of each row (default 160).
 * @param {number}   props.gap           - Gap between cells in px (default 8).
 * @param {Function} props.renderItem    - (item, absoluteIndex) => React node.
 * @param {number}   [props.focusIndex]  - Absolute index of the focused item.
 * @param {Function} [props.onEndReached] - Called when user scrolls near the end.
 * @param {string}   [props.className]
 */
export function VirtualGridTV({
  items,
  cols = 8,
  rowHeight = 160,
  gap = 8,
  renderItem,
  focusIndex = 0,
  onEndReached,
  className = "",
}) {
  const containerRef = useRef(null);
  const totalRows = Math.ceil(items.length / cols);
  const [range, setRange] = useState({ start: 0, end: Math.min(BUFFER_ROWS * 2 + 4, totalRows) });

  const recalc = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollTop, clientHeight } = el;
    const rowWithGap = rowHeight + gap;
    const startRow = Math.max(0, Math.floor(scrollTop / rowWithGap) - BUFFER_ROWS);
    const endRow = Math.min(
      totalRows,
      Math.ceil((scrollTop + clientHeight) / rowWithGap) + BUFFER_ROWS,
    );
    setRange((prev) =>
      prev.start === startRow && prev.end === endRow ? prev : { start: startRow, end: endRow },
    );
    if (endRow >= totalRows - 1) onEndReached?.();
  }, [rowHeight, gap, totalRows, onEndReached]);

  useEffect(() => {
    recalc();
  }, [items.length, recalc]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", recalc, { passive: true });
    return () => el.removeEventListener("scroll", recalc);
  }, [recalc]);

  // ── D-pad focus: keep the focused row mounted + in view ───────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const rowWithGap = rowHeight + gap;
    const focusRow = Math.floor(focusIndex / cols);
    // Extend the window so the focused row (± buffer) is always rendered.
    setRange((prev) => {
      const start = Math.min(prev.start, Math.max(0, focusRow - BUFFER_ROWS));
      const end = Math.max(prev.end, Math.min(totalRows, focusRow + BUFFER_ROWS + 1));
      return prev.start === start && prev.end === end ? prev : { start, end };
    });
    // Scroll the focused row into view (top/bottom edges of the viewport).
    const rowTop = focusRow * rowWithGap;
    const rowBottom = rowTop + rowHeight;
    if (rowTop < el.scrollTop) el.scrollTop = rowTop;
    else if (rowBottom > el.scrollTop + el.clientHeight)
      el.scrollTop = rowBottom - el.clientHeight;
    if (focusRow >= totalRows - 2) onEndReached?.();
  }, [focusIndex, cols, rowHeight, gap, totalRows, onEndReached]);

  const rowWithGap = rowHeight + gap;
  const paddingTop = range.start * rowWithGap;
  const paddingBottom = Math.max(0, (totalRows - range.end)) * rowWithGap;
  const visibleItems = items.slice(range.start * cols, range.end * cols);

  return (
    <div
      ref={containerRef}
      className={`tv-virtual-grid${className ? ` ${className}` : ""}`}
      style={{ overflowY: "auto", height: "100%", contain: "strict" }}
    >
      <div style={{ paddingTop, paddingBottom }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap,
          }}
        >
          {visibleItems.map((item, i) =>
            renderItem(item, range.start * cols + i),
          )}
        </div>
      </div>
    </div>
  );
}
