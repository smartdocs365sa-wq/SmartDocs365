// ============================================
// 📦 PACKAGE 2: Register.jsx with Eye Icons
// ============================================

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth';
import { validateEmail, validatePhone, validatePassword, validateName } from '../../utils/validation';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

const Register = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email_address: '',
    mobile: '',
    password: '',
    confirmPassword: ''
  });
  const [otp, setOtp] = useState('');
  const [serverOtp, setServerOtp] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (errors.submit) {
      setErrors(prev => ({ ...prev, submit: '' }));
    }
  };

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.first_name) newErrors.first_name = 'First name required';
    else if (!validateName(formData.first_name)) newErrors.first_name = 'Only letters allowed';
    if (!formData.last_name) newErrors.last_name = 'Last name required';
    else if (!validateName(formData.last_name)) newErrors.last_name = 'Only letters allowed';
    if (!formData.email_address) newErrors.email_address = 'Email required';
    else if (!validateEmail(formData.email_address)) newErrors.email_address = 'Invalid email';
    if (!formData.mobile) newErrors.mobile = 'Mobile required';
    else if (!validatePhone(formData.mobile)) newErrors.mobile = 'Invalid mobile';
    return newErrors;
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateStep1();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      console.log('Sending OTP to:', formData.email_address);
      const response = await authService.sendOTP(formData.email_address);
      console.log('OTP Response:', response);
      
      if (response.success) {
        const otpValue = response.otp || response.otpCode;
        console.log('OTP received:', otpValue);
        
        if (otpValue) {
          setServerOtp(otpValue.toString());
          setStep(2);
          setErrors({});
          alert('✅ OTP sent successfully! Check your email.');
        } else {
          setErrors({ submit: '❌ OTP was not received. Please try again.' });
        }
      } else {
        const errorMessage = response.message || 'Failed to send OTP';
        
        if (errorMessage.toLowerCase().includes('already exist')) {
          setErrors({ 
            submit: '❌ This email is already registered. Please use the login page instead.',
            email_address: 'Email already exists'
          });
        } else {
          setErrors({ submit: `❌ ${errorMessage}` });
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.response) {
        const errorMessage = error.response.data?.message || 'Registration failed';
        
        if (errorMessage.toLowerCase().includes('already exist')) {
          setErrors({ 
            submit: '❌ This email is already registered. Please login instead.',
            email_address: 'Email already exists'
          });
        } else if (error.response.status === 422) {
          setErrors({ submit: `❌ ${errorMessage}` });
        } else if (error.response.status === 500) {
          setErrors({ submit: '❌ Server error. Please try again later.' });
        } else {
          setErrors({ submit: `❌ ${errorMessage}` });
        }
      } else if (error.request) {
        setErrors({ submit: '❌ Network error. Please check your connection.' });
      } else {
        setErrors({ submit: '❌ An unexpected error occurred. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Submit = (e) => {
    e.preventDefault();
    
    if (!otp) {
      setErrors({ otp: 'Please enter the OTP' });
      return;
    }
    
    if (otp.length !== 6) {
      setErrors({ otp: 'OTP must be 6 digits' });
      return;
    }
    
    console.log('Entered OTP:', otp);
    console.log('Server OTP:', serverOtp);
    
    if (otp !== serverOtp) {
      setErrors({ otp: '❌ Invalid OTP. Please check and try again.' });
      return;
    }
    
    setErrors({});
    setStep(3);
    alert('✅ OTP verified successfully!');
  };

  const handleStep3Submit = async (e) => {
    e.preventDefault();
    
    const newErrors = {};
    
    if (!formData.password) {
      newErrors.password = 'Password required';
    } else {
      const validation = validatePassword(formData.password);
      if (!validation.isValid) {
        newErrors.password = validation.errors.join(', ');
      }
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      console.log('Registering user:', formData);
      const response = await authService.register(formData);
      console.log('Registration response:', response);
      
      if (response.success) {
        alert('✅ Registration successful! Please login with your credentials.');
        navigate('/login');
      } else {
        setErrors({ submit: `❌ ${response.message || 'Registration failed'}` });
      }
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.response?.data?.message) {
        setErrors({ submit: `❌ ${error.response.data.message}` });
      } else {
        setErrors({ submit: '❌ Registration failed. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setErrors({});
    
    try {
      const response = await authService.sendOTP(formData.email_address);
      
      if (response.success) {
        const otpValue = response.otp || response.otpCode;
        setServerOtp(otpValue.toString());
        alert('✅ New OTP sent to your email!');
        setOtp('');
      } else {
        setErrors({ otp: 'Failed to resend OTP. Please try again.' });
      }
    } catch (error) {
      setErrors({ otp: 'Failed to resend OTP. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '3rem 1rem'
    }}>
      <div style={{
        maxWidth: '448px',
        width: '100%',
        background: 'white',
        padding: '2.5rem',
        borderRadius: '1rem',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }}>
        <div className="text-center mb-8">
          <h2 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Create Account
          </h2>
          <p style={{ color: '#6b7280' }}>Join SmartDocs365</p>
        </div>

        <div className="progress-steps" style={{ marginBottom: '2rem' }}>
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className="progress-step">
                <div className={`progress-circle ${step >= s ? 'active' : ''}`}>{s}</div>
              </div>
              {s < 3 && <div className={`progress-line ${step > s ? 'active' : ''}`} />}
            </React.Fragment>
          ))}
        </div>

        {errors.submit && (
          <div className="alert alert-error" style={{ 
            marginBottom: '1.5rem',
            padding: '1rem',
            borderRadius: '0.75rem',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            animation: 'shake 0.5s'
          }}>
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px', color: '#dc2626' }} />
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', marginBottom: '0.25rem', color: '#991b1b' }}>
                Registration Error
              </strong>
              <span style={{ color: '#b91c1c' }}>{errors.submit}</span>
            </div>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleStep1Submit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                  First Name
                </label>
                <input
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className={`input-field ${errors.first_name ? 'input-error' : ''}`}
                  disabled={loading}
                />
                {errors.first_name && <p className="error-message">{errors.first_name}</p>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                  Last Name
                </label>
                <input
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className={`input-field ${errors.last_name ? 'input-error' : ''}`}
                  disabled={loading}
                />
                {errors.last_name && <p className="error-message">{errors.last_name}</p>}
              </div>
            </div>
            <div className="mb-4">
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                Email
              </label>
              <input
                name="email_address"
                type="email"
                value={formData.email_address}
                onChange={handleChange}
                className={`input-field ${errors.email_address ? 'input-error' : ''}`}
                disabled={loading}
              />
              {errors.email_address && <p className="error-message">{errors.email_address}</p>}
            </div>
            <div className="mb-6">
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                Mobile
              </label>
              <input
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                className={`input-field ${errors.mobile ? 'input-error' : ''}`}
                disabled={loading}
                maxLength={10}
              />
              {errors.mobile && <p className="error-message">{errors.mobile}</p>}
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
              {loading ? 'Sending OTP...' : 'Next'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleStep2Submit}>
            <div className="text-center mb-6">
              <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>Enter OTP sent to</p>
              <p style={{ fontWeight: 600, color: '#111827' }}>{formData.email_address}</p>
              <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                Check your email inbox (and spam folder)
              </p>
            </div>
            <div className="mb-6">
              <input
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value);
                  if (errors.otp) setErrors(prev => ({ ...prev, otp: '' }));
                }}
                className={`input-field text-center ${errors.otp ? 'input-error' : ''}`}
                placeholder="000000"
                maxLength={6}
                style={{ fontSize: '1.5rem', letterSpacing: '0.5em' }}
                disabled={loading}
              />
              {errors.otp && <p className="error-message">{errors.otp}</p>}
            </div>
            
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginBottom: '0.5rem' }}>
              Verify OTP
            </button>
            
            <button 
              type="button" 
              onClick={handleResendOTP} 
              disabled={loading}
              className="btn btn-secondary" 
              style={{ width: '100%', marginBottom: '0.5rem' }}
            >
              {loading ? 'Resending...' : 'Resend OTP'}
            </button>
            
            <button 
              type="button" 
              onClick={() => {
                setStep(1);
                setOtp('');
                setErrors({});
              }} 
              className="btn btn-secondary" 
              style={{ width: '100%' }}
            >
              Back
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleStep3Submit}>
            {/* ✅ PASSWORD WITH EYE ICON */}
            <div className="mb-4">
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  className={`input-field ${errors.password ? 'input-error' : ''}`}
                  style={{ paddingRight: '3rem' }}
                  disabled={loading}
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
                    color: '#9ca3af',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#667eea'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && <p className="error-message">{errors.password}</p>}
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                Must be at least 8 characters
              </p>
            </div>

            {/* ✅ CONFIRM PASSWORD WITH EYE ICON */}
            <div className="mb-6">
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`input-field ${errors.confirmPassword ? 'input-error' : ''}`}
                  style={{ paddingRight: '3rem' }}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                    color: '#9ca3af',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#667eea'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.confirmPassword && <p className="error-message">{errors.confirmPassword}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
              {loading ? 'Creating Account...' : 'Complete Registration'}
            </button>
            
            <button 
              type="button" 
              onClick={() => {
                setStep(2);
                setErrors({});
              }} 
              disabled={loading}
              className="btn btn-secondary mt-2" 
              style={{ width: '100%' }}
            >
              Back
            </button>
          </form>
        )}

        <p className="text-center mt-4" style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
};

export default Register;