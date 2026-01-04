// ============================================
// FILE: src/services/policy.js
// FIXED: Added createPolicy for Excel Import Save
// ============================================
import api from './api';

export const policyService = {
  // 1. Upload PDF Files
  async uploadPDF(files) {
    const formData = new FormData();
    if (Array.isArray(files)) {
      files.forEach(file => formData.append('files', file));
    } else {
      formData.append('files', files);
    }
    
    const response = await api.post('/upload-pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // 2. Get All Policies
  async getPolicies() {
    const response = await api.get('/pdf/list');
    return response.data;
  },

  // 3. Update Policy Details
  async updatePolicy(data) {
    const response = await api.post('/pdf/update', data);
    return response.data;
  },

  // 4. Delete Policy
  async deletePolicy(documentId) {
    const response = await api.delete(`/pdf/delete-document-id/${documentId}`);
    return response.data;
  },

  // ✅ 5. Create Policy (ADDED)
  // Used when saving imported Excel data after review
  async createPolicy(data) {
    // We send JSON data to the import route
    const response = await api.post('/import-excel-data', data);
    return response.data;
  }
};