// ============================================
// FILE: insurance-policy-frontend/src/pages/Policies.jsx
// UPDATED: Added Date Validation, Exact Currency, and Double-Click Fix
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { policyService } from '../services/policy';
import api from '../services/api'; 
import { useAuth } from '../context/AuthContext';
import { 
  Plus, Search, FileText, Upload, X, Edit, Trash2, Eye, 
  ChevronDown, ChevronUp, RefreshCw, Save, Download, 
  FileSpreadsheet, Share2, Mail, Phone, Calendar, Zap 
} from 'lucide-react';
import Loader from '../components/common/Loader';
import { formatDate, formatCurrency, isExpiringSoon, isExpired } from '../utils/helpers';
import { POLICY_FIELDS, API_BASE_URL } from '../utils/constants';
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";

const Policies = () => {
  const { refreshUser } = useAuth(); 
   
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
   
  // --- Plan & Usage States (Real-time Limit Enforcement) ---
  const [usageStats, setUsageStats] = useState({
    pdfUsed: 0,
    limit: 0,
    isLimitReached: false,
    planName: ''
  });

  // --- Search & Filter States ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // --- Bulk Selection States ---
  const [selectedPolicyIds, setSelectedPolicyIds] = useState([]);

  // --- Bulk Delete State ---
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // --- Upload & Import States ---
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [excelImporting, setExcelImporting] = useState(false);
  const fileInputRef = useRef(null); 
  const savedCountRef = useRef(0);
  
   
  // --- Extraction States ---
  const [showExtractedDataModal, setShowExtractedDataModal] = useState(false);
  const [extractedPolicies, setExtractedPolicies] = useState([]);
  const [currentPolicyIndex, setCurrentPolicyIndex] = useState(0);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
   
  // --- UI States ---
  const [expandedRow, setExpandedRow] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
   
  // --- Edit Modal States ---
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);

  // --- Share Modal States ---
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharingPolicy, setSharingPolicy] = useState(null);
   
  // --- Limit Modal States ---
  const [showUploadLimitModal, setShowUploadLimitModal] = useState(false);
  const [uploadLimitInfo, setUploadLimitInfo] = useState({ message: '', currentCount: 0, limitCount: 0 });

  // --- Missing File Check State ---
  const [showMissingFileModal, setShowMissingFileModal] = useState(false);
  const [checkingFile, setCheckingFile] = useState(false);

  // ============================================
  // ✅ NEW HELPER FUNCTIONS (Date & Currency)
  // ============================================

  // 1. Strict Date Validator (DD/MM/YYYY)
  const isValidDateFormat = (dateString) => {
    if (!dateString || dateString === 'NA' || dateString === '') return true; 
    const regex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
    
    if (!regex.test(dateString)) return false;

    const [, day, month, year] = dateString.match(regex);
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    if (m < 1 || m > 12) return false;
    if (d < 1 || d > 31) return false;
    if (y < 1900 || y > 2100) return false;

    const daysInMonth = new Date(y, m, 0).getDate();
    return d <= daysInMonth;
  };

  // 2. Exact Currency Formatter (Float Precision)
  const formatCurrencyExact = (value) => {
    if (!value || value === 'NA' || value === null) return 'N/A';
    // Remove non-numeric characters except dot
    const cleanStr = String(value).replace(/[^0-9.]/g, '');
    const num = parseFloat(cleanStr);
    
    if (isNaN(num)) return value;

    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  useEffect(() => {
    fetchPoliciesAndStats();
  }, []);

  const fetchPoliciesAndStats = async () => {
    try {
      setRefreshing(true);
       
      const [policiesRes, statsRes] = await Promise.all([
        policyService.getPolicies(),
        api.get('/user/dashboard-stats')
      ]);
  
      let pdfUsed = 0;
      let limit = 0;
      let planName = 'Free Plan';
  
      if (policiesRes.success) {
        const allPolicies = policiesRes.data || [];
        setPolicies(allPolicies);
        setSelectedPolicyIds([]); 
  
        if (statsRes.data && statsRes.data.success) {
          pdfUsed = statsRes.data.data.uploadsUsed || 0;
          limit = statsRes.data.data.uploadsLimit || 0;
          planName = statsRes.data.data.planName || 'Free Plan';
        }
  
        const isLimitReached = limit > 0 && pdfUsed >= limit;
  
        setUsageStats({
          pdfUsed,
          limit,
          isLimitReached,
          planName
        });
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ✅ BUTTON HANDLER: Check Limit BEFORE Opening Modal
  const handleUploadClick = () => {
    if (usageStats.isLimitReached) {
        setUploadLimitInfo({
            message: "Upload limit reached. Please upgrade your plan to upload more PDFs.",
            currentCount: usageStats.pdfUsed,
            limitCount: usageStats.limit
        });
        setShowUploadLimitModal(true);
    } else {
        setShowUploadModal(true);
    }
  };

  // ✅ HELPER: Parse DD/MM/YYYY correctly
  const parsePolicyDate = (dateString) => {
    if (!dateString) return null;
    const cleanDate = dateString.trim();
    const parts = cleanDate.split(/[\/\-]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month - 1, day);
      }
    }
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  };

  // --- Filtering Logic ---
  const filteredPolicies = policies.filter(policy => {
    const details = policy.file_details || {};
    
    // 1. Text Search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (value) => value && String(value).toLowerCase().includes(searchLower);
      const isMatch = (
        matchesSearch(details.Insurance_policy_number) ||
        matchesSearch(details.Insurance_company_name) ||
        matchesSearch(details.Policyholder_name) ||
        matchesSearch(details.Vehicle_registration_number)
      );
      if (!isMatch) return false;
    }

    // 2. Date Range Filter
    if (filterDateFrom || filterDateTo) {
      const policyStart = parsePolicyDate(details.Policy_start_date);
      if (!policyStart) return false;

      if (filterDateFrom) {
        const filterStart = new Date(filterDateFrom);
        filterStart.setHours(0,0,0,0);
        policyStart.setHours(0,0,0,0);
        if (policyStart < filterStart) return false;
      }

      if (filterDateTo) {
        const filterEnd = new Date(filterDateTo);
        filterEnd.setHours(23,59,59,999);
        policyStart.setHours(0,0,0,0);
        if (policyStart > filterEnd) return false;
      }
    }
    return true;
  });

  // --- Bulk Selection & Export ---
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = filteredPolicies.map(p => p.document_id);
      setSelectedPolicyIds(allIds);
    } else {
      setSelectedPolicyIds([]);
    }
  };
  const handleSelectOne = (id) => {
    if (selectedPolicyIds.includes(id)) {
      setSelectedPolicyIds(selectedPolicyIds.filter(itemId => itemId !== id));
    } else {
      setSelectedPolicyIds([...selectedPolicyIds, id]);
    }
  };


// 1️⃣ Bulk Download Handler
const handleBulkDownloadExcel = () => {
  if (selectedPolicyIds.length === 0) return;
  const selectedData = policies.filter(p => selectedPolicyIds.includes(p.document_id));
  
  const excelRows = selectedData.map(policy => {
    const details = policy.file_details || {};
    const row = {};
    POLICY_FIELDS.forEach(field => {
      let value = details[field.key];
      if (field.key.includes('premium')) value = formatCurrencyExact(value);
      else if (field.key.includes('date')) value = formatDate(value);
      row[field.label] = value || 'N/A';
    });
    row['File Name'] = policy.original_name || policy.file_name;
    return row;
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelRows);
  const colWidths = Object.keys(excelRows[0] || {}).map(key => ({ wch: key.length + 10 }));
  ws['!cols'] = colWidths;
  XLSX.utils.book_append_sheet(wb, ws, 'Selected Policies');
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Selected_Policies_${dateStr}.xlsx`);
};

// 2️⃣ Bulk Delete Handler
const handleBulkDelete = async () => {
  if (selectedPolicyIds.length === 0) return;

  const confirmMsg = `⚠️ ARE YOU SURE? ⚠️\n\nYou are about to delete ${selectedPolicyIds.length} policies.\n\nNotes:\n1. This action CANNOT be undone.\n2. Deleting files does NOT restore your upload quota.`;
  
  if (!window.confirm(confirmMsg)) return;

  setBulkDeleting(true);

  try {
    // Execute all delete requests in parallel
    const deletePromises = selectedPolicyIds.map(id => policyService.deletePolicy(id));
    await Promise.all(deletePromises);

    alert(`✅ Successfully deleted ${selectedPolicyIds.length} policies.`);
    
    // Clear selection and refresh
    setSelectedPolicyIds([]);
    await fetchPoliciesAndStats();
    await refreshUser();

  } catch (error) {
    console.error("Bulk delete error:", error);
    alert("❌ Some policies could not be deleted. Please refresh and try again.");
    fetchPoliciesAndStats(); 
  } finally {
    setBulkDeleting(false);
  }
};

// --- EXCEL IMPORT HANDLER ---
const handleImportExcelClick = () => {
  if (fileInputRef.current) {
    fileInputRef.current.click();
  }
};

const handleExcelFileChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  setExcelImporting(true);
  const reader = new FileReader();

  reader.onload = (evt) => {
    try {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      if (data.length === 0) {
        alert("❌ The selected Excel file is empty.");
        setExcelImporting(false);
        return;
      }

      const mappedPolicies = data.map((row, index) => {
        const mappedDetails = {};
        POLICY_FIELDS.forEach(field => {
          const value = row[field.key] || row[field.label] || row[field.label.toLowerCase()] || row[field.label.toUpperCase()];
          if (value) mappedDetails[field.key] = String(value);
        });
        return {
          original_name: file.name,
          file_name: `Excel_Import_Row_${index + 1}`,
          file_details: mappedDetails,
          is_manual: true
        };
      });

      setExtractedPolicies(mappedPolicies);
      setCurrentPolicyIndex(0);
      savedCountRef.current = 0;
      setShowExtractedDataModal(true);

    } catch (error) {
      console.error("Excel Parse Error:", error);
      alert("❌ Failed to parse Excel file.");
    } finally {
      setExcelImporting(false);
      e.target.value = null;
    }
  };
  reader.readAsBinaryString(file);
};

  // --- PDF Upload Handler ---
  const handleFileChange = (e) => {
    setSelectedFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select files to upload');
      return;
    }
    setUploading(true);
    setExtracting(true);
    
    try {
      const response = await policyService.uploadPDF(selectedFiles);
      if (response.success && response.data && response.data.length > 0) {
        setShowUploadModal(false);
        const extractedData = response.data.filter(policy => 
          policy.file_details && Object.keys(policy.file_details).length > 0
        );
        if (extractedData.length > 0) {
          setExtractedPolicies(extractedData);
          setCurrentPolicyIndex(0);
          savedCountRef.current = 0;
          setShowExtractedDataModal(true);
        } else {
          alert('✅ Files uploaded but no data extracted!');
          await fetchPoliciesAndStats(); // Refresh list & stats
          await refreshUser();
        }
        setSelectedFiles([]);
      } else {
        alert('❌ Upload failed: ' + (response.message || 'Unknown error'));
      }
    } catch (error) {
      if (error.response && error.response.status === 403) {
        const errorData = error.response.data || {};
        setUploadLimitInfo({ 
          message: errorData.message || 'Upload limit reached.', 
          currentCount: usageStats.pdfUsed, 
          limitCount: usageStats.limit 
        });
        setShowUploadLimitModal(true);
        setShowUploadModal(false);
      } else {
        alert('❌ Upload failed: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setUploading(false);
      setExtracting(false);
    }
  };

  // --- Save Handler (Extraction) ---
  // ✅ REPLACEMENT FUNCTION: Forces Email Trigger on Excel Import

  const handleSaveExtractedData = async () => {
    const currentPolicy = extractedPolicies[currentPolicyIndex];
    if (!currentPolicy) return;
    
    // Stop double clicks
    if (saving) return;
    setSaving(true);
    
    try {
      const docId = currentPolicy.document_id || Date.now().toString();

      // ✅ Send 'is_manual' flag to backend
      // This ensures Excel imports do NOT increase the upload counter
      await policyService.updatePolicy({
          document_id: docId,
          file_name: currentPolicy.file_name,
          file_details: currentPolicy.file_details,
          is_manual: currentPolicy.is_manual // Pass the flag
      });

      // Increment success counter
      savedCountRef.current += 1;

      if (currentPolicyIndex < extractedPolicies.length - 1) {
        setCurrentPolicyIndex(currentPolicyIndex + 1);
      } else {
        await fetchPoliciesAndStats(); 
        await refreshUser();
        setShowExtractedDataModal(false);
        setExtractedPolicies([]);
        setCurrentPolicyIndex(0);

        const total = extractedPolicies.length;
        const saved = savedCountRef.current;
        const skipped = total - saved;

        if (skipped === 0) {
             alert(`✅ All ${saved} policies saved successfully!`);
        } else {
             alert(`✅ Process Complete!\n\n📂 Saved: ${saved}\n⏭️ Skipped: ${skipped}`);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error) {
      alert('❌ Failed to save policy: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // --- Action Handlers ---
  // ✅ FIXED: Delete the policy from the backend if skipped
  const handleSkipPolicy = async () => {
    // 1. Get current policy data
    const policyToSkip = extractedPolicies[currentPolicyIndex];

    // 2. If it's a PDF upload (has a document_id), we must DELETE it from the DB
    if (policyToSkip && policyToSkip.document_id) {
        try {
            // Optional: Show a small loading or console log
            console.log("Deleting skipped policy...", policyToSkip.document_id);
            await policyService.deletePolicy(policyToSkip.document_id);
        } catch (error) {
            console.error("Failed to delete skipped policy:", error);
            alert("⚠️ Warning: Could not delete the skipped file from the server.");
        }
    }

    // 3. Move to next item or close modal
    if (currentPolicyIndex < extractedPolicies.length - 1) {
      setCurrentPolicyIndex(currentPolicyIndex + 1);
    } else {
      setShowExtractedDataModal(false);
      setExtractedPolicies([]);
      setCurrentPolicyIndex(0);
      
      // 4. Refresh the main list to show it's gone
      await fetchPoliciesAndStats();
      await refreshUser();
    }
  };

  const handlePreviousPolicy = () => {
    if (currentPolicyIndex > 0) {
      setCurrentPolicyIndex(currentPolicyIndex - 1);
    }
  };

  const handleExtractedDataChange = (fieldKey, value) => {
    const updatedPolicies = [...extractedPolicies];
    updatedPolicies[currentPolicyIndex].file_details[fieldKey] = value;
    setExtractedPolicies(updatedPolicies);
  };

  // ✅ UPDATED: PDF Download to use Exact Currency
  const handleDownloadPDF = (policy) => {
    const doc = new jsPDF();
    const details = policy.file_details || {};
    let yPos = 20; const lineHeight = 7;
    const addText = (text, x, fontSize = 10, isBold = false) => {
      doc.setFontSize(fontSize); doc.setFont(undefined, isBold ? 'bold' : 'normal');
      doc.text(text, x, yPos); yPos += lineHeight;
    };
    addText('INSURANCE POLICY DETAILS', 105, 18, true); yPos += 5;
    addText(details.Insurance_company_name || 'N/A', 14, 12, true);
    addText(`Policy Number: ${details.Insurance_policy_number || 'N/A'}`, 14, 10);
    yPos += 3; doc.line(14, yPos, 196, yPos); yPos += 8;
    POLICY_FIELDS.forEach(field => {
      let value = details[field.key] || 'N/A';
      
      // ✅ USE NEW FORMATTER
      if (field.key.includes('premium')) value = formatCurrencyExact(value);
      else if (field.key.includes('date')) value = formatDate(value);
      
      addText(`${field.label}:`, 14, 10, true); yPos -= lineHeight;
      const lines = doc.splitTextToSize(String(value), 130);
      doc.setFont(undefined, 'normal');
      doc.text(lines, 70, yPos); yPos += (lines.length * lineHeight);
    });
    doc.save(`Policy_${details.Insurance_policy_number || 'Doc'}.pdf`);
  };

  const handleDownloadExcel = (policy) => {
    const details = policy.file_details || {};
    const excelData = POLICY_FIELDS.map(field => {
      let value = details[field.key] || 'N/A';
      if (field.key.includes('premium')) value = formatCurrencyExact(value);
      else if (field.key.includes('date')) value = formatDate(value);
      return { 'Field': field.label, 'Value': value };
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    ws['!cols'] = [{ wch: 30 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Policy Details');
    XLSX.writeFile(wb, `Policy_${details.Insurance_policy_number || 'Doc'}.xlsx`);
  };

  const handleShare = (policy) => { setSharingPolicy(policy); setShowShareModal(true); };
  
  const handleShareViaEmail = () => {
    const details = sharingPolicy.file_details || {};
    const subject = encodeURIComponent(`Policy Details - ${details.Insurance_policy_number}`);
    const body = encodeURIComponent(`Dear Customer,\n\nPolicy: ${details.Insurance_policy_number}\nCompany: ${details.Insurance_company_name}\nExpiry: ${formatDate(details.Policy_expiry_date)}`);
    window.open(`mailto:${details.Policyholder_emailid}?subject=${subject}&body=${body}`);
    setShowShareModal(false);
  };

  const handleShareViaWhatsApp = () => {
    const d = sharingPolicy.file_details || {};
    const cleanPhone = (d.Policyholder_phone_number || '').replace(/\D/g, '');
    
    // Variables
    const name = d.Policyholder_name || 'Customer';
    const type = d.Insurance_plan_name || 'Insurance'; // Uses Plan Name (e.g. "Private Car Policy")
    const number = d.Insurance_policy_number || 'N/A';
    const company = d.Insurance_company_name || 'Insurance Company';
    const date = formatDate(d.Policy_expiry_date);

    // Message Format
    const message = `Dear ${name},\nYour ${type} policy (${number}) of ${company} expires on ${date}.\n\nPlease renew before the due date to continue coverage.`;

    // Open WhatsApp
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`);
    setShowShareModal(false);
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this policy?\n\n⚠️ Note: This is a "Lifetime Upload" plan. Deleting files does NOT restore your upload quota.')) return;
    try {
      const response = await policyService.deletePolicy(documentId);
      if (response.success) {
        alert('✅ Policy deleted successfully');
        await fetchPoliciesAndStats(); // Updates count immediately
        await refreshUser();
      } else alert('❌ Delete failed: ' + response.message);
    } catch (error) { console.error(error); alert('❌ Delete failed'); }
  };

  const handleEdit = (policy) => { setEditingPolicy(policy); setShowEditModal(true); };
  
  // ✅ UPDATED: Edit Save Handler (Validation + Anti-Double Click)
  const handleSaveEdit = async () => {
    // 🛑 1. Stop if already saving (Prevents double clicks)
    if (saving) return; 

    // 🔍 2. Validation
    const details = editingPolicy.file_details;
    if (details.Policy_expiry_date && !isValidDateFormat(details.Policy_expiry_date)) {
        alert(`❌ Invalid Expiry Date: "${details.Policy_expiry_date}"\nPlease use format: DD/MM/YYYY (e.g., 25/12/2025)`);
        return;
    }
    if (details.Policy_start_date && !isValidDateFormat(details.Policy_start_date)) {
        alert(`❌ Invalid Start Date: "${details.Policy_start_date}"\nPlease use format: DD/MM/YYYY`);
        return;
    }
    
    // 🔒 3. Lock the button
    setSaving(true);

    try {
      const response = await policyService.updatePolicy({
        document_id: editingPolicy.document_id,
        file_details: editingPolicy.file_details
      });
      
      if (response.success) {
        alert('✅ Policy updated');
        setShowEditModal(false);
        setEditingPolicy(null);
        await fetchPoliciesAndStats();
      } else {
        alert('❌ Update failed');
      }
    } catch (error) { 
        alert('❌ Update failed'); 
    } finally {
        // 🔓 4. Unlock button when finished
        setSaving(false); 
    }
  };

  const toggleExpandRow = (documentId) => { setExpandedRow(expandedRow === documentId ? null : documentId); };

  const getFileNames = (policy) => {
    let displayName = policy.original_name || policy.file_name;
    let fullFileName = policy.file_name;
    if (!fullFileName && policy.file_path) {
      const pathParts = policy.file_path.split('/');
      fullFileName = pathParts[pathParts.length - 1];
    }
    if (displayName && /^\d+-/.test(displayName)) displayName = displayName.replace(/^\d+-/, '');
    return { displayName: displayName || 'Unnamed Policy', fullFileName };
  };
  // ✅ Check if file exists before opening
  const handleViewFile = async (fileName) => {
    if (!fileName) return;
    setCheckingFile(true);

    const fileUrl = `${API_BASE_URL.replace('/api', '')}/uploads/${encodeURIComponent(fileName)}`;

    try {
      // Check if file exists (HEAD request)
      const response = await fetch(fileUrl, { method: 'HEAD' });
      if (response.ok) {
        window.open(fileUrl, '_blank'); // File exists, open it
      } else {
        setShowMissingFileModal(true); // 404 Not Found
      }
    } catch (error) {
      setShowMissingFileModal(true); // Network error or blocked
    } finally {
      setCheckingFile(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><Loader size="lg" text="Loading policies..." /></div>;

  const currentPolicy = extractedPolicies[currentPolicyIndex];

  return (
    <div className="py-8" style={{ background: '#f9fafb', minHeight: '100vh' }}>
      {/* 🛑 FLOATING BULK ACTION BAR (Sticky Top) */}
      {selectedPolicyIds.length > 0 && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          backgroundColor: '#fff', borderBottom: '2px solid #2563eb',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          animation: 'slideDown 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
             <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ background: '#2563eb', color: 'white', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>
                  {selectedPolicyIds.length}
                </div>
                Selected
             </span>
             <button 
                onClick={() => setSelectedPolicyIds([])}
                style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.875rem' }}
             >
                Unselect All
             </button>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            {/* Download Excel */}
            <button 
               onClick={handleBulkDownloadExcel}
               className="btn"
               style={{ background: '#10b981', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
               <FileSpreadsheet size={18} />
               Download Excel
            </button>

            {/* Bulk Delete */}
            <button 
               onClick={handleBulkDelete}
               disabled={bulkDeleting}
               className="btn"
               style={{ background: '#dc2626', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
               {bulkDeleting ? (
                 <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
               ) : (
                 <Trash2 size={18} />
               )}
               {bulkDeleting ? 'Deleting...' : 'Delete Selected'}
            </button>
          </div>
        </div>
      )}
      <div className="container">
        
        {/* Header Section */}
        <div className="policies-header">
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>My Policies</h1>
            <p style={{ color: '#6b7280' }}>Manage all your insurance policies</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => { fetchPoliciesAndStats(); refreshUser(); }}
              disabled={refreshing}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <RefreshCw size={20} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            
            <input 
              type="file" 
              accept=".xlsx, .xls"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleExcelFileChange}
            />
            
            <button 
              className="btn" 
              onClick={handleImportExcelClick}
              disabled={excelImporting}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#10b981', color: 'white', border: 'none' }}
            >
              <FileSpreadsheet size={20} />
              {excelImporting ? 'Parsing...' : 'Import Excel (Free)'}
            </button>

            <button 
              className="btn btn-primary" 
              onClick={handleUploadClick}
            >
              {usageStats.isLimitReached ? <Zap size={20} /> : <Plus size={20} />}
              {usageStats.isLimitReached ? 'Upgrade Plan' : 'Upload Policy'}
            </button>
          </div>
        </div>

        {/* Filters & Bulk Actions Card */}
        <div className="filters-card" style={{ marginBottom: '1.5rem', padding: '1.5rem', background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Top Row: Search and Dates */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
              <div className="search-input" style={{ flex: '2', minWidth: '250px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Search</label>
                <div style={{ position: 'relative' }}>
                  <Search className="search-icon" size={20} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input
                    type="text"
                    placeholder="Search by Policy No, Company, Name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '2.5rem', width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ flex: '1', minWidth: '150px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>From Date</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ flex: '1', minWidth: '150px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>To Date</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              {(searchTerm || filterDateFrom || filterDateTo) && (
                <button 
                  onClick={() => { setSearchTerm(''); setFilterDateFrom(''); setFilterDateTo(''); }}
                  style={{ height: '42px', padding: '0 1rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '0.375rem', color: '#4b5563', cursor: 'pointer', fontWeight: 500 }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Bottom Row: Stats & Bulk Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e5e7eb', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>
                    Showing <strong>{filteredPolicies.length}</strong> of {policies.length} policies
                  </div>
                  <div style={{ 
                    fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px',
                    background: usageStats.isLimitReached ? '#fee2e2' : '#f0f9ff',
                    color: usageStats.isLimitReached ? '#dc2626' : '#0369a1',
                    border: '1px solid', borderColor: usageStats.isLimitReached ? '#fca5a5' : '#bae6fd'
                  }}>
                    Uploads: <strong>{usageStats.pdfUsed} / {usageStats.limit}</strong>
                  </div>
                </div>

            </div>
          </div>
        </div>

        {/* Policies Table */}
        <div className="card">
          {filteredPolicies.length === 0 ? (
            <div className="empty-state">
              <FileText className="empty-icon" size={64} />
              <p style={{ color: '#6b7280', fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                {searchTerm || filterDateFrom || filterDateTo ? 'No policies match your filters' : 'No policies found'}
              </p>
              {!searchTerm && !filterDateFrom && !filterDateTo && (
                <>
                  <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                    Upload your first policy or import from Excel
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button className="btn btn-secondary" onClick={handleImportExcelClick}>
                      <FileSpreadsheet size={20} />
                      Import Excel
                    </button>
                    <button className="btn btn-primary" onClick={handleUploadClick}>
                      <Plus size={20} />
                      Upload Policy
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        onChange={handleSelectAll} 
                        checked={filteredPolicies.length > 0 && selectedPolicyIds.length === filteredPolicies.length}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ width: '40px' }}></th>
                    <th style={{ minWidth: '250px' }}>File Name</th>
                    <th>Policy Number</th>
                    <th>Company</th>
                    <th>Start Date</th>
                    <th>Expiry Date</th>
                    <th>Status</th>
                    <th style={{ width: '180px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPolicies.map((policy) => {
                    const details = policy.file_details || {};
                    const expiryDate = details.Policy_expiry_date;
                    const startDate = details.Policy_start_date;
                    const isExpiringSoonFlag = isExpiringSoon(expiryDate);
                    const isExpiredFlag = isExpired(expiryDate);
                    const isExpanded = expandedRow === policy.document_id;
                    const { displayName, fullFileName } = getFileNames(policy);
                    const isSelected = selectedPolicyIds.includes(policy.document_id);
                    const isExcel = policy.export_data || policy.is_manual;

                    return (
                      <React.Fragment key={policy.document_id}>
                        <tr style={{ backgroundColor: isSelected ? '#f0fdf4' : 'inherit' }}>
                          <td style={{ textAlign: 'center' }}>
                             <input 
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectOne(policy.document_id)}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                             />
                          </td>
                          <td>
                            <button
                              onClick={() => toggleExpandRow(policy.document_id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#667eea' }}
                            >
                              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                          </td>
                          <td style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {isExcel ? (
                                    <span style={{ 
                                        display:'flex', alignItems:'center', gap:'4px', 
                                        color:'#166534', background:'#dcfce7', 
                                        padding:'2px 8px', borderRadius:'12px', fontSize:'0.7rem', fontWeight: 600,
                                        border: '1px solid #bbf7d0', flexShrink: 0
                                    }}>
                                        <FileSpreadsheet size={12} /> Excel
                                    </span>
                                ) : (
                                    <span style={{ 
                                        display:'flex', alignItems:'center', gap:'4px', 
                                        color:'#1e40af', background:'#dbeafe', 
                                        padding:'2px 8px', borderRadius:'12px', fontSize:'0.7rem', fontWeight: 600,
                                        border: '1px solid #bfdbfe', flexShrink: 0
                                    }}>
                                        <FileText size={12} /> PDF
                                    </span>
                                )}
                                <span style={{ wordBreak: 'break-word', lineHeight: '1.4' }}>
                                    {displayName}
                                </span>
                            </div>
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            {details.Insurance_policy_number || 'N/A'}
                          </td>
                          <td>{details.Insurance_company_name || 'N/A'}</td>
                          <td>{formatDate(startDate)}</td>
                          <td>{formatDate(expiryDate)}</td>
                          <td>
                            <span className={`badge ${
                              isExpiredFlag ? 'badge-danger' : 
                              isExpiringSoonFlag ? 'badge-warning' : 
                              'badge-success'
                            }`}>
                              {isExpiredFlag ? 'Expired' : isExpiringSoonFlag ? 'Expiring' : 'Active'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <button
                                onClick={() => handleDownloadPDF(policy)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}
                                title="Download PDF"
                              >
                                <Download size={18} />
                              </button>
                              <button
                                onClick={() => handleShare(policy)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed' }}
                                title="Share"
                              >
                                <Share2 size={18} />
                              </button>
                              <button
                                onClick={() => handleEdit(policy)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb' }}
                                title="Edit"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleDelete(policy.document_id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}
                                title="Delete"
                              >
                                <Trash2 size={18} />
                              </button>
                              {fullFileName && !isExcel && (
                                <button
                                  onClick={() => handleViewFile(fullFileName)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a' }}
                                  title="View PDF"
                                  disabled={checkingFile}
                                >
                                  <Eye size={18} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan="9" style={{ background: '#f9fafb', padding: '1.5rem' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                                {POLICY_FIELDS.map((field) => (
                                  <div key={field.key} style={{ padding: '0.75rem', background: 'white', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase' }}>
                                      {field.label}
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: '#111827', fontWeight: 500 }}>
                                      {/* ✅ UPDATED: Exact Currency formatting in expanded view */}
                                      {field.key.includes('premium') || field.key.includes('Premium') 
                                        ? formatCurrencyExact(details[field.key])
                                        : field.key.includes('date') || field.key.includes('Date')
                                        ? formatDate(details[field.key])
                                        : details[field.key] || 'N/A'}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => !uploading && setShowUploadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Upload Policies</h3>
              <button 
                onClick={() => !uploading && setShowUploadModal(false)} 
                className="modal-close"
                disabled={uploading}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                Select PDF Files (Multiple files supported)
              </label>
              <input
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileChange}
                className="input-field"
                disabled={uploading}
              />
              {selectedFiles.length > 0 && !uploading && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '0.5rem' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#166534' }}>
                    ✓ {selectedFiles.length} file(s) selected
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '200px', overflowY: 'auto' }}>
                    {selectedFiles.map((file, index) => (
                      <li key={index} style={{ fontSize: '0.875rem', color: '#166534', padding: '0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={16} />
                        {file.name} <span style={{ color: '#6b7280' }}>({(file.size / 1024).toFixed(1)} KB)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {uploading && (
                <div style={{ marginTop: '1rem', padding: '1.5rem', background: '#eff6ff', borderRadius: '0.5rem', textAlign: 'center' }}>
                  <div className="loader" style={{ margin: '0 auto' }}>
                    <div className="spinner" style={{ width: '48px', height: '48px' }}></div>
                  </div>
                  <p style={{ marginTop: '1rem', color: '#1e40af', fontWeight: 600, fontSize: '1rem' }}>
                    {extracting ? `🤖 Extracting data from ${selectedFiles.length} PDFs...` : 'Uploading files...'}
                  </p>
                  <p style={{ marginTop: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
                    This may take {selectedFiles.length * 15}-{selectedFiles.length * 30} seconds
                  </p>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setShowUploadModal(false)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || selectedFiles.length === 0}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                <Upload size={20} />
                {uploading ? 'Processing...' : `Upload ${selectedFiles.length} File${selectedFiles.length > 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extracted Data Modal */}
      {showExtractedDataModal && currentPolicy && (
        <div 
          className="modal-overlay"
          onClick={() => {
            if (window.confirm('Close without saving changes?')) {
              setShowExtractedDataModal(false);
              setExtractedPolicies([]);
              setCurrentPolicyIndex(0);
              fetchPoliciesAndStats();
            }
          }}
        >
          <div className="modal-content modal-extracted" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  {currentPolicy.is_manual ? '📊 Review Excel Data' : '✅ Data Extracted'} 
                  – Policy {currentPolicyIndex + 1} of {extractedPolicies.length}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.9)', marginTop: '0.5rem', fontWeight: 500 }}>
                  Review and edit each policy before saving
                </p>
              </div>
              <button
                className="modal-close"
                onClick={() => {
                  if (window.confirm('Close without saving changes?')) {
                    setShowExtractedDataModal(false);
                    setExtractedPolicies([]);
                    setCurrentPolicyIndex(0);
                    fetchPoliciesAndStats();
                  }
                }}
              >
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="alert alert-info">
                <strong>📄 File:</strong> {currentPolicy.original_name || currentPolicy.file_name}
              </div>
              <div className="extracted-grid">
                {POLICY_FIELDS.map((field) => {
                  const isFullWidth = [
                    'Insurance_company_name',
                    'Insurance_plan_name',
                    'Policyholder_name',
                    'Policyholder_address',
                    'Intermediary_email'
                  ].includes(field.key);
                  return (
                    <div key={field.key} className={`field-box ${isFullWidth ? 'full-width' : ''}`}>
                      <label className="label">{field.label}</label>
                      <input
                        type="text"
                        className="input-rect"
                        value={currentPolicy.file_details[field.key] || ''}
                        onChange={(e) => handleExtractedDataChange(field.key, e.target.value)}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={handlePreviousPolicy}
                disabled={currentPolicyIndex === 0 || saving}
              >
                ← Previous
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleSkipPolicy}
                disabled={saving}
              >
                Skip →
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveExtractedData}
                disabled={saving}
              >
                {saving ? 'Saving...' : (currentPolicyIndex < extractedPolicies.length - 1 ? 'Save & Next' : 'Save & Finish')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && sharingPolicy && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal-content" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Share Policy</h3>
              <button onClick={() => setShowShareModal(false)} className="modal-close">
                <X size={24} />
              </button>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                Send policy details to <strong>{sharingPolicy.file_details.Policyholder_name || 'Policyholder'}</strong>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button
                  onClick={handleShareViaEmail}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Mail size={20} />
                  Send via Email
                  {sharingPolicy.file_details.Policyholder_emailid && (
                    <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                      ({sharingPolicy.file_details.Policyholder_emailid})
                    </span>
                  )}
                </button>
                <button
                  onClick={handleShareViaWhatsApp}
                  className="btn"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#25D366', color: 'white' }}
                >
                  <Phone size={20} />
                  Send via WhatsApp
                  {sharingPolicy.file_details.Policyholder_phone_number && (
                    <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                      ({sharingPolicy.file_details.Policyholder_phone_number})
                    </span>
                  )}
                </button>
              </div>
            </div>
            <button onClick={() => setShowShareModal(false)} className="btn btn-secondary" style={{ width: '100%' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingPolicy && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Policy</h3>
              <button onClick={() => setShowEditModal(false)} className="modal-close">
                <X size={24} />
              </button>
            </div>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {POLICY_FIELDS.map((field) => (
                <div key={field.key}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={editingPolicy.file_details[field.key] || ''}
                    onChange={(e) => setEditingPolicy({
                      ...editingPolicy,
                      file_details: {
                        ...editingPolicy.file_details,
                        [field.key]: e.target.value
                      }
                    })}
                    className="input-field"
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button 
                onClick={() => setShowEditModal(false)} 
                className="btn btn-secondary" 
                style={{ flex: 1 }} 
                disabled={saving} // Disable Cancel while saving
              >
                Cancel
              </button>
              
              {/* ✅ FIXED BUTTON: Disabled & visual feedback during save */}
              <button 
                onClick={handleSaveEdit} 
                className="btn btn-primary" 
                style={{ 
                    flex: 1, 
                    opacity: saving ? 0.7 : 1, 
                    cursor: saving ? 'not-allowed' : 'pointer' 
                }}
                disabled={saving} // 🔒 Prevents multiple clicks
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
       
      {/* Upload Limit Modal */}
      {showUploadLimitModal && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '20px'
          }}
          onClick={() => setShowUploadLimitModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white', borderRadius: '16px',
              maxWidth: '500px', width: '100%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              padding: '24px', position: 'relative', color: 'white'
            }}>
              <button
                onClick={() => setShowUploadLimitModal(false)}
                style={{
                  position: 'absolute', top: '16px', right: '16px',
                  background: 'rgba(255, 255, 255, 0.2)', border: 'none',
                  borderRadius: '50%', width: '32px', height: '32px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'white', fontSize: '20px'
                }}
              >
                ×
              </button>
               
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px', padding: '12px', fontSize: '32px'
                }}>
                  🚫
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
                    Lifetime Upload Limit Reached
                  </h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                    You've reached your total upload quota
                  </p>
                </div>
              </div>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{
                background: '#fee2e2', borderRadius: '12px', padding: '20px',
                marginBottom: '24px', border: '2px solid #fca5a5'
              }}>
                {uploadLimitInfo.currentCount > 0 && uploadLimitInfo.limitCount > 0 && (
                  <>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', marginBottom: '12px'
                    }}>
                      <span style={{ fontSize: '14px', color: '#991b1b', fontWeight: 600 }}>
                        Lifetime Uploads
                      </span>
                      <span style={{ fontSize: '20px', fontWeight: 700, color: '#dc2626' }}>
                        {uploadLimitInfo.currentCount} / {uploadLimitInfo.limitCount}
                      </span>
                    </div>
                     
                    <div style={{
                      height: '8px', backgroundColor: 'rgba(220, 38, 38, 0.1)',
                      borderRadius: '999px', overflow: 'hidden', marginBottom: '12px'
                    }}>
                      <div style={{
                        height: '100%', width: '100%',
                        background: '#dc2626', borderRadius: '999px'
                      }} />
                    </div>
                  </>
                )}
                 
                <p style={{
                  margin: 0, fontSize: '14px', color: '#991b1b',
                  fontWeight: 500, lineHeight: '1.5'
                }}>
                  {uploadLimitInfo.message}
                </p>
                 
                <p style={{
                  margin: '12px 0 0 0', fontSize: '13px',
                  color: '#7f1d1d', fontStyle: 'italic'
                }}>
                  ℹ️ Note: This tracks total uploads (including deleted policies)
                </p>
              </div>
              <div style={{
                backgroundColor: '#f0fdf4', borderRadius: '12px',
                padding: '20px', marginBottom: '24px',
                border: '2px solid #86efac'
              }}>
                <div style={{
                  fontSize: '16px', fontWeight: 700, color: '#166534',
                  marginBottom: '12px', display: 'flex',
                  alignItems: 'center', gap: '8px'
                }}>
                  <span style={{ fontSize: '20px' }}>📈</span>
                  Upgrade Benefits
                </div>
                 
                <ul style={{
                  margin: 0, paddingLeft: '24px', color: '#166534',
                  fontSize: '14px', lineHeight: '1.8'
                }}>
                  <li><strong>More uploads:</strong> 50-500 lifetime uploads</li>
                  <li><strong>Advanced features:</strong> Bulk operations & reports</li>
                  <li><strong>Priority support:</strong> Get help when you need it</li>
                  <li><strong>Better limits:</strong> Scale as you grow</li>
                </ul>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowUploadLimitModal(false)}
                  style={{
                    flex: 1, padding: '14px', fontSize: '15px', fontWeight: 600,
                    border: '2px solid #e5e7eb', borderRadius: '8px',
                    backgroundColor: 'white', color: '#374151', cursor: 'pointer'
                  }}
                >
                  Maybe Later
                </button>
                 
                <button
                  onClick={() => window.location.href = '/subscription'}
                  style={{
                    flex: 2, padding: '14px', fontSize: '15px', fontWeight: 600,
                    border: 'none', borderRadius: '8px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white', cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
                  }}
                >
                  🚀 Upgrade Plan Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 🛡️ SECURITY NOTICE MODAL */}
      {showMissingFileModal && (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000, padding: '20px'
        }} onClick={() => setShowMissingFileModal(false)}>
          
          <div style={{
              backgroundColor: 'white', maxWidth: '480px', width: '100%',
              borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
              padding: '40px 30px', textAlign: 'center', border: '1px solid #f3f4f6'
          }} onClick={(e) => e.stopPropagation()}>
            
            {/* Icon */}
            <div style={{ 
              width: '80px', height: '80px', background: '#fef2f2', 
              borderRadius: '50%', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', margin: '0 auto 24px auto' 
            }}>
              <FileText size={40} color="#ef4444" />
            </div>

            {/* Title */}
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1f2937', marginBottom: '16px' }}>
              Document Not Available
            </h2>

            {/* Message */}
            <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#4b5563', marginBottom: '32px' }}>
              To maximize your security, your policy PDFs are stored in our database only temporarily. 
              For enhanced safety, if our system updates or a new version is released, older documents 
              may be automatically deleted from our database. We strongly recommend that you download 
              and keep a safe local copy of your original insurance documents.
            </p>

            {/* Go Back Button */}
            <button
              onClick={() => setShowMissingFileModal(false)}
              style={{
                background: '#111827', color: 'white', fontSize: '16px', fontWeight: '600',
                padding: '14px 32px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                width: '100%', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            >
              Go Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default Policies;