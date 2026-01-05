// ============================================
// FILE: src/components/auth/Register.jsx
// ✅ FIXED: Added Simple Footer (Copyright only)
// ============================================

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth';
import { validateEmail, validatePhone, validatePassword, validateName } from '../../utils/validation';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

const Register = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email_address: '', mobile: '', password: '', confirmPassword: ''
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
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (errors.submit) setErrors(prev => ({ ...prev, submit: '' }));
  };

  // ... (Keep existing validation & submit logic exactly as it was) ...
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
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
    setLoading(true); setErrors({});
    try {
      const response = await authService.sendOTP(formData.email_address);
      if (response.success) {
        const otpValue = response.otp || response.otpCode;
        if (otpValue) { setServerOtp(otpValue.toString()); setStep(2); alert('✅ OTP sent successfully!'); }
        else { setErrors({ submit: '❌ OTP was not received.' }); }
      } else {
        const msg = response.message || 'Failed to send OTP';
        if (msg.includes('already exist')) setErrors({ submit: 'Email already registered.', email_address: 'Email exists' });
        else setErrors({ submit: msg });
      }
    } catch (error) {
      setErrors({ submit: error.response?.data?.message || 'Registration failed' });
    } finally { setLoading(false); }
  };

  const handleStep2Submit = (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6 || otp !== serverOtp) { setErrors({ otp: '❌ Invalid OTP.' }); return; }
    setErrors({}); setStep(3); alert('✅ OTP verified successfully!');
  };

  const handleStep3Submit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) { setErrors({ confirmPassword: 'Passwords do not match' }); return; }
    setLoading(true); setErrors({});
    try {
      const response = await authService.register(formData);
      if (response.success) { alert('✅ Registration successful!'); navigate('/login'); }
      else { setErrors({ submit: response.message || 'Registration failed' }); }
    } catch (error) {
      setErrors({ submit: error.response?.data?.message || 'Registration failed' });
    } finally { setLoading(false); }
  };

  const handleResendOTP = async () => {
    setLoading(true); setErrors({});
    try {
      const response = await authService.sendOTP(formData.email_address);
      if (response.success) { setServerOtp((response.otp || response.otpCode).toString()); alert('✅ New OTP sent!'); setOtp(''); }
    } catch (e) { setErrors({ otp: 'Failed to resend OTP.' }); } finally { setLoading(false); }
  };

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
        maxWidth: '448px', width: '100%', background: 'white', padding: '2.5rem',
        borderRadius: '1rem', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)', zIndex: 10
      }}>
        <div className="text-center mb-8">
          <h2 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '0.5rem' }}>Create Account</h2>
          <p style={{ color: '#6b7280' }}>Join SmartDocs365</p>
        </div>

        {/* Progress Steps */}
        <div className="progress-steps" style={{ marginBottom: '2rem' }}>
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className="progress-step"><div className={`progress-circle ${step >= s ? 'active' : ''}`}>{s}</div></div>
              {s < 3 && <div className={`progress-line ${step > s ? 'active' : ''}`} />}
            </React.Fragment>
          ))}
        </div>

        {errors.submit && (
          <div className="alert alert-error" style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '0.75rem', backgroundColor: '#fee2e2', border: '1px solid #fecaca', display: 'flex', gap: '0.75rem' }}>
            <AlertCircle size={20} style={{ color: '#dc2626' }} />
            <div><strong style={{ display: 'block', color: '#991b1b' }}>Error</strong><span style={{ color: '#b91c1c' }}>{errors.submit}</span></div>
          </div>
        )}

        {/* Step 1 Form */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div><label>First Name</label><input name="first_name" value={formData.first_name} onChange={handleChange} className={`input-field ${errors.first_name ? 'input-error' : ''}`} disabled={loading} /></div>
              <div><label>Last Name</label><input name="last_name" value={formData.last_name} onChange={handleChange} className={`input-field ${errors.last_name ? 'input-error' : ''}`} disabled={loading} /></div>
            </div>
            <div className="mb-4"><label>Email</label><input name="email_address" type="email" value={formData.email_address} onChange={handleChange} className={`input-field ${errors.email_address ? 'input-error' : ''}`} disabled={loading} /></div>
            <div className="mb-6"><label>Mobile</label><input name="mobile" value={formData.mobile} onChange={handleChange} className={`input-field ${errors.mobile ? 'input-error' : ''}`} disabled={loading} maxLength={10} /></div>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>{loading ? 'Sending OTP...' : 'Next'}</button>
          </form>
        )}

        {/* Step 2 Form */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit}>
            <div className="text-center mb-6"><p>Enter OTP sent to <strong>{formData.email_address}</strong></p></div>
            <div className="mb-6"><input value={otp} onChange={(e) => setOtp(e.target.value)} className="input-field text-center" placeholder="000000" maxLength={6} style={{ fontSize: '1.5rem', letterSpacing: '0.5em' }} /></div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginBottom: '0.5rem' }}>Verify OTP</button>
            <button type="button" onClick={handleResendOTP} className="btn btn-secondary" style={{ width: '100%', marginBottom: '0.5rem' }}>Resend OTP</button>
            <button type="button" onClick={() => setStep(1)} className="btn btn-secondary" style={{ width: '100%' }}>Back</button>
          </form>
        )}

        {/* Step 3 Form */}
        {step === 3 && (
          <form onSubmit={handleStep3Submit}>
            <div className="mb-4">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleChange} className="input-field" style={{ paddingRight: '3rem' }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
              </div>
            </div>
            <div className="mb-6">
              <label>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input name="confirmPassword" type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={handleChange} className="input-field" style={{ paddingRight: '3rem' }} />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>{showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>Complete Registration</button>
          </form>
        )}

        <p className="text-center mt-4" style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          Already have an account? <Link to="/login" style={{ fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>

      {/* ✅ SIMPLE FOOTER */}
      <div style={{ position: 'absolute', bottom: '1rem', left: 0, right: 0, textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.875rem' }}>
        &copy; {new Date().getFullYear()} SmartDocs365. All rights reserved.
      </div>
      
      <style>{`@keyframes shake { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); } 20%, 40%, 60%, 80% { transform: translateX(5px); } }`}</style>
    </div>
  );
};

export default Register;