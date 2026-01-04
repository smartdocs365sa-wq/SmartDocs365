// ============================================
// FILE: src/services/api.js (FIXED - No reload on login errors)
// ============================================
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3033/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

// Request interceptor - Add token to headers
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

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // ✅ FIXED: Only redirect to login if:
    // 1. We get a 401 error
    // 2. The user was actually logged in (has a token)
    // 3. The request is NOT to the login endpoint
    
    if (error.response?.status === 401) {
      const token = localStorage.getItem('token');
      const isLoginRequest = error.config?.url?.includes('/login');
      
      // ✅ Only redirect if user was logged in and this is NOT a login attempt
      if (token && !isLoginRequest) {
        console.log('🚪 Token expired, redirecting to login...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else {
        // ✅ This is a login failure - don't redirect, let the component handle it
        console.log('❌ Login failed (401) - letting component handle error');
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;