import { useEffect, useState } from 'react';
import { useResetOnChange } from './useResetOnChange';

// Keeping a just-created record visible in a filtered list.
//
// Every list view in the app filters client-side, and several of the create
// forms (LeadModal, InspectionModal) are mounted globally in CrmUIContext and
// know nothing about those filters. So a record created while a filter - or
// the header search - was narrowing the table would save correctly and then
// simply not be in the list. To the user that reads as "it didn't save", or,
// when the filter matched nothing else either, as an empty table right after
// a successful create.
//
// Views call this with the record their create flow just produced and a
// `reveal` callback that drops whichever of their own filters would hide it
// (see `hides` below). The returned id is the row to highlight, and clears
// itself after a few seconds so the marker doesn't linger for the session.

const HIGHLIGHT_MS = 4000;

/**
 * True when a filter set to `value` would hide a record whose corresponding
 * field is `recordValue`. 'All' means "not filtering", so it never hides.
 */
export function hides(value, recordValue) {
  return value !== 'All' && value !== recordValue;
}

/**
 * @param {object|null} createdRecord - the record just created, or null
 * @param {(record: object) => void} reveal - drops the filters that would hide it
 * @returns {string|null} id of the row to highlight, or null
 */
export function useRevealCreated(createdRecord, reveal) {
  const [highlightId, setHighlightId] = useState(null);

  // Adjusting state during render rather than in an effect: the corrected
  // filters are in place before anything reaches the DOM, so the table never
  // paints once without the new row. See useResetOnChange.
  useResetOnChange(createdRecord ? createdRecord.id : '', () => {
    if (!createdRecord) return;
    reveal(createdRecord);
    setHighlightId(createdRecord.id);
  });

  useEffect(() => {
    if (!highlightId) return undefined;
    const timer = setTimeout(() => setHighlightId(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [highlightId]);

  return highlightId;
}
