// ============================================
// FILE: src/components/auth/ForgotPassword.jsx
// ✅ FIXED: Replaced localhost fetch with 'api' service (Fixes 404)
// ✅ FIXED: Added Simple Footer (Copyright only)
// ============================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { validateEmail } from '../../utils/validation';
import { Mail, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../services/api'; // ✅ Import API service

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!email) {
      setError('Email is required');
      return;
    }
    
    if (!validateEmail(email)) {
      setError('Invalid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // ✅ USE API INSTANCE (Fixes 404 / localhost issue)
      const response = await api.get(`/update/forgot-password/${email}`);
      const data = response.data;

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.message || 'Failed to send reset link');
      }
    } catch (err) {
      console.error("Forgot Password Error:", err);
      setError(err.response?.data?.message || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '3rem 1rem',
        position: 'relative'
      }}>
        <div style={{
          maxWidth: '448px',
          width: '100%',
          background: 'white',
          padding: '2.5rem',
          borderRadius: '1rem',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          textAlign: 'center',
          zIndex: 10
        }}>
          <div style={{ 
            width: '64px', height: '64px', background: '#dcfce7', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem'
          }}>
            <CheckCircle size={32} style={{ color: '#16a34a' }} />
          </div>
          
          <h2 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.5rem' }}>Check Your Email</h2>
          <p style={{ color: '#6b7280', marginBottom: '2rem' }}>We've sent a password reset link to <strong>{email}</strong></p>
          
          <div style={{ background: '#f0f9ff', border: '1px solid #bfdbfe', borderRadius: '0.5rem', padding: '1rem', marginBottom: '2rem', textAlign: 'left' }}>
            <p style={{ fontSize: '0.875rem', color: '#1e40af', margin: 0 }}>
              <strong>Note:</strong> The reset link will expire in 5 minutes. If you don't see the email, check your spam folder.
            </p>
          </div>

          <Link to="/login" className="btn btn-primary" style={{ width: '100%', textDecoration: 'none', display: 'block', textAlign: 'center' }}>
            Back to Login
          </Link>
        </div>

        {/* ✅ SIMPLE FOOTER */}
        <div style={{ position: 'absolute', bottom: '1rem', left: 0, right: 0, textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.875rem' }}>
          &copy; {new Date().getFullYear()} SmartDocs365. All rights reserved.
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '3rem 1rem',
      position: 'relative'
    }}>
      <div style={{
        maxWidth: '448px',
        width: '100%',
        background: 'white',
        padding: '2.5rem',
        borderRadius: '1rem',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        zIndex: 10
      }}>
        <div className="text-center mb-8">
          <h2 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.5rem' }}>Forgot Password?</h2>
          <p style={{ color: '#6b7280' }}>Enter your email to receive a password reset link</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ background: '#fee2e2', color: '#dc2626', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', border: '1px solid #fecaca', animation: 'shake 0.5s' }}>
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <div className="mb-6">
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} size={20} />
              <input type="email" value={email} onChange={handleChange} className={`input-field ${error ? 'input-error' : ''}`} placeholder="Enter your email" style={{ paddingLeft: '2.5rem' }} disabled={loading} />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginBottom: '1rem' }}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <Link to="/login" className="btn btn-secondary" style={{ width: '100%', textDecoration: 'none', display: 'block', textAlign: 'center' }}>
            Back to Login
          </Link>
        </form>
      </div>

      {/* ✅ SIMPLE FOOTER */}
      <div style={{ position: 'absolute', bottom: '1rem', left: 0, right: 0, textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.875rem' }}>
        &copy; {new Date().getFullYear()} SmartDocs365. All rights reserved.
      </div>

      <style>{`@keyframes shake { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); } 20%, 40%, 60%, 80% { transform: translateX(5px); } }`}</style>
    </div>
  );
};

export default ForgotPassword;