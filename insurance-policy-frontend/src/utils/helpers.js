// ============================================
// FILE: src/utils/helpers.js
// ============================================

// ✅ FIXED: Use "Rs." for PDF compatibility
export const formatCurrency = (value) => {
  if (!value || value === 'NA' || value === 'N/A' || value === '') return 'Rs. 0';
  
  // Remove existing commas and any currency symbols
  const cleanValue = String(value).replace(/[₹,\sRs.]/g, '');
  const numValue = parseFloat(cleanValue);
  
  if (isNaN(numValue)) return 'Rs. 0';
  
  // Use "Rs." instead of ₹ for PDF compatibility
  return 'Rs. ' + numValue.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

export const formatDate = (dateStr) => {
  if (!dateStr || dateStr === 'NA' || dateStr === 'N/A' || dateStr === '') return 'N/A';
  
  // Handle DD/MM/YYYY format
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return dateStr; // Already in correct format
  }
  
  // Handle YYYY-MM-DD format
  const parts2 = dateStr.split('-');
  if (parts2.length === 3 && parts2[0].length === 4) {
    return `${parts2[2]}/${parts2[1]}/${parts2[0]}`;
  }
  
  return dateStr;
};

export const isExpiringSoon = (dateStr) => {
  if (!dateStr || dateStr === 'NA' || dateStr === 'N/A') return false;
  
  try {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return false;
    
    const expiryDate = new Date(parts[2], parts[1] - 1, parts[0]);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  } catch {
    return false;
  }
};

export const isExpired = (dateStr) => {
  if (!dateStr || dateStr === 'NA' || dateStr === 'N/A') return false;
  
  try {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return false;
    
    const expiryDate = new Date(parts[2], parts[1] - 1, parts[0]);
    const today = new Date();
    
    return expiryDate < today;
  } catch {
    return false;
  }
};