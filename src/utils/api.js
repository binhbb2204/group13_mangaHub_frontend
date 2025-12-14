import axios from 'axios';

// API base URL
// const API_BASE_URL = 'http://localhost:8081';
const API_BASE_URL = 'http://localhost:8080';

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include token
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

// Add response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
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

  addToLibrary: (mangaId, status = 'reading') =>
    axiosInstance.post('/users/library', { manga_id: mangaId, status }),

  removeFromLibrary: (mangaId) =>
    axiosInstance.delete(`/users/library/${mangaId}`),

  updateProgress: (mangaId, currentChapter, userRating = null) => {
    const payload = { manga_id: mangaId, current_chapter: currentChapter };
    if (userRating !== null) {
      payload.user_rating = userRating;
    }
    return axiosInstance.put('/users/progress', payload);
  },
};

export default axiosInstance;
