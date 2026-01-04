// ============================================
// FILE: src/pages/Profile.jsx (SIMPLIFIED)
// ============================================
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth';
import Loader from '../components/common/Loader';

const Profile = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email_address: '',
    mobile: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await authService.getProfile();
      if (response.success) {
        setProfileData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Loader size="lg" text="Loading profile..." />
      </div>
    );
  }

  return (
    <div className="py-8" style={{ background: '#f9fafb', minHeight: '100vh' }}>
      <div className="container">
        <h1 className="text-3xl font-bold mb-8">My Profile</h1>

        <div className="profile-card">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
            Personal Information
          </h2>

          <div className="profile-form">
            <div className="profile-form-row">
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                  First Name
                </label>
                <input
                  value={profileData.first_name}
                  className="input-field"
                  disabled
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                  Last Name
                </label>
                <input
                  value={profileData.last_name}
                  className="input-field"
                  disabled
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                Email
              </label>
              <input
                value={profileData.email_address}
                className="input-field"
                disabled
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                Mobile
              </label>
              <input
                value={profileData.mobile}
                className="input-field"
                disabled
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
