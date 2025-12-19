import axios from 'axios';

// Resolve API base URL dynamically
const normalizeBaseUrl = (url) => (url?.endsWith('/') ? url.slice(0, -1) : url);

const getEnvBaseUrl = () => normalizeBaseUrl(process.env.REACT_APP_API_BASE_URL);

const getWindowBaseUrl = () => {
  if (typeof window === 'undefined') return null;
  const { protocol, hostname } = window.location;
  const port = process.env.REACT_APP_API_PORT || '8080';
  const safeProtocol = protocol === 'https:' ? 'https:' : 'http:';
  return `${safeProtocol}//${hostname}:${port}`;
};

export const API_BASE_URL =
  getEnvBaseUrl() ||
  normalizeBaseUrl(getWindowBaseUrl()) ||
  'http://localhost:8080';

export const buildApiUrl = (path = '') => {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${suffix}`;
};

export const buildWebSocketUrl = (path = '') => {
  if (typeof window === 'undefined') {
    return 'ws://localhost:8080';
  }
  const { hostname } = window.location;
  const port = process.env.REACT_APP_API_PORT || '8080';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${protocol}//${hostname}:${port}${suffix}`;
};

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL.trim(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add token
axiosInstance.interceptors.request.use(
  (config) => {
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

// Response interceptor: Handle 401
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