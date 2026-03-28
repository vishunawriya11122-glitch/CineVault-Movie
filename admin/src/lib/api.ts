import axios from 'axios';
import { useAuthStore } from '../store/auth';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Track whether a refresh is already in-flight to avoid multiple concurrent refresh calls
let isRefreshing = false;
let pendingQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

const processQueue = (err: unknown, token: string | null) => {
  pendingQueue.forEach((p) => (err ? p.reject(err) : p.resolve(token!)));
  pendingQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Only attempt refresh on 401, once per request
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Queue the request until the refresh completes
        return new Promise<string>((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;
      const { refreshToken } = useAuthStore.getState();

      try {
        const { data } = await axios.post('/api/v1/auth/refresh', { refreshToken });
        const newToken: string = data.accessToken;
        useAuthStore.getState().setToken(newToken);
        if (data.refreshToken) {
          useAuthStore.getState().login(newToken, data.refreshToken, useAuthStore.getState().user);
        }
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

export default api;
