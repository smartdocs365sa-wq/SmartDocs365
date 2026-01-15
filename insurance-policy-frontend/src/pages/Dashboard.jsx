// ============================================
// FILE: src/pages/Dashboard.jsx - COMPLETE FIXED VERSION
// ============================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Upload,
  Eye,
  Calendar,
  RefreshCw,
  FileSpreadsheet,
  Zap,
  Shield,
  Video
} from 'lucide-react';
import api from '../services/api'; 
import Loader from '../components/common/Loader';
import { formatDate } from '../utils/helpers';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Real-time stats state
  const [realTimeStats, setRealTimeStats] = useState({
    pdfUsed: 0,
    excelUsed: 0,
    totalLimit: 0,
    percentage: 0,
    planName: 'Loading...',
    expiryDate: null
  });

  const [dashboardData, setDashboardData] = useState({
    totalPolicies: 0,
    activePolicies: 0,
    expiringSoon: 0,
    expired: 0
  });

  const [recentPolicies, setRecentPolicies] = useState([]);
  const [userName, setUserName] = useState('User');

  useEffect(() => {
    fetchDashboardData();
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/user/profile');
      if (response.data.success) {
        setUserName(response.data.data.name || response.data.data.full_name || 'User');
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

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

  // ✅ REPLACED FUNCTION
  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      
      // ✅ CRITICAL FIX: Use backend's real counter
      const statsResponse = await api.get('/user/dashboard-stats');
      
      console.log('📊 Backend Stats Response:', statsResponse.data);
      
      if (!statsResponse.data.success) {
        console.error('❌ Stats fetch failed:', statsResponse.data);
        return;
      }
      
      const backendStats = statsResponse.data.data;
      
      // Get policies for policy counts
      const policiesResponse = await api.get('/pdf/list');
      
      if (policiesResponse.data.success) {
        const allPolicies = policiesResponse.data.data || [];
        const pdfPolicies = allPolicies.filter(p => !p.export_data && !p.is_manual);
        const excelPolicies = allPolicies.filter(p => p.export_data || p.is_manual);
        
        // ✅ CRITICAL: Use backend's counter, NOT file count
        const usedCount = backendStats.uploadsUsed || 0; // From DB
        const limit = backendStats.uploadsLimit || 0; 
        const percentage = limit > 0 ? Math.min((usedCount / limit) * 100, 100) : 0;

        console.log('📈 Dashboard Calculation:');
        console.log('   PDF Used (from DB):', usedCount);
        console.log('   PDF Limit:', limit);
        console.log('   Percentage:', percentage.toFixed(1) + '%');

        setRealTimeStats({
          pdfUsed: usedCount,  // ✅ Use DB value
          excelUsed: excelPolicies.length,
          totalLimit: limit,
          percentage: percentage,
          planName: backendStats.planName || 'Free Plan',
          expiryDate: backendStats.expiryDate
        });

        // Calculate policy status
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const thirtyDaysFromNow = new Date(now);
        thirtyDaysFromNow.setDate(now.getDate() + 30);

        let activeCount = 0;
        let expiredCount = 0;
        let expiringSoonCount = 0;

        allPolicies.forEach(p => {
            const expiryStr = p.file_details?.Policy_expiry_date;
            const expiryDate = parsePolicyDate(expiryStr);
            if (expiryDate) {
                expiryDate.setHours(0, 0, 0, 0);
                if (expiryDate < now) {
                    expiredCount++;
                } else {
                    activeCount++;
                    if (expiryDate <= thirtyDaysFromNow) {
                        expiringSoonCount++;
                    }
                }
            } else {
                expiredCount++; 
            }
        });

        setDashboardData({
          totalPolicies: allPolicies.length,
          activePolicies: activeCount,
          expiringSoon: expiringSoonCount,
          expired: expiredCount
        });

        const sortedPolicies = [...allPolicies].sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        ).slice(0, 5);
        setRecentPolicies(sortedPolicies);
      }
      
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const getProgressBarColor = () => {
    if (realTimeStats.percentage >= 100) return '#ef4444';
    if (realTimeStats.percentage >= 80) return '#dc2626';
    return '#667eea';
  };

  const isLimitReached = realTimeStats.pdfUsed >= realTimeStats.totalLimit && realTimeStats.totalLimit > 0;
  const isNearLimit = realTimeStats.percentage >= 80 && !isLimitReached;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Loader size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '2rem 0' }}>
      <div className="container">
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.5rem', color: '#111827' }}>
              Welcome back, {userName}!
            </h1>
            <p style={{ color: '#6b7280' }}>Here's an overview of your policy management</p>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem',
              backgroundColor: 'white', border: '2px solid #e5e7eb', borderRadius: '8px',
              cursor: refreshing ? 'not-allowed' : 'pointer', fontWeight: 500, color: '#374151'
            }}
          >
            <RefreshCw size={18} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* --- PLAN STATUS CARD --- */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '16px', padding: '2rem', marginBottom: '2rem',
          color: 'white', boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            
            <div style={{ flex: 1, minWidth: '250px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
                  Current Plan: {realTimeStats.planName}
                </h3>
                {isLimitReached && (
                   <span style={{ backgroundColor: '#ef4444', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                     LIMIT REACHED
                   </span>
                )}
              </div>
              
              <p style={{ fontSize: '1rem', marginBottom: '0.5rem', opacity: 0.9 }}>
                <strong>{realTimeStats.pdfUsed}</strong> of <strong>{realTimeStats.totalLimit}</strong> PDF uploads used
              </p>
              <p style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                (Excel imports: {realTimeStats.excelUsed} - <strong>Free/Unlimited</strong>)
              </p>
              
              {realTimeStats.expiryDate && (
                <p style={{ fontSize: '0.875rem', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <Calendar size={16} />
                  Valid until: {formatDate(realTimeStats.expiryDate)}
                </p>
              )}

              {/* Warnings */}
              {isLimitReached && (
                <p style={{ marginTop: '0.75rem', padding: '0.5rem 1rem', backgroundColor: 'rgba(239, 68, 68, 0.25)', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={16} /> Upload limit reached! Upgrade now.
                </p>
              )}
              {isNearLimit && (
                <p style={{ marginTop: '0.75rem', padding: '0.5rem 1rem', backgroundColor: 'rgba(245, 158, 11, 0.25)', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={16} /> Running low on uploads!
                </p>
              )}
            </div>
            
            <button
              onClick={() => navigate('/subscription')}
              style={{
                padding: '0.75rem 1.5rem', backgroundColor: 'white',
                color: isLimitReached ? '#dc2626' : '#667eea',
                border: 'none', borderRadius: '8px', fontWeight: 700,
                cursor: 'pointer', fontSize: '1rem', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                display: 'flex', alignItems: 'center', gap: '0.5rem'
              }}
            >
              <Zap size={18} /> Upgrade Plan
            </button>
          </div>
          
          {/* Progress Bar */}
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ height: '12px', backgroundColor: 'rgba(255, 255, 255, 0.2)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${realTimeStats.percentage}%`,
                backgroundColor: getProgressBarColor(),
                borderRadius: '999px',
                transition: 'width 0.5s ease, background-color 0.5s ease'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
              {realTimeStats.percentage.toFixed(0)}% used
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <StatCard 
            title="Total Policies" 
            value={dashboardData.totalPolicies} 
            icon={<FileText size={24} color="#2563eb" />} 
            bg="#dbeafe" textColor="#111827" 
          />
          <StatCard 
            title="Active Policies" 
            value={dashboardData.activePolicies} 
            icon={<CheckCircle size={24} color="#10b981" />} 
            bg="#d1fae5" textColor="#10b981" 
          />
          <StatCard 
            title="Expiring Soon" 
            value={dashboardData.expiringSoon} 
            icon={<Clock size={24} color="#f59e0b" />} 
            bg="#fef3c7" textColor="#f59e0b" 
          />
          <StatCard 
            title="Expired" 
            value={dashboardData.expired} 
            icon={<AlertTriangle size={24} color="#ef4444" />} 
            bg="#fee2e2" textColor="#ef4444" 
          />
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* Upload Button - Shows Alert if Limit Reached */}
          <div onClick={() => isLimitReached ? alert("Limit Reached! Please Upgrade.") : navigate('/policies')} style={{ cursor: 'pointer' }}>
            <QuickActionCard 
              onClick={() => {}} // Handled by parent div
              icon={<Upload size={28} color={isLimitReached ? "#9ca3af" : "#2563eb"} />}
              iconBg={isLimitReached ? "#f3f4f6" : "#dbeafe"}
              title="Upload PDF Policy"
              subtitle={isLimitReached ? "Limit Reached (Upgrade Required)" : "Add new PDF documents"}
              hoverColor={isLimitReached ? "#e5e7eb" : "#667eea"}
            />
          </div>
          
          <QuickActionCard 
            onClick={() => navigate('/policies')}
            icon={<FileSpreadsheet size={28} color="#10b981" />}
            iconBg="#d1fae5"
            title="Import Excel (Free)"
            subtitle="Unlimited bulk imports"
            hoverColor="#10b981"
          />
        </div>

        {/* Recent Policies */}
        <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', margin: 0 }}>Recent Policies</h2>
            <button onClick={() => navigate('/policies')} style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: 600, cursor: 'pointer' }}>
              View All
            </button>
          </div>
          
          {recentPolicies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
              <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p>No policies yet. Upload your first policy to get started!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {recentPolicies.map((policy) => {
                const details = policy.file_details || {};
                const isExcel = policy.export_data || policy.is_manual;
                return (
                  <div
                    key={policy.document_id}
                    onClick={() => navigate('/policies')}
                    style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; e.currentTarget.style.borderColor = '#667eea'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                  >
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                       <div style={{ padding: '0.5rem', borderRadius: '8px', background: isExcel ? '#d1fae5' : '#dbeafe', color: isExcel ? '#059669' : '#2563eb' }}>
                          {isExcel ? <FileSpreadsheet size={20} /> : <FileText size={20} />}
                       </div>
                       <div>
                          <p style={{ fontWeight: 600, marginBottom: '0.25rem', color: '#111827' }}>
                            {details.Insurance_policy_number || 'N/A'}
                          </p>
                          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                            {details.Insurance_company_name || 'Unknown Company'}
                          </p>
                       </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '99px', background: isExcel ? '#dcfce7' : '#eff6ff', color: isExcel ? '#166534' : '#1e40af', fontWeight: 600, marginRight: '1rem' }}>
                        {isExcel ? 'EXCEL' : 'PDF'}
                      </span>
                      <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {formatDate(details.Policy_expiry_date)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* --- NEWS & UPDATES SECTION --- */}
        <NewsSection />

      </div>
      
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

// Helper Components
const StatCard = ({ title, value, icon, bg, textColor }) => (
  <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', border: '1px solid #e5e7eb' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>{title}</p>
        <h3 style={{ fontSize: '2.25rem', fontWeight: 700, color: textColor, margin: 0 }}>{value}</h3>
      </div>
      <div style={{ backgroundColor: bg, borderRadius: '12px', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
    </div>
  </div>
);

const QuickActionCard = ({ onClick, icon, iconBg, title, subtitle, hoverColor }) => (
  <div
    onClick={onClick}
    style={{
      backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', border: '2px solid #e5e7eb',
      cursor: 'pointer', transition: 'all 0.2s'
    }}
    onMouseOver={(e) => {
      e.currentTarget.style.borderColor = hoverColor;
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = `0 4px 12px ${hoverColor}33`;
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.borderColor = '#e5e7eb';
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
    }}
  >
    <div style={{ backgroundColor: iconBg, borderRadius: '12px', padding: '1rem', width: 'fit-content', marginBottom: '1rem' }}>
      {icon}
    </div>
    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: '#111827' }}>{title}</h3>
    <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>{subtitle}</p>
  </div>
);

/// ✅ NEWS SECTION COMPONENT WITH PARAGRAPH FORMATTING
const NewsSection = () => {
  const [news, setNews] = useState([]);
  const [expandedBlogs, setExpandedBlogs] = useState({});
  
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) return imageUrl;
    const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3033/api';
    const rootUrl = apiBase.replace('/api', '');
    const cleanPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    return `${rootUrl}${cleanPath}`;
  };

  // ✅ Format description into paragraphs
  const formatDescription = (text) => {
    if (!text) return null;
    const paragraphs = text.split('\n').filter(p => p.trim());
    return paragraphs.map((para, idx) => (
      <p key={idx} style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
        {para.trim()}
      </p>
    ));
  };

  // ✅ Truncate text
  const truncateText = (text, maxLength = 150) => {
    if (!text) return '';
    const plainText = text.replace(/\n/g, ' ').trim();
    if (plainText.length <= maxLength) return text;
    return plainText.substring(0, maxLength) + '...';
  };

  const toggleExpanded = (blogId) => {
    setExpandedBlogs(prev => ({ ...prev, [blogId]: !prev[blogId] }));
  };
  
  useEffect(() => {
    api.get('/admin/blogs/list')
      .then(res => {
        if (res.data.success) setNews(res.data.data || []);
      })
      .catch(err => console.error("Failed to load news", err));
  }, []);

  if (news.length === 0) return null;

  return (
    <div style={{ marginTop: '3rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: '#111827' }}>
        Latest Updates
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {news.map(item => {
          const isExpanded = expandedBlogs[item.blog_id];
          const shouldTruncate = item.description && item.description.length > 150;

          return (
            <div key={item.blog_id} style={{ 
              backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', 
              display: 'flex', flexDirection: 'column',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            }}
            >
              {/* Image */}
              {item.imageUrl && (
                <div style={{ height: '180px', overflow: 'hidden', backgroundColor: '#f3f4f6' }}>
                  <img 
                     src={getImageUrl(item.imageUrl)} 
                     alt={item.title}
                     style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                     onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}
              
              {/* Content */}
              <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', marginBottom: '0.75rem' }}>
                  {item.title}
                </h3>
                
                {/* ✅ Formatted Description with Paragraphs */}
                <div style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem', flex: 1 }}>
                  {isExpanded || !shouldTruncate ? (
                    formatDescription(item.description)
                  ) : (
                    <p>{truncateText(item.description)}</p>
                  )}
                </div>

                {/* Read More Button */}
                {shouldTruncate && (
                  <button
                    onClick={() => toggleExpanded(item.blog_id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      padding: 0,
                      marginBottom: '1rem',
                      textAlign: 'left'
                    }}
                  >
                    {isExpanded ? '← Show Less' : 'Read More →'}
                  </button>
                )}
                
                {/* Video Link */}
                {item.videoUrl && (
                  <a 
                    href={item.videoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                      color: '#ef4444', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none',
                      marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #f3f4f6'
                    }}
                  >
                    <Video size={16} />
                    Watch Video
                  </a>
                )}
                
                <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                  {formatDate(item.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;