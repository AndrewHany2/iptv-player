import { useState, useEffect, useRef, useCallback } from "react";

const BUFFER_ROWS = 2; // rows above/below viewport to keep rendered

/**
 * Virtual-scrolling grid for TV screens.
 *
 * Only renders items in the visible viewport ± BUFFER_ROWS, dramatically
 * reducing DOM nodes for large channel/movie lists on memory-constrained TVs.
 *
 * @param {object}   props
 * @param {any[]}    props.items         - Flat array of all items.
 * @param {number}   props.cols          - Columns per row (default 8).
 * @param {number}   props.rowHeight     - Pixel height of each row (default 160).
 * @param {number}   props.gap           - Gap between cells in px (default 8).
 * @param {Function} props.renderItem    - (item, absoluteIndex) => React node.
 * @param {Function} [props.onEndReached] - Called when user scrolls near the end.
 * @param {string}   [props.className]
 */
export function VirtualGridTV({
  items,
  cols = 8,
  rowHeight = 160,
  gap = 8,
  renderItem,
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
  }, [cols, rowHeight, gap, totalRows, onEndReached]);

  useEffect(() => {
    recalc();
  }, [items.length, recalc]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", recalc, { passive: true });
    return () => el.removeEventListener("scroll", recalc);
  }, [recalc]);

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
