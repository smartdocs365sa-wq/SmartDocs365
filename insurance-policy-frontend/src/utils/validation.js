// ============================================
// FILE: src/utils/validation.js (FIXED)
// ============================================
export const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };
  
  export const validatePhone = (phone) => {
    const regex = /^[6-9]\d{9}$/;
    return regex.test(phone);
  };
  
  export const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    // FIXED: Removed unnecessary escape for [
    if (!/[!@#$%^&*()_+{}[\]:;<>,.?~\\/-]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  };
  
  export const validateName = (name) => {
    const regex = /^[a-zA-Z\s]+$/;
    return regex.test(name) && name.trim().length > 0;
  };