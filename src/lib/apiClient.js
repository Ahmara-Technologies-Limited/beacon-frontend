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

async function request(method, path, { body, params, headers = {} } = {}) {
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

  // TODO: implement token refresh (POST /auth/refresh/ or SimpleJWT's token/refresh/
  // endpoint) when the access token has expired. For now, a 401 just propagates
  // as an ApiError and the caller (or UI) is responsible for prompting re-login.

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

  if (!response.ok) {
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
