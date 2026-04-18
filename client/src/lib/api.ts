import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { useSystemStore } from '../store/systemStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 1. Unified Connectivity Guard (Network Error Detection)
    if (!error.response) {
      console.error('[CORE] Critical Connectivity Loss. Activating Recovery Interface.');
      useSystemStore.getState().setSystemOffline(true);
    }

    // 2. Authentication Failure (Unauthorized)
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      // replace (not href) so the stale /dashboard/* entry is evicted from
      // history — otherwise back-press restores a bfcache snapshot of the
      // previous panel without any auth check.
      window.location.replace('/login');
    }
    
    return Promise.reject(error);
  }
);
