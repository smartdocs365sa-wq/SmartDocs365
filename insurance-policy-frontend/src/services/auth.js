// ============================================
// FILE: insurance-policy-frontend/src/services/auth.js
// COMPLETE FIXED VERSION - Added getProfile
// ============================================

import api from './api';

export const authService = {
  // ✅ LOGIN
  async login(email_address, password) {
    try {
      const response = await api.post('/login', {
        email_address,
        password
      });

      console.log('Login API response:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('Login API error:', error);
      throw error;
    }
  },

  // ✅ GET PROFILE - NEW (For Profile Page)
  async getProfile() {
    try {
      const response = await api.get('/user/get-user-details');
      return response.data;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  },

  // ✅ REGISTER
  async register(userData) {
    try {
      const response = await api.post('/user/register', userData);
      return response.data;
    } catch (error) {
      console.error('Register API error:', error);
      throw error;
    }
  },

  // ✅ VERIFY OTP
  async verifyOTP(email, otp) {
    try {
      const response = await api.post('/user/verify-otp', {
        email,
        otp
      });
      return response.data;
    } catch (error) {
      console.error('OTP verification error:', error);
      throw error;
    }
  },

  // ✅ SEND OTP
  async sendOTP(email) {
    try {
      const response = await api.get(`/user/otp-verification/${email}`);
      return response.data;
    } catch (error) {
      console.error('Send OTP error:', error);
      throw error;
    }
  },

  // ✅ FORGOT PASSWORD
  async forgotPassword(email) {
    try {
      const response = await api.post('/update/forgot-password', { email });
      return response.data;
    } catch (error) {
      console.error('Forgot password error:', error);
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
      console.error('Reset password error:', error);
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