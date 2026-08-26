// A tiny pub/sub bus so that when any part of the app performs a mutation
// (POST/PATCH/DELETE via dataService), every view holding a matching list in
// local state can refetch immediately instead of waiting for its next poll
// tick. This matters specifically because several create/edit modals
// (LeadModal, InspectionModal, LogActivityModal) are mounted once, globally,
// in CrmUIContext - completely decoupled from whichever page is on screen -
// so closing them previously had no way to tell that page "go reload now."
//
// Usage:
//   emitDataChange('leads');                         // after a mutation
//   const unsubscribe = onDataChange('leads', fn);    // in a view's effect
const target = typeof EventTarget !== 'undefined' ? new EventTarget() : null;

export function emitDataChange(resource) {
  if (!target) return;
  target.dispatchEvent(new CustomEvent('datachange', { detail: resource }));
}

// `resources` may be a single resource string or an array of them. The
// callback fires whenever any matching resource changes.
export function onDataChange(resources, callback) {
  if (!target) return () => {};
  const list = Array.isArray(resources) ? resources : [resources];
  const handler = (e) => {
    if (list.includes(e.detail)) callback(e.detail);
  };
  target.addEventListener('datachange', handler);
  return () => target.removeEventListener('datachange', handler);
}
