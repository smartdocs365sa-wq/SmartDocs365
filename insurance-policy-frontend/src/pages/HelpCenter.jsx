// ============================================
// FILE: src/pages/HelpCenter.jsx
// ============================================
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Upload, Shield, CreditCard, ChevronRight, MessageCircle } from 'lucide-react';

const HelpCenter = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const faqs = [
    {
      category: 'Getting Started',
      icon: Upload,
      questions: [
        {
          q: 'How do I upload my insurance policy?',
          a: 'Click on "Upload Policy" in your dashboard, select your PDF file, and our AI will automatically extract all the important information.'
        },
        {
          q: 'What file formats are supported?',
          a: 'We currently support PDF format for insurance policy documents. Make sure your file is clear and readable.'
        },
        {
          q: 'How long does the extraction take?',
          a: 'Usually, the AI extraction takes 10-30 seconds depending on the document size and complexity.'
        }
      ]
    },
    {
      category: 'Account & Security',
      icon: Shield,
      questions: [
        {
          q: 'Is my data secure?',
          a: 'For your safety and privacy, uploaded PDF files are securely stored temporarily and then automatically deleted. Extracted data entries remain safely available in your account.'
        },
        {
          q: 'How do I reset my password?',
          a: 'Click on "Forgot Password" on the login page and follow the instructions sent to your email.'
        },
        {
          q: 'Can I delete my account?',
          a: 'Yes, you can delete your account from the Profile section. Note that this action is irreversible.'
        }
      ]
    },
    {
      category: 'Subscription & Billing',
      icon: CreditCard,
      questions: [
        {
          q: 'What subscription plans are available?',
          a: 'We offer Free, Basic, and Premium plans. Visit the Subscription page to see all features and pricing.'
        },
        {
          q: 'How do I upgrade my plan?',
          a: 'Go to Subscription → Choose a plan → Complete the payment. Your upgrade will be instant.'
        }
      ]
    }
  ];

  // Search Logic
  const filteredFaqs = faqs.map(category => {
    const term = searchTerm.toLowerCase();
    const isCategoryMatch = category.category.toLowerCase().includes(term);
    const matchingQuestions = category.questions.filter(
      q => q.q.toLowerCase().includes(term) || q.a.toLowerCase().includes(term)
    );

    return {
      ...category,
      questions: isCategoryMatch ? category.questions : matchingQuestions
    };
  }).filter(category => category.questions.length > 0);

  return (
    <div className="py-8" style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <div className="container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 1rem' }}>
        
        {/* Header */}
        <div className="text-center mb-12" style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1rem', color: '#111827' }}>
            How can we help you?
          </h1>
          <p style={{ color: '#6b7280', fontSize: '1.125rem', marginBottom: '2rem' }}>
            Search our knowledge base or browse categories below
          </p>

          {/* Search Box */}
          <div style={{ maxWidth: '600px', margin: '0 auto', position: 'relative' }}>
            <Search style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af'
            }} size={20} />
            <input
              type="text"
              placeholder="Search for help (e.g., 'password', 'upload')..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field"
              style={{
                width: '100%',
                padding: '1rem 1rem 1rem 3rem',
                fontSize: '1rem',
                borderRadius: '12px',
                border: '1px solid #d1d5db',
                outline: 'none',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
              }}
            />
          </div>
        </div>

        {/* FAQs by Category */}
        {filteredFaqs.length > 0 ? (
          filteredFaqs.map((category, idx) => {
            const IconComponent = category.icon;
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
                    width: '48px',
                    height: '48px',
                    background: '#ede9fe',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <IconComponent size={24} color="#7c3aed" />
                  </div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#111827' }}>
                    {category.category}
                  </h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {category.questions.map((item, qIdx) => (
                    <div key={qIdx}>
                      <h3 style={{
                        fontSize: '1.125rem',
                        fontWeight: 600,
                        color: '#374151',
                        marginBottom: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <ChevronRight size={18} color="#667eea" />
                        {item.q}
                      </h3>
                      <p style={{ color: '#6b7280', lineHeight: 1.6, paddingLeft: '1.625rem', margin: 0 }}>
                        {item.a}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
            <Search size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              No results found
            </h3>
            <p>We couldn't find any articles matching "{searchTerm}"</p>
            <button 
              onClick={() => setSearchTerm('')}
              style={{
                marginTop: '1rem',
                color: '#667eea',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                textDecoration: 'underline'
              }}
            >
              Clear search
            </button>
          </div>
        )}

        {/* Contact Support Block */}
        <div className="card" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          textAlign: 'center',
          padding: '3rem 2rem',
          borderRadius: '16px',
          boxShadow: '0 10px 25px -5px rgba(102, 126, 234, 0.4)',
          marginTop: '3rem'
        }}>
          <MessageCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.9 }} />
          <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem' }}>
            Still need help?
          </h2>
          <p style={{ fontSize: '1.125rem', marginBottom: '2rem', opacity: 0.9, maxWidth: '600px', margin: '0 auto 2rem' }}>
            Our support team is available Mon-Fri to help you with any questions or issues.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/contact"
              className="btn"
              style={{
                background: 'white',
                color: '#667eea',
                padding: '1rem 2.5rem',
                fontSize: '1rem',
                fontWeight: 700,
                textDecoration: 'none',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                display: 'inline-block'
              }}
            >
              Contact Support
            </Link>
            <a
              href="mailto:Support@smartdocs365.com"
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                padding: '1rem 2.5rem',
                fontSize: '1rem',
                fontWeight: 700,
                textDecoration: 'none',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.3)',
                display: 'inline-block'
              }}
            >
              Email Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;