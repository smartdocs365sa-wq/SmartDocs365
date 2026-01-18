// ============================================
// FILE: src/pages/PrivacyPolicy.jsx
// ============================================
import { Shield, Lock, Eye, Database, UserCheck, FileText, Mail, Phone } from 'lucide-react';

const PrivacyPolicy = () => {
  const sections = [
    {
      icon: FileText,
      title: 'Information We Collect',
      content: [
        'Personal information (name, email, phone number)',
        'Insurance policy documents and related data',
        'Usage data and analytics',
        'Payment and billing information'
      ]
    },
    {
      icon: Database,
      title: 'How We Use Your Information',
      content: [
        'To provide and maintain our services',
        'To process your insurance documents using AI',
        'To send you notifications about policy expiry',
        'To improve our services and user experience',
        'To process payments and prevent fraud'
      ]
    },
    {
      icon: Lock,
      title: 'Data Security',
      content: [
        'All data is encrypted using industry-standard SSL/TLS',
        'Documents are stored on secure, encrypted servers',
        'Regular security audits and updates',
        'Access controls and authentication',
        'We never share your data without consent'
      ]
    },
    {
      icon: Eye,
      title: 'Your Rights',
      content: [
        'Access your personal data anytime',
        'Request correction of inaccurate data',
        'Delete your account and all associated data',
        'Export your data in a portable format',
        'Opt-out of marketing communications'
      ]
    },
    {
      icon: UserCheck,
      title: 'Data Retention',
      content: [
        'We retain your data as long as your account is active',
        'You can delete your account at any time',
        'Deleted data is permanently removed within 30 days',
        'Some data may be retained for legal compliance'
      ]
    }
  ];

  return (
    <div className="py-8" style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <div className="container" style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1rem' }}>
        
        {/* Header */}
        <div className="text-center mb-12" style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            boxShadow: '0 10px 20px rgba(102, 126, 234, 0.3)'
          }}>
            <Shield size={40} color="white" />
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1rem', color: '#111827' }}>
            Privacy Policy
          </h1>
          <p style={{ color: '#6b7280', fontSize: '1.125rem' }}>
            Last updated: December 27, 2025
          </p>
        </div>

        {/* Introduction */}
        <div className="card" style={{ 
          marginBottom: '2rem', 
          background: 'white', 
          padding: '2rem', 
          borderRadius: '16px', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <p style={{ fontSize: '1.125rem', lineHeight: 1.8, color: '#374151', margin: 0 }}>
            At SmartDocs365, we take your privacy seriously. This Privacy Policy explains how we collect, use, protect, and share your personal information when you use our insurance policy management platform. By using our service, you agree to the collection and use of information in accordance with this policy.
          </p>
        </div>

        {/* Sections */}
        {sections.map((section, idx) => {
          const IconComponent = section.icon;
          return (
            <div key={idx} className="card" style={{ 
              marginBottom: '2rem',
              background: 'white', 
              padding: '2rem', 
              borderRadius: '16px', 
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  background: '#ede9fe',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <IconComponent size={28} color="#7c3aed" />
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#111827' }}>
                  {section.title}
                </h2>
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {section.content.map((item, itemIdx) => (
                  <li key={itemIdx} style={{ color: '#4b5563', fontSize: '1rem', lineHeight: 1.6 }}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        {/* Contact Section */}
        <div className="card" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          textAlign: 'center',
          padding: '3rem 2rem',
          borderRadius: '16px',
          boxShadow: '0 10px 25px -5px rgba(102, 126, 234, 0.4)',
          marginTop: '3rem'
        }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem' }}>
            Questions About Privacy?
          </h2>
          <p style={{ fontSize: '1.125rem', marginBottom: '2rem', opacity: 0.9 }}>
            If you have any questions about this Privacy Policy, please contact us:
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            <a 
              href="mailto:Support@smartdocs365.com"
              style={{
                color: 'white',
                textDecoration: 'none',
                fontSize: '1.125rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(255,255,255,0.1)',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)'
              }}
            >
              <Mail size={20} />
              Support@smartdocs365.com
            </a>
            
            <a 
              href="tel:+918080737271"
              style={{
                color: 'white',
                textDecoration: 'none',
                fontSize: '1.125rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(255,255,255,0.1)',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)'
              }}
            >
              <Phone size={20} />
              +91 8080737271
            </a>
          </div>
        </div>

        {/* Legal Notice */}
        <div style={{
          marginTop: '3rem',
          padding: '1.5rem',
          background: '#fffbeb',
          borderRadius: '12px',
          border: '1px solid #fcd34d'
        }}>
          <p style={{ margin: 0, color: '#92400e', fontSize: '0.875rem', lineHeight: 1.6 }}>
            <strong>Legal Notice:</strong> By using SmartDocs365, you agree to this Privacy Policy. We reserve the right to update this policy at any time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. Continued use of the Service after any such changes constitutes your acceptance of the new Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;