import toast from 'react-hot-toast';

// Central place for user-facing feedback so every save/delete/action across
// the app reports success/failure consistently instead of failing silently.

export const notifySuccess = (message) => toast.success(message);

export const notifyError = (err, fallback = 'Something went wrong. Please try again.') => {
  const message = (err && err.message) ? err.message : fallback;
  return toast.error(message);
};

export const notifyLoading = (message) => toast.loading(message);

export const dismissToast = (id) => toast.dismiss(id);

export default toast;
