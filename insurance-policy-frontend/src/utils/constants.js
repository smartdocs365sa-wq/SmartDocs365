// ============================================
// FILE: src/utils/constants.js
// ============================================
export const APP_NAME = 'SmartDocs365';
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3033/api';

// ✅ NEW: Base URL for accessing static files
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3033/api';

export const POLICY_FIELDS = [
  { key: 'Insurance_company_name', label: 'Insurance Company Name' },
  { key: 'Insurance_plan_name', label: 'Insurance Plan Name' },
  { key: 'Insurance_policy_type', label: 'Insurance Policy Type' },
  { key: 'Insurance_policy_number', label: 'Insurance Policy Number' },
  { key: 'Vehicle_registration_number', label: 'Vehicle Registration Number' },
  { key: 'Engine_number', label: 'Engine Number' },
  { key: 'Chassis_number', label: 'Chassis Number' },
  { key: 'Policyholder_name', label: 'Policyholder Name' },
  { key: 'Policyholder_address', label: 'Policyholder Address' },
  { key: 'Policyholder_phone_number', label: 'Policyholder Phone Number' },
  { key: 'Policyholder_emailid', label: 'Policyholder Email' },
  { key: 'Intermediary_code', label: 'Intermediary Code' },
  { key: 'Intermediary_name', label: 'Intermediary Name' },
  { key: 'Intermediary_phone_number', label: 'Intermediary Phone Number' },
  { key: 'Intermediary_emailid', label: 'Intermediary Email' },
  { key: 'Total_premium_paid', label: 'Total Premium Paid' },
  { key: 'Own_damage_premium', label: 'Own Damage Premium' },
  { key: 'Base_premium', label: 'Base Premium' },
  { key: 'Policy_start_date', label: 'Policy Start Date' },
  { key: 'Policy_expiry_date', label: 'Policy Expiry Date' },
  { key: 'Policy_issuance_date', label: 'Policy Issuance Date' }
];