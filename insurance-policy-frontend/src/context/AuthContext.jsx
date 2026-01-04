// ============================================
// FILE: AuthContext.jsx - DEFINITIVE FIX
// ============================================

import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await api.get('/user/get-user-details');
      
      if (response.data.success) {
        const userData = response.data.data;
        const subscriptionInfo = response.data.other;
        
        const enrichedUser = {
          ...userData,
          totalPdfLimit: subscriptionInfo?.totalPdfLimit || 0,
          usedLimit: subscriptionInfo?.usedLimit || 0,
          leftLimit: subscriptionInfo?.leftLimit || 0,
          planName: subscriptionInfo?.planName || 'Free Trial',
          planPrice: subscriptionInfo?.planPrice || 0,
          rechargeExpiredDate: subscriptionInfo?.rechargeExpiredDate || null,
          role: userData.role || 'user'
        };

        setUser(enrichedUser);
        localStorage.setItem('user', JSON.stringify(enrichedUser));
        console.log('✅ User details loaded:', enrichedUser);
      }
    } catch (error) {
      console.error('Failed to fetch user details:', error);
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, []);

  const login = async (email, password) => {
    try {
      console.log('🔐 AuthContext: Attempting login for:', email);
      
      const response = await authService.login(email, password);
      console.log('📡 AuthContext: Login API response:', response);
      
      if (response.success) {
        // Store token
        localStorage.setItem('token', response.token);
        console.log('✅ AuthContext: Token stored');
        
        // Fetch user details
        await fetchUserDetails();
        
        console.log('✅ AuthContext: Login successful');
        
        // ✅ Return success without navigation
        return { success: true };
        
      } else {
        // ✅ Return error message from backend
        console.log('❌ AuthContext: Login failed -', response.message);
        return { 
          success: false, 
          message: response.message || 'Invalid email or password!'
        };
      }
      
    } catch (error) {
      console.error('❌ AuthContext: Login error:', error);
      
      // ✅ Detailed error handling
      let errorMessage = 'Invalid email or password!';
      
      if (error.response) {
        // Server responded with error
        if (error.response.status === 401) {
          errorMessage = 'Invalid email or password!';
        } else if (error.response.status === 403) {
          errorMessage = error.response.data?.message || 'Account is blocked';
        } else if (error.response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = error.response.data?.message || errorMessage;
        }
      } else if (error.request) {
        // Request made but no response
        errorMessage = 'Cannot connect to server. Please check your connection.';
      } else {
        // Something else happened
        errorMessage = 'Login failed. Please try again.';
      }
      
      console.log('❌ AuthContext: Error message:', errorMessage);
      
      return { 
        success: false, 
        message: errorMessage
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      return response;
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    console.log('🚪 Logging out...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  const refreshUser = async () => {
    console.log('🔄 Refreshing user data...');
    await fetchUserDetails();
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;