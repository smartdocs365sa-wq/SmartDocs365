// ============================================
// FILE: src/services/auth.js
// ✅ FIXED: Uses 'api' instance instead of direct fetch
// ============================================

import api from './api';

export const authService = {
  // ✅ LOGIN
  async login(email_address, password) {
    try {
      // This automatically uses the Render URL defined in api.js
      const response = await api.post('/login', {
        email_address,
        password
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ✅ GET PROFILE
  async getProfile() {
    try {
      const response = await api.get('/user/get-user-details');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ✅ REGISTER
  async register(userData) {
    try {
      const response = await api.post('/user/register', userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ✅ VERIFY OTP
  async verifyOTP(email, otp) {
    try {
      const response = await api.post('/user/verify-otp', { email, otp });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ✅ SEND OTP
  async sendOTP(email) {
    try {
      const response = await api.get(`/user/otp-verification/${email}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ✅ FORGOT PASSWORD
  async forgotPassword(email) {
    try {
      const response = await api.post('/update/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ✅ RESET PASSWORD
  async resetPassword(token, newPassword) {
    try {
      const response = await api.post('/update/reset-password', {
        token,
        password: newPassword
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // ✅ LOGOUT
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
};