import axios from 'axios';
import { discoverBackend, getLastKnownBackend } from '../services/discoveryService';

let discoveredConfig = null;

const normalizeBaseUrl = (url) => (url?.endsWith('/') ? url.slice(0, -1) : url);

const getEnvBaseUrl = () => normalizeBaseUrl(process.env.REACT_APP_API_BASE_URL);

const getDiscoveredBaseUrl = () => {
  if (!discoveredConfig || !discoveredConfig.services) return null;
  return normalizeBaseUrl(discoveredConfig.services.api);
};

const getWindowBaseUrl = () => {
  if (typeof window === 'undefined') return null;
  const { protocol, hostname } = window.location;
  const port = process.env.REACT_APP_API_PORT || '8080';
  const safeProtocol = protocol === 'https:' ? 'https:' : 'http:';
  return `${safeProtocol}//${hostname}:${port}`;
};

const getApiBaseUrl = () => {
  return getEnvBaseUrl() ||
    getDiscoveredBaseUrl() ||
    normalizeBaseUrl(getWindowBaseUrl()) ||
    'http://localhost:8080';
};

export const API_BASE_URL = getApiBaseUrl();

export const buildApiUrl = (path = '') => {
  const baseUrl = getApiBaseUrl();
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${suffix}`;
};

export const buildWebSocketUrl = (path = '') => {
  if (typeof window === 'undefined') {
    return 'ws://localhost:9093';
  }

  if (discoveredConfig && discoveredConfig.services && discoveredConfig.services.websocket) {
    const suffix = path.startsWith('/') ? path : `/${path}`;
    return `${discoveredConfig.services.websocket}${suffix}`;
  }

  const { hostname } = window.location;
  const port = process.env.REACT_APP_WEBSOCKET_PORT || '9093';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${protocol}//${hostname}:${port}${suffix}`;
};

export async function initializeBackendDiscovery() {
  const cached = getLastKnownBackend();
  if (cached) {
    discoveredConfig = cached;
    return;
  }

  const discovered = await discoverBackend();
  if (discovered) {
    discoveredConfig = discovered;
  }
}

const axiosInstance = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    config.baseURL = getApiBaseUrl().trim();
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;

    // Only redirect if it's 401 AND NOT a login attempt
    if (error.response?.status === 401 && !originalRequest.url.includes('/auth/login')) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API functions
export const authAPI = {
  login: (username, password) =>
    axiosInstance.post('/auth/login', { username, password }),

  register: (username, email, password) =>
    axiosInstance.post('/auth/register', { username, email, password }),

  logout: () =>
    axiosInstance.post('/auth/logout', {}),
};

// Library API functions
export const libraryAPI = {
  getLibrary: () =>
    axiosInstance.get('/users/library'),

  addToLibrary: (mangaId) =>
    axiosInstance.post('/users/library', { manga_id: mangaId }),

  removeFromLibrary: (mangaId) =>
    axiosInstance.delete(`/users/library/${mangaId}`),

  updateProgress: (mangaId, currentChapter, userRating = null) => {
    const payload = {
      manga_id: String(mangaId),
      current_chapter: Math.ceil(currentChapter)
    };
    if (userRating !== null) {
      payload.user_rating = userRating;
    }
    return axiosInstance.put('/users/progress', payload);
  },
};

export default axiosInstance;