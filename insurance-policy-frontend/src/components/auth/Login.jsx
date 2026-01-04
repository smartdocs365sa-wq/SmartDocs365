// ============================================
// FILE: Login.jsx - FINAL FIX (Works with fixed api.js)
// ============================================

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, LogIn, Home, Eye, EyeOff, AlertCircle } from 'lucide-react';
import Loader from '../common/Loader';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email_address: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleLoginClick = async () => {
    if (loading) return;
    
    if (!formData.email_address) {
      setError('Email is required');
      return;
    }
    
    if (!formData.password) {
      setError('Password is required');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      console.log('🔐 [Login] Attempting login for:', formData.email_address);
      
      const response = await login(formData.email_address, formData.password);
      
      console.log('📡 [Login] Response:', response);

      if (response && response.success) {
        console.log('✅ [Login] Success! Navigating to dashboard...');
        setTimeout(() => {
          navigate('/dashboard');
        }, 100);
      } else {
        const errorMsg = response?.message || 'Invalid email or password!';
        console.log('❌ [Login] Failed:', errorMsg);
        setError(errorMsg);
        setLoading(false);
      }
    } catch (err) {
      console.error('❌ [Login] Error caught:', err);
      
      let errorMsg = 'Invalid email or password!';
      
      if (err.response) {
        if (err.response.status === 401) {
          errorMsg = 'Invalid email or password!';
        } else if (err.response.status === 403) {
          errorMsg = err.response.data?.message || 'Account is blocked';
        } else {
          errorMsg = err.response.data?.message || errorMsg;
        }
      } else if (err.request) {
        errorMsg = 'Cannot connect to server. Please check your connection.';
      }
      
      console.log('❌ [Login] Error message:', errorMsg);
      setError(errorMsg);
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      e.preventDefault();
      handleLoginClick();
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem',
      position: 'relative'
    }}>
      <Link to="/" style={{
        position: 'absolute',
        top: '2rem',
        left: '2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        color: 'white',
        textDecoration: 'none',
        fontSize: '1rem',
        fontWeight: 600,
        padding: '0.75rem 1.5rem',
        background: 'rgba(255, 255, 255, 0.2)',
        borderRadius: '0.5rem',
        backdropFilter: 'blur(10px)',
        transition: 'all 0.3s ease',
        border: '2px solid rgba(255, 255, 255, 0.3)'
      }}>
        <Home size={20} />
        Home
      </Link>

      <div style={{
        background: 'white',
        padding: '3rem',
        borderRadius: '1rem',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        maxWidth: '450px',
        width: '100%'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Welcome Back
          </h1>
          <p style={{ color: '#6b7280' }}>
            Sign in to manage your insurance policies
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#dc2626',
            padding: '1rem 1.25rem',
            borderRadius: '0.75rem',
            marginBottom: '1.5rem',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            border: '2px solid #fca5a5',
            animation: 'shake 0.5s ease-in-out',
            fontWeight: 600
          }}>
            <AlertCircle size={22} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <div onKeyPress={handleKeyPress}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#374151',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              EMAIL ADDRESS
            </label>
            <div style={{ position: 'relative' }}>
              <Mail style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af',
                zIndex: 1
              }} size={20} />
              <input
                type="email"
                name="email_address"
                value={formData.email_address}
                onChange={handleChange}
                placeholder="Enter your email"
                style={{ 
                  paddingLeft: '2.5rem',
                  borderColor: error ? '#fca5a5' : '#d1d5db',
                  borderWidth: '2px',
                  width: '100%',
                  padding: '0.875rem 1rem 0.875rem 2.5rem',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  transition: 'all 0.2s',
                  border: `2px solid ${error ? '#fca5a5' : '#d1d5db'}`
                }}
                disabled={loading}
                autoComplete="email"
              />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#374151',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              PASSWORD
            </label>
            <div style={{ position: 'relative' }}>
              <Lock style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af',
                zIndex: 1
              }} size={20} />
              
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                style={{ 
                  paddingLeft: '2.5rem',
                  paddingRight: '3rem',
                  borderColor: error ? '#fca5a5' : '#d1d5db',
                  borderWidth: '2px',
                  width: '100%',
                  padding: '0.875rem 3rem 0.875rem 2.5rem',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  transition: 'all 0.2s',
                  border: `2px solid ${error ? '#fca5a5' : '#d1d5db'}`
                }}
                disabled={loading}
                autoComplete="current-password"
              />
              
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9ca3af',
                  transition: 'color 0.2s',
                  zIndex: 1
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#667eea'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'right', marginBottom: '1.5rem' }}>
            <Link to="/forgot-password" style={{
              color: '#667eea',
              fontSize: '0.875rem',
              textDecoration: 'none',
              fontWeight: 500
            }}>
              Forgot password?
            </Link>
          </div>

          <button
            type="button"
            onClick={handleLoginClick}
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '0.5rem',
              padding: '1rem',
              fontSize: '1rem',
              fontWeight: 600,
              background: loading ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '0.625rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
            disabled={loading}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(102, 126, 234, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {loading ? (
              <>
                <Loader size="sm" />
                Signing in...
              </>
            ) : (
              <>
                <LogIn size={20} />
                Sign In
              </>
            )}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{
              color: '#667eea',
              fontWeight: 600,
              textDecoration: 'none'
            }}>
              Register now
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
          20%, 40%, 60%, 80% { transform: translateX(8px); }
        }
        
        input:focus {
          outline: none;
          border-color: #667eea !important;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
        }
      `}</style>
    </div>
  );
};

export default Login;