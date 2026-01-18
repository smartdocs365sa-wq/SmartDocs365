// ============================================
// FILE: src/components/common/Footer.jsx
// ============================================
import { Link } from 'react-router-dom';
import { FileText, Mail, Phone } from 'lucide-react';

const Footer = () => {
  const linkStyle = {
    color: '#d1d5db',
    textDecoration: 'none',
    transition: 'color 0.3s',
    display: 'block',
    marginBottom: '0.5rem'
  };

  const handleHover = (e) => e.target.style.color = '#a78bfa';
  const handleOut = (e) => e.target.style.color = '#d1d5db';

  return (
    <footer style={{
      background: '#1f2937',
      color: '#ffffff',
      padding: '3rem 1rem 1.5rem',
      marginTop: 'auto'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '2rem'
      }}>
        {/* Company Info */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <FileText size={24} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>SmartDocs365</h3>
          </div>
          <p style={{ color: '#d1d5db', lineHeight: 1.6, margin: 0 }}>
            Manage your insurance policies efficiently with AI-powered document extraction.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Quick Links</h4>
          <Link to="/dashboard" style={linkStyle} onMouseOver={handleHover} onMouseOut={handleOut}>Dashboard</Link>
          <Link to="/policies" style={linkStyle} onMouseOver={handleHover} onMouseOut={handleOut}>Policies</Link>
          <Link to="/subscription" style={linkStyle} onMouseOver={handleHover} onMouseOut={handleOut}>Subscription</Link>
        </div>

        {/* ✅ Support - CORRECTED LINKS */}
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Support</h4>
          <Link to="/help" style={linkStyle} onMouseOver={handleHover} onMouseOut={handleOut}>Help Center</Link>
          <Link to="/contact" style={linkStyle} onMouseOver={handleHover} onMouseOut={handleOut}>Contact Us</Link>
          <Link to="/privacy" style={linkStyle} onMouseOver={handleHover} onMouseOut={handleOut}>Privacy Policy</Link>
        </div>

        {/* Contact */}
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Contact</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: '#d1d5db' }}>
            <a href="mailto:Support@smartdocs365.com" style={{ ...linkStyle, display: 'flex', alignItems: 'center', gap: '0.5rem' }} onMouseOver={handleHover} onMouseOut={handleOut}>
              <Mail size={16} />
              <span style={{ fontSize: '0.875rem' }}>Support@smartdocs365.com</span>
            </a>
            <a href="tel:+918080737271" style={{ ...linkStyle, display: 'flex', alignItems: 'center', gap: '0.5rem' }} onMouseOver={handleHover} onMouseOut={handleOut}>
              <Phone size={16} />
              <span style={{ fontSize: '0.875rem' }}>+91 8080737271</span>
            </a>
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: '1200px',
        margin: '2rem auto 0',
        paddingTop: '1.5rem',
        borderTop: '1px solid #374151',
        textAlign: 'center',
        color: '#9ca3af',
        fontSize: '0.875rem'
      }}>
        © 2025 SmartDocs365. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;