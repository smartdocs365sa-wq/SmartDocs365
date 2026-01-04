// ============================================
// FILE: src/services/api.js
// ✅ FIXED: Uses Vercel Environment Variable
// ============================================
import axios from 'axios';

// 1. Use the environment variable from Vercel. 
// 2. Fallback to localhost ONLY if the variable is missing (dev mode).
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3033/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

// Request interceptor: Attach Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle Errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to login if 401 (Unauthorized) and NOT currently trying to login
    if (error.response?.status === 401) {
      const token = localStorage.getItem('token');
      const isLoginRequest = error.config?.url?.includes('/login');
      
      if (token && !isLoginRequest) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;