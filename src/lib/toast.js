import toast from 'react-hot-toast';

// Central place for user-facing feedback so every save/delete/action across
// the app reports success/failure consistently instead of failing silently.

export const notifySuccess = (message) => toast.success(message);

// A 403 from a background list fetch is not news the user can act on: it
// means this role was never meant to see that data. Surfacing it as "You do
// not have permission to perform this action" - twice, on login - reads as a
// broken app rather than as a role boundary. Views use this to skip the toast
// for data they were only speculatively asking for; an action the user
// actually clicked still reports its failure.
export const isPermissionError = (err) => !!err && err.status === 403;

export const notifyError = (err, fallback = 'Something went wrong. Please try again.') => {
  const message = (err && err.message) ? err.message : fallback;
  return toast.error(message);
};

/**
 * Reports a failed background load, unless it failed because this role has no
 * access to the resource - in which case the view simply renders without it.
 */
export const notifyLoadError = (err, fallback) => {
  if (isPermissionError(err)) {
    console.warn('[permissions] skipped inaccessible resource:', err.message);
    return null;
  }
  return notifyError(err, fallback);
};

export const notifyLoading = (message) => toast.loading(message);

export const dismissToast = (id) => toast.dismiss(id);

export default toast;
