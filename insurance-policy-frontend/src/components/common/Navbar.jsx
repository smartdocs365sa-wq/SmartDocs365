// ============================================
// FILE: insurance-policy-frontend/src/components/common/Navbar.jsx
// ============================================

import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User, Shield, LifeBuoy } from 'lucide-react'; // ✅ Imported LifeBuoy
import logo from '../../assets/logo.png';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'super-admin';
  const isActive = (path) => location.pathname === path;

  const getLinkStyle = (path) => ({
    color: isActive(path) ? '#667eea' : '#4b5563',
    textDecoration: 'none',
    fontWeight: isActive(path) ? 600 : 500,
    padding: '0.5rem 1rem',
    borderRadius: '0.5rem',
    background: isActive(path) ? '#f3f4f6' : 'transparent',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  });

  return (
    <nav style={{
      background: 'white',
      borderBottom: '1px solid #e5e7eb',
      padding: '1rem 0',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 2rem'
      }}>
        {/* Logo */}
        <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <img src={logo} alt="SmartDocs365" style={{ height: '36px', width: 'auto' }} onError={(e) => { e.target.style.display = 'none'; }} />
          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#667eea' }}>SmartDocs365</span>
        </Link>

        {/* Navigation Links */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Link to="/dashboard" style={getLinkStyle('/dashboard')}>
            Dashboard
          </Link>

          <Link to="/policies" style={getLinkStyle('/policies')}>
            Policies
          </Link>

          <Link to="/subscription" style={getLinkStyle('/subscription')}>
            Subscription
          </Link>

          {/* ✅ NEW SUPPORT LINK */}
          <Link to="/help" style={getLinkStyle('/help')}>
            <LifeBuoy size={18} />
            Support
          </Link>

          {/* Admin Link */}
          {isAdmin && (
            <Link to="/admin" style={{ ...getLinkStyle('/admin'), color: isActive('/admin') ? '#7c3aed' : '#7c3aed' }}>
              <Shield size={18} />
              Admin
            </Link>
          )}

          {/* User Menu */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '1rem', paddingLeft: '1rem', marginLeft: '0.5rem', borderLeft: '1px solid #e5e7eb'
          }}>
            <Link to="/profile" style={getLinkStyle('/profile')}>
              <User size={18} />
              {user?.first_name || 'User'}
            </Link>

            <button
              onClick={handleLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 500, fontSize: '1rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;