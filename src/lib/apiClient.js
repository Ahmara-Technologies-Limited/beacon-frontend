// Thin fetch wrapper around the Django REST backend.
// Reads NEXT_PUBLIC_API_URL, attaches the JWT bearer token from localStorage,
// handles JSON request/response, and throws on non-2xx responses with the
// parsed error body attached (err.body / err.status).

const ACCESS_TOKEN_KEY = 'beacon_access_token';
const REFRESH_TOKEN_KEY = 'beacon_refresh_token';

export const getAccessToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setTokens = ({ access, refresh } = {}) => {
  if (typeof window === 'undefined') return;
  if (access) localStorage.setItem(ACCESS_TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
};

export const clearTokens = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

const getBaseUrl = () => {
  const base = process.env.NEXT_PUBLIC_API_URL || '';
  return base.replace(/\/$/, '');
};

class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

// Refresh is in-flight de-duplication: if several requests 401 around the
// same time, they should all await the same refresh call rather than each
// firing their own POST /auth/refresh/.
let refreshInFlight = null;

async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const base = getBaseUrl();
      try {
        const res = await fetch(`${base}/auth/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh }),
        });
        if (!res.ok) return false;
        const data = await res.json().catch(() => null);
        if (!data || !data.access) return false;
        setTokens({ access: data.access });
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

async function performFetch(method, url, finalHeaders, finalBody) {
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: finalHeaders,
      body: finalBody,
    });
  } catch (networkErr) {
    throw new ApiError(`Network error contacting ${url}: ${networkErr.message}`, 0, null);
  }

  let parsedBody = null;
  const text = await response.text();
  if (text) {
    try {
      parsedBody = JSON.parse(text);
    } catch {
      parsedBody = text;
    }
  }

  return { response, parsedBody };
}

async function request(method, path, { body, params, headers = {}, _isRetry = false } = {}) {
  const base = getBaseUrl();
  let url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  if (params && Object.keys(params).length > 0) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
    ).toString();
    if (query) url += `?${query}`;
  }

  const finalHeaders = { ...headers };
  let finalBody = body;
  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json';
    finalBody = JSON.stringify(body);
  }

  const token = getAccessToken();
  if (token) {
    finalHeaders['Authorization'] = `Bearer ${token}`;
  }

  const { response, parsedBody } = await performFetch(method, url, finalHeaders, finalBody);

  if (!response.ok) {
    // On a 401 (expired/invalid access token), try exactly one silent
    // refresh-and-retry before giving up. Skip the auth endpoints
    // themselves to avoid refresh loops.
    const isAuthEndpoint = path.startsWith('/auth/login') || path.startsWith('/auth/refresh');
    if (response.status === 401 && !_isRetry && !isAuthEndpoint) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return request(method, path, { body, params, headers, _isRetry: true });
      }
      // Refresh failed (no/expired refresh token) — clear stale tokens so
      // the app falls back to its existing "not authenticated" UI state.
      clearTokens();
    }

    const message =
      (parsedBody && (parsedBody.detail || parsedBody.message)) ||
      `Request to ${path} failed with status ${response.status}`;
    throw new ApiError(message, response.status, parsedBody);
  }

  return parsedBody;
}

export const apiGet = (path, params) => request('GET', path, { params });
export const apiPost = (path, body) => request('POST', path, { body });
export const apiPatch = (path, body) => request('PATCH', path, { body });
export const apiDelete = (path, params) => request('DELETE', path, { params });

export { ApiError };
