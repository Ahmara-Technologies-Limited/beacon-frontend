// Imperative confirmation-modal service, mirroring the toast.js pattern:
// call confirmDialog({...}) from anywhere (no need to lift modal state into
// every component) and await the user's choice, instead of the blocking,
// unstyled, easily-misclicked browser window.confirm().
//
// <ConfirmDialogHost /> (mounted once in app/layout.tsx) is the only thing
// that actually renders the modal; this module just relays requests to it.
let activeHandler = null;

export function registerConfirmHandler(handler) {
  activeHandler = handler;
  return () => {
    if (activeHandler === handler) activeHandler = null;
  };
}

/**
 * @param {Object} options
 * @param {string} [options.title]
 * @param {string} [options.message]
 * @param {string} [options.confirmLabel]
 * @param {string} [options.cancelLabel]
 * @param {boolean} [options.danger] - styles the confirm button as destructive
 * @returns {Promise<boolean>} resolves true if confirmed, false if cancelled
 */
export function confirmDialog({
  title = 'Are you sure?',
  message = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
} = {}) {
  return new Promise((resolve) => {
    if (!activeHandler) {
      // Safety net in the unlikely event the host isn't mounted yet.
      resolve(typeof window !== 'undefined' ? window.confirm(message || title) : false);
      return;
    }
    activeHandler({ title, message, confirmLabel, cancelLabel, danger, resolve });
  });
}
