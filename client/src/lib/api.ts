import axios, { AxiosError } from 'axios';

const baseURL = (import.meta.env.VITE_API_URL || 'https://arbudamedical-backend-a5fuue8iy-arbuda.vercel.app') + '/api';

export const api = axios.create({ baseURL });

const ACCESS_KEY = 'pharmacy_access';
const REFRESH_KEY = 'pharmacy_refresh';

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

api.interceptors.request.use((config) => {
  const token = tokenStore.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Refresh the access token once on a 401, then retry the original request.
let refreshing: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const refresh = tokenStore.refresh;
  if (!refresh) return null;
  try {
    const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken: refresh });
    tokenStore.set(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    tokenStore.clear();
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry && tokenStore.refresh) {
      original._retry = true;
      if (!refreshing) refreshing = doRefresh().finally(() => (refreshing = null));
      const newToken = await refreshing;
      if (newToken) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
      // Refresh failed → force re-login.
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Fetch an authenticated binary endpoint (PDF/xlsx) and return a blob object URL.
// Browser tab navigations can't send the JWT, so downloads must go through axios.
export async function fetchBlobUrl(path: string): Promise<string> {
  const res = await api.get(path, { responseType: 'blob' });
  return URL.createObjectURL(res.data as Blob);
}

// Opens an authenticated PDF in a new tab. Pre-open the tab synchronously inside
// the click handler (avoids popup blockers), then point it at the blob.
export async function openAuthedPdf(path: string, preOpened?: Window | null): Promise<void> {
  const win = preOpened ?? window.open('', '_blank');
  try {
    const url = await fetchBlobUrl(path);
    if (win && !win.closed) win.location.href = url;
    else window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch {
    win?.close();
    throw new Error('Could not load the PDF');
  }
}

export function apiError(err: unknown): string {
  const e = err as AxiosError<{ error?: { message?: string } }>;
  return e.response?.data?.error?.message || e.message || 'Something went wrong';
}
