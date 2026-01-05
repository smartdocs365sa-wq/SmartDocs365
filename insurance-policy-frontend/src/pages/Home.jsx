// ============================================
// FILE: src/pages/Home.jsx
// ✅ FIXED: Replaced 'localhost' fetch with 'api' service
// ============================================
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Upload, Shield, TrendingUp, CheckCircle, Lock, Mail, 
  AlertCircle, UserCog, X, Eye, EyeOff, Video, Calendar 
} from 'lucide-react'; 
import logo from '../assets/logo.png';
import api from '../services/api'; // ✅ Import API (Connects to Render)
import { formatDate } from '../utils/helpers';

const Home = () => {
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminForm, setAdminForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Blog State
  const [blogs, setBlogs] = useState([]);
  const navigate = useNavigate();

  // Fetch Public Blogs
  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        // Use the public route
        const response = await api.get('/public/blogs');
        if (response.data && response.data.success) {
          setBlogs(response.data.data || []);
        }
      } catch (error) {
        console.error("Failed to load public blogs:", error);
      }
    };
    fetchBlogs();
  }, []);

  // Image URL Helper
  const getImageUrl = (filename) => {
    if (!filename) return null;
    if (filename.startsWith('http')) return filename;
    
    const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3033/api';
    const rootUrl = apiBase.replace('/api', '');
    const cleanPath = filename.startsWith('/') ? filename : `/${filename}`;
    return `${rootUrl}${cleanPath.includes('/uploads') ? '' : '/uploads'}${cleanPath}`;
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

  // ✅ FIXED ADMIN LOGIN FUNCTION
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      // ❌ OLD: fetch('http://localhost:3033/api/login'...) 
      // ✅ NEW: api.post('/login'...) -> Uses Vercel Env Variable
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
        setTimeout(() => window.location.reload(), 100);
      } else {
        setErrors({ submit: data.message || 'Login failed' });
      }
    } catch (error) {
      console.error('Login error:', error);
      // Show actual error from backend if available
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
              <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'white', margin: 0 }}>
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
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backdropFilter: 'blur(10px)'
            }}
          >
            <UserCog size={20} />
            Admin Login
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <div style={{ background: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)', padding: '5rem 3rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: '3.75rem', fontWeight: 900, color: 'white', marginBottom: '1.5rem', lineHeight: 1.2 }}>
            Manage Your Insurance Policies with AI
          </h1>
          <p style={{ fontSize: '1.375rem', color: 'rgba(255, 255, 255, 0.95)', marginBottom: '2.5rem', maxWidth: '800px', margin: '0 auto 2.5rem' }}>
            Upload, extract, and manage your insurance documents effortlessly
          </p>
          <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" style={{ padding: '1.125rem 2.75rem', background: 'white', color: '#1e40af', textDecoration: 'none', borderRadius: '0.75rem', fontWeight: 700, fontSize: '1.125rem', display: 'inline-block' }}>
              Get Started Free
            </Link>
            <Link to="/login" style={{ padding: '1.125rem 2.75rem', background: 'rgba(255, 255, 255, 0.15)', color: 'white', textDecoration: 'none', borderRadius: '0.75rem', fontWeight: 700, fontSize: '1.125rem', border: '2px solid white', display: 'inline-block' }}>
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div style={{ padding: '5rem 3rem', background: '#f8fafc' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.75rem', fontWeight: 800, textAlign: 'center', marginBottom: '4rem', color: '#111827' }}>
            Why Choose SmartDocs365?
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} style={{ background: 'white', padding: '2.5rem', borderRadius: '1.25rem', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', textAlign: 'center' }}>
                  <div style={{ width: '72px', height: '72px', background: `${feature.color}15`, borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <IconComponent size={36} color={feature.color} />
                  </div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.875rem' }}>{feature.title}</h3>
                  <p style={{ color: '#6b7280', lineHeight: 1.7 }}>{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* LATEST NEWS SECTION */}
      {blogs.length > 0 && (
        <div style={{ padding: '5rem 3rem', background: 'white' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, textAlign: 'center', marginBottom: '1rem', color: '#111827' }}>
              Latest Updates
            </h2>
            <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '1.2rem', marginBottom: '3rem' }}>
              News and announcements from SmartDocs365
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2.5rem' }}>
              {blogs.map((blog) => (
                <div key={blog.blog_id || blog._id} style={{ 
                  borderRadius: '1.25rem', overflow: 'hidden', 
                  boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)', border: '1px solid #f3f4f6',
                  display: 'flex', flexDirection: 'column'
                }}>
                  {/* Image */}
                  <div style={{ height: '220px', background: '#f1f5f9', overflow: 'hidden' }}>
                    {blog.imageUrl ? (
                      <img 
                        src={getImageUrl(blog.imageUrl)} 
                        alt={blog.title} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>📰</div>
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                      <Calendar size={14} />
                      {formatDate(blog.createdAt || blog.created_at)}
                    </div>
                    
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '1rem', lineHeight: 1.4 }}>{blog.title}</h3>
                    <p style={{ color: '#64748b', lineHeight: 1.6, flex: 1, marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {blog.description}
                    </p>

                    {blog.videoUrl && (
                      <a href={blog.videoUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: 600, textDecoration: 'none' }}>
                        <Video size={18} /> Watch Video
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CTA SECTION */}
      <div style={{ padding: '5rem 3rem', background: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)', textAlign: 'center', color: 'white' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.75rem', fontWeight: 800, marginBottom: '1.5rem' }}>Ready to Get Started?</h2>
          <Link to="/register" style={{ display: 'inline-block', padding: '1.125rem 3rem', background: 'white', color: '#1e40af', borderRadius: '0.75rem', fontWeight: 700, fontSize: '1.1875rem', textDecoration: 'none' }}>
            Create Free Account
          </Link>
        </div>
      </div>

      {/* ADMIN LOGIN MODAL */}
      {showAdminLogin && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setShowAdminLogin(false)}>
          <div style={{ background: 'white', padding: '2.5rem', borderRadius: '1.25rem', width: '450px', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowAdminLogin(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}><X /></button>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, textAlign: 'center', marginBottom: '1.5rem' }}>Admin Login</h2>
            
            {errors.submit && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertCircle size={18}/><span>{errors.submit}</span></div>}
            
            <form onSubmit={handleAdminLogin}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Admin Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail style={{ position: 'absolute', top: '12px', left: '12px', color: '#9ca3af' }} size={20} />
                  <input type="email" value={adminForm.email} onChange={e => setAdminForm({...adminForm, email: e.target.value})} style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem', border: '2px solid #e5e7eb', borderRadius: '0.5rem' }} required placeholder="admin@smartdocs365.com" />
                </div>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock style={{ position: 'absolute', top: '12px', left: '12px', color: '#9ca3af' }} size={20} />
                  <input type={showAdminPassword ? "text" : "password"} value={adminForm.password} onChange={e => setAdminForm({...adminForm, password: e.target.value})} style={{ width: '100%', padding: '0.75rem 2.5rem', border: '2px solid #e5e7eb', borderRadius: '0.5rem' }} required placeholder="••••••" />
                  <button type="button" onClick={() => setShowAdminPassword(!showAdminPassword)} style={{ position: 'absolute', right: '12px', top: '12px', background: 'none', border: 'none', cursor: 'pointer' }}>
                    {showAdminPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '1rem', background: '#1e40af', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Signing In...' : 'Sign In to Admin Panel'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;