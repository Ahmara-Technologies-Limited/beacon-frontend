import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Shared client-side pagination control for the app's list tables. Every
// dataService list getter now fetches the *complete* dataset (see
// fetchAllPages in dataService.js), so this component just slices whatever
// array a view hands it - no server round-trip per page, but a consistent,
// reusable "Page X of Y (N total)" control instead of rendering an
// unbounded table.
export default function Pagination({ page, pageSize, totalItems, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const clampedPage = Math.min(Math.max(1, page), totalPages);
  const startItem = totalItems === 0 ? 0 : (clampedPage - 1) * pageSize + 1;
  const endItem = Math.min(clampedPage * pageSize, totalItems);

  if (totalItems === 0) return null;

  return (
    <div className="pagination-bar">
      <span className="pagination-summary">
        Showing {startItem}-{endItem} of {totalItems}
      </span>
      <div className="pagination-controls">
        <button
          type="button"
          className="btn btn-sm btn-icon"
          onClick={() => onPageChange(clampedPage - 1)}
          disabled={clampedPage <= 1}
        >
          <ChevronLeft size={14} />
          <span>Prev</span>
        </button>
        <span className="pagination-page-label">Page {clampedPage} of {totalPages}</span>
        <button
          type="button"
          className="btn btn-sm btn-icon"
          onClick={() => onPageChange(clampedPage + 1)}
          disabled={clampedPage >= totalPages}
        >
          <span>Next</span>
          <ChevronRight size={14} />
        </button>
      </div>

      <style>{`
        .pagination-bar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 16px;
          border-top: 1px solid var(--border-color);
          font-size: 13px;
          color: var(--text-secondary);
        }
        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .pagination-page-label {
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}

// Slices `items` down to the given page. Views should reset `page` to 1
// whenever their filters/search term change (the item set underneath has
// shifted, so whatever page they were on may no longer make sense).
export function paginate(items, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const clampedPage = Math.min(Math.max(1, page), totalPages);
  const start = (clampedPage - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
