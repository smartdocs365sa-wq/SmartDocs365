// ============================================
// FILE: insurance-policy-frontend/src/pages/Subscription.jsx
// ENHANCED WITH PHONEPE PAYMENT INTEGRATION
// ============================================

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscriptionService } from '../services/subscription';
import { Check, X } from 'lucide-react';
import Loader from '../components/common/Loader';
import { formatCurrency } from '../utils/helpers';

const Subscription = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [billingData, setBillingData] = useState({
    FullName: user?.full_name || '',
    Email_ID: user?.email_address || '',
    Mobile_Number: user?.mobile || '',
    Pincode: '',
    City: '',
    GST_Number: ''
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await subscriptionService.getPlans();
      if (response.success) {
        setPlans(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan) => {
    if (plan.plan_price === 0) {
      alert('Free Trial is automatically assigned on registration!');
      return;
    }
    
    setSelectedPlan(plan);
    setBillingData(prev => ({
      ...prev,
      FullName: user?.full_name || '',
      Email_ID: user?.email_address || '',
      Mobile_Number: user?.mobile || ''
    }));
    setShowBillingModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBillingData(prev => ({ ...prev, [name]: value }));
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!billingData.FullName || !billingData.Email_ID || !billingData.Mobile_Number || 
        !billingData.Pincode || !billingData.City) {
      alert('Please fill all required fields!');
      return;
    }

    // Validate mobile number (10 digits)
    if (!/^\d{10}$/.test(billingData.Mobile_Number)) {
      alert('Please enter a valid 10-digit mobile number!');
      return;
    }

    // Validate pincode (6 digits)
    if (!/^\d{6}$/.test(billingData.Pincode)) {
      alert('Please enter a valid 6-digit pincode!');
      return;
    }

    setProcessing(true);
    
    try {
      const response = await subscriptionService.purchasePlan(selectedPlan.plan_id, billingData);
      
      if (response.success && response.url) {
        // ✅ Redirect to PhonePe payment page
        window.location.href = response.url;
      } else {
        alert(response.message || 'Failed to initiate payment. Please try again.');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Loader size="lg" text="Loading plans..." />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)',
      padding: '4rem 1rem'
    }}>
      <div className="container">
        <div className="text-center mb-8">
          <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '1rem' }}>
            Choose Your Plan
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#6b7280' }}>
            Select the perfect plan for your insurance management needs
          </p>
        </div>

        <div className="subscription-plans">
          {plans.map((plan) => {
            const isFree = plan.plan_price === 0;
            const isCurrentPlan = user?.plan_id === plan.plan_id;
            
            return (
              <div key={plan.plan_id} className="plan-card">
                <div className="plan-content">
                  {isCurrentPlan && (
                    <span style={{
                      position: 'absolute',
                      top: '1rem',
                      right: '1rem',
                      background: '#16a34a',
                      color: 'white',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      Current Plan
                    </span>
                  )}
                  
                  <h3 className="plan-name">{plan.plan_name}</h3>
                  <div className="plan-price">{formatCurrency(plan.plan_price)}</div>
                  <p className="plan-duration">/{plan.plan_duration} days</p>

                  <ul className="plan-features">
                    <li className="plan-feature">
                      <Check className="feature-check" size={20} />
                      <span>{plan.pdf_limit} PDF Uploads</span>
                    </li>
                    {plan.line1 && (
                      <li className="plan-feature">
                        <Check className="feature-check" size={20} />
                        <span>{plan.line1}</span>
                      </li>
                    )}
                    {plan.line2 && (
                      <li className="plan-feature">
                        <Check className="feature-check" size={20} />
                        <span>{plan.line2}</span>
                      </li>
                    )}
                    {plan.line3 && (
                      <li className="plan-feature">
                        <Check className="feature-check" size={20} />
                        <span>{plan.line3}</span>
                      </li>
                    )}
                  </ul>

                  {!isFree && !isCurrentPlan && (
                    <button 
                      onClick={() => handleSelectPlan(plan)}
                      className="btn btn-primary" 
                      style={{ width: '100%' }}
                    >
                      Select Plan
                    </button>
                  )}
                  
                  {isFree && (
                    <button 
                      className="btn btn-secondary" 
                      style={{ width: '100%', cursor: 'not-allowed' }}
                      disabled
                    >
                      Auto-assigned on Registration
                    </button>
                  )}
                  
                  {isCurrentPlan && !isFree && (
                    <button 
                      className="btn btn-secondary" 
                      style={{ width: '100%', cursor: 'not-allowed' }}
                      disabled
                    >
                      Active Plan
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ✅ BILLING MODAL */}
      {showBillingModal && selectedPlan && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
          onClick={() => !processing && setShowBillingModal(false)}
        >
          <div
            style={{
              background: 'white',
              padding: '2.5rem',
              borderRadius: '1rem',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => !processing && setShowBillingModal(false)}
              disabled={processing}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                cursor: processing ? 'not-allowed' : 'pointer',
                color: '#6b7280'
              }}
            >
              <X size={24} />
            </button>
            
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>
              Complete Your Purchase
            </h2>
            
            <div style={{ 
              background: '#f3f4f6', 
              padding: '1rem', 
              borderRadius: '0.5rem', 
              marginBottom: '1.5rem' 
            }}>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{selectedPlan.plan_name}</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: '#667eea' }}>
                {formatCurrency(selectedPlan.plan_price)}
              </p>
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {selectedPlan.plan_duration} days • {selectedPlan.pdf_limit} PDFs
              </p>
            </div>

            <form onSubmit={handlePayment}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label className="label">Full Name *</label>
                  <input
                    type="text"
                    name="FullName"
                    value={billingData.FullName}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                    disabled={processing}
                  />
                </div>

                <div>
                  <label className="label">Email Address *</label>
                  <input
                    type="email"
                    name="Email_ID"
                    value={billingData.Email_ID}
                    onChange={handleInputChange}
                    className="input-field"
                    required
                    disabled={processing}
                  />
                </div>

                <div>
                  <label className="label">Mobile Number *</label>
                  <input
                    type="tel"
                    name="Mobile_Number"
                    value={billingData.Mobile_Number}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="10-digit mobile number"
                    pattern="[0-9]{10}"
                    required
                    disabled={processing}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="label">Pincode *</label>
                    <input
                      type="text"
                      name="Pincode"
                      value={billingData.Pincode}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder="6-digit pincode"
                      pattern="[0-9]{6}"
                      required
                      disabled={processing}
                    />
                  </div>

                  <div>
                    <label className="label">City *</label>
                    <input
                      type="text"
                      name="City"
                      value={billingData.City}
                      onChange={handleInputChange}
                      className="input-field"
                      required
                      disabled={processing}
                    />
                  </div>
                </div>

                <div>
                  <label className="label">GST Number (Optional)</label>
                  <input
                    type="text"
                    name="GST_Number"
                    value={billingData.GST_Number}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Enter GST number if applicable"
                    disabled={processing}
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={processing}
                  style={{ width: '100%', marginTop: '1rem' }}
                >
                  {processing ? 'Processing...' : 'Proceed to Payment'}
                </button>

                <p style={{ fontSize: '0.75rem', color: '#6b7280', textAlign: 'center' }}>
                  🔒 Secure payment powered by PhonePe
                </p>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscription;