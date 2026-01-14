// ============================================
// FILE: src/pages/Home.jsx
// ✅ FIXED: Login logic now uses direct window.location.href (Fixes double login issue)
// ✅ FIXED: Added "Forgot Password" link in Admin Modal
// ============================================
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Upload, Shield, TrendingUp, CheckCircle, Lock, Mail, 
  AlertCircle, UserCog, X, Eye, EyeOff, Video, Calendar, ArrowRight
} from 'lucide-react'; 
import logo from '../assets/logo.png';
import api from '../services/api'; 
import { authService } from '../services/auth'; 
import { formatDate } from '../utils/helpers';

// ✅ COMPONENT: News/Blog Section WITH PARAGRAPH FORMATTING
const NewsSection = () => {
  const [news, setNews] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [expandedBlogs, setExpandedBlogs] = useState({});
  
  const getImageUrl = (filename) => {
    if (!filename) return null;
    if (filename.startsWith('http')) return filename;
    const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3033/api';
    const rootUrl = apiBase.replace('/api', '');
    const cleanPath = filename.startsWith('/') ? filename : `/${filename}`;
    return `${rootUrl}${cleanPath.includes('/uploads') ? '' : '/uploads'}${cleanPath}`;
  };

  // ✅ Format description into paragraphs
  const formatDescription = (text) => {
    if (!text) return null;
    const paragraphs = text.split('\n').filter(p => p.trim());
    return paragraphs.map((para, idx) => (
      <p key={idx} style={{ marginBottom: '0.75rem', lineHeight: '1.6' }}>
        {para.trim()}
      </p>
    ));
  };

  // ✅ Truncate text
  const truncateText = (text, maxLength = 120) => {
    if (!text) return '';
    const plainText = text.replace(/\n/g, ' ').trim();
    if (plainText.length <= maxLength) return text;
    return plainText.substring(0, maxLength) + '...';
  };

  const toggleExpanded = (blogId) => {
    setExpandedBlogs(prev => ({ ...prev, [blogId]: !prev[blogId] }));
  };

  useEffect(() => {
    api.get('/public/blogs', { params: { page, limit: 6 } })
      .then(res => {
        if (res.data && res.data.success) {
          if (page === 1) {
            setNews(res.data.data || []);
          } else {
            setNews(prev => [...prev, ...(res.data.data || [])]);
          }
          setPagination(res.data.pagination);
        } else if (Array.isArray(res.data)) {
          setNews(res.data);
        }
      })
      .catch(err => console.error("Failed to load news:", err));
  }, [page]);

  const loadMore = () => setPage(prev => prev + 1);

  if (news.length === 0) return null;

  return (
    <div style={{ padding: '6rem 2rem', background: '#fff' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <span style={{ color: '#2563eb', fontWeight: 700, letterSpacing: '1px', fontSize: '0.875rem', textTransform: 'uppercase' }}>Our Blog</span>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginTop: '0.5rem', color: '#111827' }}>Latest Updates & News</h2>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '2.5rem' }}>
          {news.map(item => {
            const isExpanded = expandedBlogs[item._id || item.blog_id];
            const shouldTruncate = item.description && item.description.length > 120;

            return (
              <div key={item._id || item.blog_id} 
                style={{ 
                  backgroundColor: 'white', borderRadius: '1rem', overflow: 'hidden', 
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', 
                  border: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                }}
              >
                {/* Image */}
                <div style={{ height: '220px', overflow: 'hidden', backgroundColor: '#f9fafb', position: 'relative' }}>
                  {item.imageUrl ? (
                    <img src={getImageUrl(item.imageUrl)} alt={item.title}
                       style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                       onError={(e) => e.target.style.display = 'none'} />
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>📰</div>
                  )}
                </div>
                
                {/* Content */}
                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                    <Calendar size={14} />
                    {formatDate(item.createdAt || item.created_at)}
                  </div>
                  
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                    {item.title}
                  </h3>
                  
                  {/* ✅ Formatted Description */}
                  <div style={{ color: '#4b5563', fontSize: '0.95rem', marginBottom: '1rem', flex: 1 }}>
                    {isExpanded || !shouldTruncate ? (
                      formatDescription(item.description)
                    ) : (
                      <p>{truncateText(item.description)}</p>
                    )}
                  </div>

                  {/* Read More */}
                  {shouldTruncate && (
                    <button
                      onClick={() => toggleExpanded(item._id || item.blog_id)}
                      style={{
                        background: 'none', border: 'none', color: '#2563eb',
                        fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                        padding: 0, marginBottom: '0.5rem', textAlign: 'left'
                      }}
                    >
                      {isExpanded ? '← Show Less' : 'Read More →'}
                    </button>
                  )}
                  
                  {/* Video Link */}
                  {item.videoUrl && (
                    <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '1rem', marginTop: 'auto' }}>
                      <a href={item.videoUrl} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>
                        <Video size={16} /> Watch Video
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Load More Button */}
        {pagination && pagination.hasMore && (
          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <button
              onClick={loadMore}
              style={{
                background: '#2563eb', color: 'white', padding: '0.75rem 2rem',
                borderRadius: '0.5rem', border: 'none', fontSize: '1rem',
                fontWeight: '600', cursor: 'pointer', transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#1d4ed8'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#2563eb'}
            >
              Show More ({pagination.totalBlogs - news.length} more articles)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ✅ COMPONENT: Minimal Footer (Copyright Only)
const MinimalFooter = () => (
  <footer style={{ 
    background: '#0f172a', 
    padding: '2rem 1rem', 
    borderTop: '1px solid #1e293b',
    textAlign: 'center'
  }}>
    <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
      &copy; {new Date().getFullYear()} SmartDocs365. All rights reserved.
    </p>
  </footer>
);

// ✅ MAIN PAGE COMPONENT
const Home = () => {
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminForm, setAdminForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ✅ FIXED: Login Handler
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const data = await authService.login(adminForm.email, adminForm.password);
      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        const role = data.user?.role;
        
        // ⚠️ CRITICAL FIX: Use window.location.href instead of navigate()
        // This ensures a fresh state load and prevents the "double login" issue
        if (role === 'admin' || role === 'super-admin') {
          window.location.href = '/admin';
        } else {
          window.location.href = '/dashboard';
        }
      } else {
        setErrors({ submit: data.message || 'Login failed' });
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Connection error.';
      setErrors({ submit: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      {/* HEADER */}
      <header style={{
        background: 'linear-gradient(to right, #1e40af, #7c3aed)',
        padding: '1rem 0',
        position: 'sticky', top: 0, zIndex: 50,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <img src={logo} alt="SmartDocs365" style={{ height: '42px', width: 'auto' }} onError={(e) => { e.target.style.display = 'none'; }} />
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', margin: 0, letterSpacing: '-0.5px' }}>SmartDocs365</h1>
            </div>
          </div>
          <button onClick={() => setShowAdminLogin(true)} style={{
            background: 'rgba(255, 255, 255, 0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)',
            padding: '0.6rem 1.25rem', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.9rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', backdropFilter: 'blur(4px)', transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
          >
            <UserCog size={18} /> Admin
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <div style={{ 
        background: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)',
        padding: '6rem 2rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Abstract shapes for visual interest */}
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: '300px', height: '300px', background: 'white', opacity: '0.05', borderRadius: '50%', filter: 'blur(60px)' }}></div>
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: '400px', height: '400px', background: '#3b82f6', opacity: '0.1', borderRadius: '50%', filter: 'blur(80px)' }}></div>

        <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
          <h1 style={{ fontSize: '3.75rem', fontWeight: 900, color: 'white', marginBottom: '1.5rem', lineHeight: 1.1, textShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            Insurance Management <br /> Made <span style={{ color: '#93c5fd' }}>Intelligent</span>
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#e0e7ff', marginBottom: '3rem', maxWidth: '700px', margin: '0 auto 3rem', lineHeight: 1.6 }}>
            Upload policies, automate extraction, and never miss a renewal date with our AI-powered platform.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" style={{
              padding: '1rem 2.5rem', background: 'white', color: '#4f46e5',
              textDecoration: 'none', borderRadius: '0.75rem', fontWeight: 700,
              fontSize: '1.125rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              transition: 'transform 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              Get Started <ArrowRight size={20} />
            </Link>
            <Link to="/login" style={{
              padding: '1rem 2.5rem', background: 'rgba(255, 255, 255, 0.1)',
              color: 'white', textDecoration: 'none', borderRadius: '0.75rem',
              fontWeight: 700, fontSize: '1.125rem', border: '1px solid rgba(255,255,255,0.4)',
              backdropFilter: 'blur(10px)', transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* FEATURES SECTION */}
      <div style={{ padding: '6rem 2rem', background: '#f8fafc' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', color: '#0f172a' }}>Why Choose SmartDocs365?</h2>
            <p style={{ fontSize: '1.125rem', color: '#64748b' }}>Everything you need to manage your insurance portfolio.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2.5rem' }}>
            {[
              { icon: Upload, title: 'Smart Upload', desc: 'Upload PDFs or Excel files. Our AI extracts data instantly.', color: '#3b82f6' },
              { icon: Shield, title: 'Bank-Grade Security', desc: 'Your sensitive documents are encrypted and stored securely.', color: '#10b981' },
              { icon: TrendingUp, title: 'Renewal Tracking', desc: 'Automated alerts ensure you never miss a policy expiry.', color: '#f59e0b' },
              { icon: CheckCircle, title: 'Centralized Hub', desc: 'View, edit, and download all your policies in one dashboard.', color: '#8b5cf6' }
            ].map((feature, index) => (
              <div key={index} style={{
                background: 'white', padding: '2.5rem', borderRadius: '1.25rem',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', textAlign: 'center',
                border: '1px solid #f1f5f9', transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)';
              }}
              >
                <div style={{
                  width: '64px', height: '64px', background: `${feature.color}15`,
                  borderRadius: '1rem', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', margin: '0 auto 1.5rem', color: feature.color
                }}>
                  <feature.icon size={32} strokeWidth={2} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: '#1e293b' }}>{feature.title}</h3>
                <p style={{ color: '#64748b', lineHeight: 1.6 }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ✅ BLOGS SECTION */}
      <NewsSection />

      {/* CTA SECTION */}
      <div style={{
        padding: '6rem 2rem',
        background: '#1e1b4b',
        backgroundImage: 'linear-gradient(to right, #1e1b4b, #312e81)',
        textAlign: 'center', color: 'white'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1.5rem' }}>Ready to Organize Your Policies?</h2>
          <p style={{ fontSize: '1.25rem', marginBottom: '2.5rem', color: '#c7d2fe' }}>
            Join thousands of users who have simplified their insurance management.
          </p>
          <Link to="/register" style={{
            display: 'inline-block', padding: '1rem 3rem', background: 'white',
            color: '#312e81', textDecoration: 'none', borderRadius: '0.75rem',
            fontWeight: 700, fontSize: '1.125rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Create Free Account
          </Link>
        </div>
      </div>

      {/* ✅ MINIMAL FOOTER */}
      <MinimalFooter />

      {/* ADMIN LOGIN MODAL */}
      {showAdminLogin && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem',
            backdropFilter: 'blur(5px)'
          }} 
          onClick={() => setShowAdminLogin(false)}
        >
          <div 
            style={{
              background: 'white', padding: '2.5rem', borderRadius: '1.5rem',
              maxWidth: '420px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAdminLogin(false)}
              style={{
                position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#f1f5f9',
                border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.5rem', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
            >
              <X size={20} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                width: '64px', height: '64px', background: '#eff6ff',
                borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.25rem'
              }}>
                <Shield size={32} color="#2563eb" strokeWidth={2.5} />
              </div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', color: '#0f172a' }}>
                Admin Access
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Secure login for administrators</p>
            </div>

            <form onSubmit={handleAdminLogin}>
              {errors.submit && (
                <div style={{
                  background: '#fef2f2', color: '#dc2626', padding: '0.75rem',
                  borderRadius: '0.75rem', marginBottom: '1.25rem', fontSize: '0.875rem',
                  display: 'flex', alignItems: 'center', gap: '0.625rem', border: '1px solid #fee2e2'
                }}>
                  <AlertCircle size={18} />
                  <span>{errors.submit}</span>
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#334155' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
                  <input
                    type="email"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                    style={{ 
                      width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.75rem',
                      border: '1px solid #e2e8f0', borderRadius: '0.75rem', fontSize: '1rem',
                      outline: 'none', transition: 'all 0.2s', backgroundColor: '#f8fafc'
                    }}
                    placeholder="admin@smartdocs365.com"
                    required
                    onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.backgroundColor = 'white'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.backgroundColor = '#f8fafc'; }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#334155' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', zIndex: 1 }} size={18} />
                  <input
                    type={showAdminPassword ? "text" : "password"}
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    style={{ 
                      width: '100%', padding: '0.75rem 3rem 0.75rem 2.75rem',
                      border: '1px solid #e2e8f0', borderRadius: '0.75rem', fontSize: '1rem',
                      outline: 'none', transition: 'all 0.2s', backgroundColor: '#f8fafc'
                    }}
                    placeholder="••••••••"
                    required
                    onFocus={(e) => { e.target.style.borderColor = '#2563eb'; e.target.style.backgroundColor = 'white'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.backgroundColor = '#f8fafc'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    style={{
                      position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem',
                      color: '#94a3b8', transition: 'color 0.2s', zIndex: 1
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#2563eb'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                  >
                    {showAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* ✅ ADDED: Forgot Password Link */}
              <div style={{ textAlign: 'right', marginBottom: '1.25rem' }}>
                <Link to="/forgot-password" style={{ fontSize: '0.85rem', color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
                  Forgot Password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{ 
                  width: '100%', padding: '0.875rem',
                  background: '#2563eb',
                  color: 'white', border: 'none', borderRadius: '0.75rem',
                  fontWeight: 600, fontSize: '1rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)'
                }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.background = '#1d4ed8')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.background = '#2563eb')}
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;