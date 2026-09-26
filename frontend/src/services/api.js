import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cba_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('cba_token');
      localStorage.removeItem('cba_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export function unwrapError(error) {
  const data = error?.response?.data;
  if (data?.message) {
    const details = Array.isArray(data.details) ? `: ${data.details.join(', ')}` : '';
    return `${data.message}${details}`;
  }
  return error.message || 'An unexpected error occurred';
}

export default api;
