// ============================================
// FILE: src/pages/Home.jsx
// ✅ FIXED: Added Public "Latest News" Section
// ============================================
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Upload, Shield, TrendingUp, CheckCircle, Lock, Mail, 
  AlertCircle, UserCog, X, Eye, EyeOff, Video, ExternalLink, Calendar 
} from 'lucide-react'; // ✅ Added Video, ExternalLink, Calendar
import logo from '../assets/logo.png';
import api from '../services/api'; // ✅ Import API to fetch blogs
import { formatDate } from '../utils/helpers';

const Home = () => {
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminForm, setAdminForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  
  // ✅ NEW STATE FOR BLOGS
  const [blogs, setBlogs] = useState([]);
  const navigate = useNavigate();

  // ✅ FETCH BLOGS ON LOAD
  useEffect(() => {
    const fetchPublicBlogs = async () => {
      try {
        const response = await api.get('/admin/blogs/list');
        if (response.data && (response.data.success || Array.isArray(response.data))) {
          // Handle both { success: true, data: [...] } and raw array [...]
          const blogList = response.data.data || response.data;
          // Sort by newest first and take top 3
          setBlogs(Array.isArray(blogList) ? blogList.slice(0, 3) : []);
        }
      } catch (error) {
        console.error("Could not fetch public blogs:", error);
      }
    };
    fetchPublicBlogs();
  }, []);

  // ✅ IMAGE URL HELPER
  const getImageUrl = (filename) => {
    if (!filename) return null;
    if (filename.startsWith('http')) return filename;
    const baseUrl = (process.env.REACT_APP_API_URL || 'http://localhost:3033/api').replace('/api', '');
    // Ensure clean path
    const cleanPath = filename.startsWith('/') ? filename : `/${filename}`;
    return `${baseUrl}/uploads${cleanPath.includes('/uploads') ? cleanPath.replace('/uploads', '') : cleanPath}`;
  };

  const features = [
    {
      icon: Upload,
      title: 'Easy Upload',
      description: 'Upload PDF policies or import bulk data via Excel with AI-powered extraction',
      color: '#3b82f6'
    },
    {
      icon: Shield,
      title: 'Secure Storage',
      description: 'Your policy documents are encrypted and stored securely',
      color: '#10b981'
    },
    {
      icon: TrendingUp,
      title: 'Expiry Tracking',
      description: 'Get automated notifications before your policies expire',
      color: '#f59e0b'
    },
    {
      icon: CheckCircle,
      title: 'Easy Management',
      description: 'View, edit, and download all your policies in one place',
      color: '#8b5cf6'
    }
  ];

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      // Use api instance instead of fetch to match your auth structure
      const response = await api.post('/login', {
        email_address: adminForm.email,
        password: adminForm.password
      });

      const data = response.data;

      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        const role = data.user?.role;
        if (role === 'admin' || role === 'super-admin') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
        window.location.reload();
      } else {
        setErrors({ submit: data.message || 'Login failed' });
      }
    } catch (error) {
      console.error('Login error:', error);
      const msg = error.response?.data?.message || 'Connection error. Please check if backend is running.';
      setErrors({ submit: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* HEADER */}
      <header style={{
        background: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)',
        padding: '1rem 0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 3rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <img 
              src={logo} 
              alt="SmartDocs365" 
              style={{ height: '48px', width: 'auto' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div>
              <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'white', margin: 0, letterSpacing: '-0.5px' }}>
                SmartDocs365
              </h1>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.85)', margin: 0, fontWeight: 500 }}>
                Insurance Policy Management
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAdminLogin(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              color: 'white',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              padding: '0.75rem 1.75rem',
              borderRadius: '0.625rem',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.3s',
              backdropFilter: 'blur(10px)'
            }}
          >
            <UserCog size={20} />
            Admin Login
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <div style={{ 
        background: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)',
        padding: '5rem 3rem'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{
            fontSize: '3.75rem', fontWeight: 900, color: 'white', marginBottom: '1.5rem',
            lineHeight: 1.2, textShadow: '0 2px 20px rgba(0,0,0,0.2)'
          }}>
            Manage Your Insurance Policies with AI
          </h1>
          <p style={{
            fontSize: '1.375rem', color: 'rgba(255, 255, 255, 0.95)', marginBottom: '2.5rem',
            maxWidth: '800px', margin: '0 auto 2.5rem', lineHeight: 1.6
          }}>
            Upload, extract, and manage your insurance documents effortlessly with SmartDocs365
          </p>
          <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" style={{
              padding: '1.125rem 2.75rem', background: 'white', color: '#1e40af',
              textDecoration: 'none', borderRadius: '0.75rem', fontWeight: 700,
              fontSize: '1.125rem', boxShadow: '0 6px 24px rgba(0,0,0,0.2)',
              transition: 'all 0.3s', display: 'inline-block'
            }}>
              Get Started Free
            </Link>
            <Link to="/login" style={{
              padding: '1.125rem 2.75rem', background: 'rgba(255, 255, 255, 0.15)',
              color: 'white', textDecoration: 'none', borderRadius: '0.75rem',
              fontWeight: 700, fontSize: '1.125rem', border: '2px solid white',
              backdropFilter: 'blur(10px)', transition: 'all 0.3s', display: 'inline-block'
            }}>
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* FEATURES SECTION */}
      <div style={{ padding: '5rem 3rem', background: '#f8fafc' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.75rem', fontWeight: 800, textAlign: 'center', marginBottom: '1rem', color: '#111827' }}>
            Why Choose SmartDocs365?
          </h2>
          <p style={{ fontSize: '1.25rem', color: '#6b7280', textAlign: 'center', marginBottom: '4rem', maxWidth: '700px', margin: '0 auto 4rem' }}>
            Powerful features to simplify your insurance management
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} style={{
                  background: 'white', padding: '2.5rem', borderRadius: '1.25rem',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)', textAlign: 'center',
                  transition: 'all 0.3s', border: '1px solid #f3f4f6'
                }}>
                  <div style={{
                    width: '72px', height: '72px', background: `${feature.color}15`,
                    borderRadius: '1rem', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', margin: '0 auto 1.5rem'
                  }}>
                    <IconComponent size={36} color={feature.color} strokeWidth={2} />
                  </div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.875rem', color: '#111827' }}>
                    {feature.title}
                  </h3>
                  <p style={{ color: '#6b7280', lineHeight: 1.7, fontSize: '1rem' }}>
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ✅ NEW: LATEST NEWS SECTION */}
      {blogs.length > 0 && (
        <div style={{ padding: '5rem 3rem', background: 'white' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, textAlign: 'center', marginBottom: '1rem', color: '#111827' }}>
              Latest Updates
            </h2>
            <p style={{ fontSize: '1.2rem', color: '#6b7280', textAlign: 'center', marginBottom: '3.5rem' }}>
              Stay informed with our latest news and features
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem' }}>
              {blogs.map((blog) => (
                <div key={blog.blog_id || blog._id} style={{
                  borderRadius: '1.25rem', overflow: 'hidden',
                  boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)',
                  background: '#fff', border: '1px solid #f3f4f6',
                  display: 'flex', flexDirection: 'column', height: '100%'
                }}>
                  {/* Image Area */}
                  <div style={{ height: '220px', background: '#f8fafc', overflow: 'hidden', position: 'relative' }}>
                    {blog.imageUrl ? (
                      <img 
                        src={getImageUrl(blog.imageUrl)} 
                        alt={blog.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #e0e7ff 0%, #f3e8ff 100%)' }}>
                        <span style={{ fontSize: '3rem' }}>📰</span>
                      </div>
                    )}
                  </div>

                  {/* Content Area */}
                  <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                      <Calendar size={14} />
                      {formatDate(blog.createdAt)}
                    </div>
                    
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem', lineHeight: 1.4 }}>
                      {blog.title}
                    </h3>
                    
                    <p style={{ fontSize: '1rem', color: '#64748b', lineHeight: 1.6, flex: 1, marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {blog.description}
                    </p>

                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {blog.videoUrl && (
                        <a 
                          href={blog.videoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: 600, textDecoration: 'none', fontSize: '0.95rem' }}
                        >
                          <Video size={18} /> Watch Video
                        </a>
                      )}
                      
                      {/* You can add a "Read More" logic if you have individual blog pages */}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CTA SECTION */}
      <div style={{
        padding: '5rem 3rem',
        background: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)',
        textAlign: 'center',
        color: 'white'
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.75rem', fontWeight: 800, marginBottom: '1.5rem', textShadow: '0 2px 20px rgba(0,0,0,0.2)' }}>
            Ready to Get Started?
          </h2>
          <p style={{ fontSize: '1.375rem', marginBottom: '2.5rem', opacity: 0.95, lineHeight: 1.6 }}>
            Join thousands of users managing their insurance policies efficiently
          </p>
          <Link to="/register" style={{
            display: 'inline-block', padding: '1.125rem 3rem', background: 'white',
            color: '#1e40af', textDecoration: 'none', borderRadius: '0.75rem',
            fontWeight: 700, fontSize: '1.1875rem', boxShadow: '0 6px 24px rgba(0,0,0,0.2)',
            transition: 'all 0.3s'
          }}>
            Create Free Account
          </Link>
        </div>
      </div>

      {/* ADMIN LOGIN MODAL */}
      {showAdminLogin && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
          }} 
          onClick={() => setShowAdminLogin(false)}
        >
          <div 
            style={{
              background: 'white', padding: '2.5rem', borderRadius: '1.25rem',
              maxWidth: '450px', width: '100%', boxShadow: '0 25px 70px rgba(0, 0, 0, 0.4)',
              position: 'relative'
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAdminLogin(false)}
              style={{
                position: 'absolute', top: '1rem', right: '1rem', background: 'none',
                border: 'none', cursor: 'pointer', color: '#9ca3af', transition: 'color 0.2s'
              }}
            >
              <X size={24} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                width: '72px', height: '72px', background: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.25rem', boxShadow: '0 8px 20px rgba(30, 64, 175, 0.3)'
              }}>
                <Shield size={36} color="white" strokeWidth={2.5} />
              </div>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', color: '#111827' }}>
                Admin Login
              </h2>
              <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>Access the administration panel</p>
            </div>

            <form onSubmit={handleAdminLogin}>
              {errors.submit && (
                <div style={{
                  background: '#fee2e2', color: '#dc2626', padding: '0.875rem',
                  borderRadius: '0.625rem', marginBottom: '1.25rem', fontSize: '0.875rem',
                  display: 'flex', alignItems: 'center', gap: '0.625rem'
                }}>
                  <AlertCircle size={20} />
                  <span>{errors.submit}</span>
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                  Admin Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} size={20} />
                  <input
                    type="email"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                    style={{ 
                      width: '100%', padding: '0.875rem 0.875rem 0.875rem 2.75rem',
                      border: '2px solid #e5e7eb', borderRadius: '0.625rem', fontSize: '1rem',
                      transition: 'border-color 0.2s', outline: 'none'
                    }}
                    placeholder="admin@smartdocs365.com"
                    required
                    onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#374151' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', zIndex: 1 }} size={20} />
                  
                  <input
                    type={showAdminPassword ? "text" : "password"}
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    style={{ 
                      width: '100%', padding: '0.875rem 3rem 0.875rem 2.75rem',
                      border: '2px solid #e5e7eb', borderRadius: '0.625rem', fontSize: '1rem',
                      transition: 'border-color 0.2s', outline: 'none'
                    }}
                    placeholder="Enter admin password"
                    required
                    onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                    onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                  />
                  
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    style={{
                      position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem',
                      color: '#9ca3af', transition: 'color 0.2s', zIndex: 1
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#1e40af'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                  >
                    {showAdminPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{ 
                  width: '100%', padding: '1rem',
                  background: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)',
                  color: 'white', border: 'none', borderRadius: '0.625rem',
                  fontWeight: 700, fontSize: '1.0625rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginBottom: '1rem', opacity: loading ? 0.7 : 1,
                  transition: 'all 0.3s', boxShadow: '0 4px 12px rgba(30, 64, 175, 0.3)'
                }}
              >
                {loading ? 'Signing in...' : 'Sign In to Admin Panel'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <Link to="/forgot-password" style={{ fontSize: '0.875rem', color: '#1e40af', textDecoration: 'none', fontWeight: 500 }}>
                  Forgot admin password?
                </Link>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;