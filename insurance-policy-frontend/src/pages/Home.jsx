// ============================================
// FILE: src/pages/Home.jsx
// ✅ FIXED: Connects to /public/blogs
// ✅ FIXED: Simple minimal footer added
// ============================================
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Upload, Shield, TrendingUp, CheckCircle, Lock, Mail, 
  AlertCircle, UserCog, X, Eye, EyeOff, Video, Calendar,
  ExternalLink
} from 'lucide-react'; 
import logo from '../assets/logo.png';
import api from '../services/api';
import { authService } from '../services/auth';
import { formatDate } from '../utils/helpers';

// ✅ COMPONENT: News Section (Fetches from DB)
const NewsSection = () => {
  const [news, setNews] = useState([]);
  
  const getImageUrl = (filename) => {
    if (!filename) return null;
    if (filename.startsWith('http')) return filename;
    const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:3033/api';
    const rootUrl = apiBase.replace('/api', '');
    const cleanPath = filename.startsWith('/') ? filename : `/${filename}`;
    return `${rootUrl}${cleanPath.includes('/uploads') ? '' : '/uploads'}${cleanPath}`;
  };

  useEffect(() => {
    // ✅ Fetch public blogs without login
    api.get('/public/blogs')
      .then(res => {
        if (res.data && res.data.success) {
          setNews(res.data.data || []);
        }
      })
      .catch(err => console.error("Failed to load news:", err));
  }, []);

  if (news.length === 0) return null;

  return (
    <div style={{ padding: '5rem 3rem', background: '#ffffff', borderTop: '1px solid #f3f4f6' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '2.5rem', color: '#111827', textAlign: 'center' }}>
          Latest Updates & News
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem' }}>
          {news.map(item => (
            <div key={item._id} style={{ 
              backgroundColor: 'white', borderRadius: '16px', overflow: 'hidden', 
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '1px solid #e5e7eb', 
              display: 'flex', flexDirection: 'column', transition: 'transform 0.2s ease-in-out'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ height: '200px', overflow: 'hidden', backgroundColor: '#f3f4f6' }}>
                {item.imageUrl ? (
                  <img src={getImageUrl(item.imageUrl)} alt={item.title}
                     style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                     onError={(e) => e.target.style.display = 'none'} />
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>📰</div>
                )}
              </div>
              <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '0.75rem' }}>{item.title}</h3>
                <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem', flex: 1 }}>{item.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #f3f4f6' }}>
                  <div style={{ fontSize: '0.875rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={14} /> {formatDate(item.created_at)}
                  </div>
                  {item.videoUrl && (
                    <a href={item.videoUrl} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>
                      <Video size={16} /> Watch
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ✅ SIMPLE FOOTER (Only for Home Page)
const SimpleFooter = () => (
  <footer style={{ background: '#111827', padding: '2rem', color: 'rgba(255,255,255,0.7)', textAlign: 'center', borderTop: '1px solid #1f2937' }}>
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
      <div style={{ fontSize: '0.9rem' }}>
        &copy; {new Date().getFullYear()} SmartDocs365. All rights reserved.
      </div>
      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem' }}>
        <Link to="/privacy" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }}>Privacy Policy</Link>
        <Link to="/contact" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }}>Contact Us</Link>
        <Link to="/help" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }}>Help Center</Link>
      </div>
    </div>
  </footer>
);

const Home = () => {
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminForm, setAdminForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      const data = await authService.login(adminForm.email, adminForm.password);
      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate(data.user?.role === 'admin' ? '/admin' : '/dashboard');
        setTimeout(() => window.location.reload(), 100);
      } else {
        setErrors({ submit: data.message || 'Login failed' });
      }
    } catch (error) {
      setErrors({ submit: error.response?.data?.message || 'Connection error.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* HEADER */}
      <header style={{ background: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)', padding: '1rem 0' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <img src={logo} alt="SmartDocs365" style={{ height: '48px' }} onError={(e) => { e.target.style.display = 'none'; }} />
            <div>
              <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: 'white', margin: 0 }}>SmartDocs365</h1>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.85)', margin: 0 }}>Insurance Policy Management</p>
            </div>
          </div>
          <button onClick={() => setShowAdminLogin(true)} style={{ background: 'rgba(255, 255, 255, 0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserCog size={18} /> Admin
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <div style={{ background: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)', padding: '5rem 3rem', textAlign: 'center', color: 'white' }}>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: '1.5rem', textShadow: '0 2px 20px rgba(0,0,0,0.2)' }}>Manage Your Insurance Policies with AI</h1>
        <p style={{ fontSize: '1.25rem', marginBottom: '2.5rem', opacity: 0.9 }}>Upload, extract, and manage your insurance documents effortlessly.</p>
        <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center' }}>
          <Link to="/register" style={{ padding: '1rem 2.5rem', background: 'white', color: '#1e40af', textDecoration: 'none', borderRadius: '0.75rem', fontWeight: 700 }}>Get Started Free</Link>
          <Link to="/login" style={{ padding: '1rem 2.5rem', background: 'rgba(255,255,255,0.1)', color: 'white', textDecoration: 'none', borderRadius: '0.75rem', fontWeight: 700, border: '1px solid white' }}>Sign In</Link>
        </div>
      </div>

      {/* FEATURES SECTION */}
      <div style={{ padding: '4rem 3rem', background: '#f8fafc' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '3rem', color: '#111827' }}>Why Choose SmartDocs365?</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            {[
              { icon: Upload, title: 'Easy Upload', desc: 'Upload PDF or import Excel with AI extraction', color: '#3b82f6' },
              { icon: Shield, title: 'Secure Storage', desc: 'Encrypted and safe document storage', color: '#10b981' },
              { icon: TrendingUp, title: 'Expiry Tracking', desc: 'Automated notifications before expiry', color: '#f59e0b' }
            ].map((f, i) => (
              <div key={i} style={{ background: 'white', padding: '2rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <f.icon size={40} color={f.color} style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{f.title}</h3>
                <p style={{ color: '#6b7280' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ✅ DYNAMIC NEWS SECTION */}
      <NewsSection />

      {/* ✅ SIMPLE FOOTER */}
      <SimpleFooter />

      {/* ADMIN LOGIN MODAL */}
      {showAdminLogin && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'white', padding: '2.5rem', borderRadius: '1rem', width: '100%', maxWidth: '400px', position: 'relative' }}>
            <button onClick={() => setShowAdminLogin(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', textAlign: 'center' }}>Admin Login</h2>
            <form onSubmit={handleAdminLogin}>
              {errors.submit && <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center' }}>{errors.submit}</div>}
              <input type="email" placeholder="Admin Email" value={adminForm.email} onChange={e => setAdminForm({...adminForm, email: e.target.value})} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }} required />
              <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                <input type={showAdminPassword ? "text" : "password"} placeholder="Password" value={adminForm.password} onChange={e => setAdminForm({...adminForm, password: e.target.value})} style={{ width: '100%', padding: '0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }} required />
                <button type="button" onClick={() => setShowAdminPassword(!showAdminPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer' }}>{showAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.75rem', background: '#1e40af', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>{loading ? 'Logging in...' : 'Login'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;