// ============================================
// FILE: src/pages/AdminPanel.jsx - COMPLETE FIXED VERSION
// ============================================
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminService } from '../services/admin';
import {
  Users, DollarSign, ShieldCheck, TrendingUp, Plus, Edit, Trash2,
  Ban, CheckCircle, Settings, BarChart3, UserCog, Package, Search,
  Calendar, Download, AlertCircle, Eye, XCircle, UserMinus,
  BookOpen, Video, Image as ImageIcon // ✅ NEW ICONS
} from 'lucide-react';
import Loader from '../components/common/Loader';
import { formatCurrency, formatDate } from '../utils/helpers';

const AdminPanel = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardStats();
    }
  }, [activeTab]);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const response = await adminService.getDashboardStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'plans', label: 'Subscription Plans', icon: Package },
    { id: 'reports', label: 'Reports & Analytics', icon: TrendingUp },
    { id: 'blogs', label: 'Blog & News', icon: BookOpen }, // ✅ NEW TAB
  ];

  if (user?.role === 'super-admin') {
    tabs.push({ id: 'admins', label: 'Admin Management', icon: UserCog });
  }

  return (
    <div className="py-8" style={{ background: '#f9fafb', minHeight: '100vh' }}>
      <div className="container">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Admin Panel
          </h1>
          <p style={{ color: '#6b7280' }}>
            Manage users, subscriptions, and system settings
          </p>
        </div>

        <div className="admin-tabs">
          {tabs.map(tab => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
              >
                <IconComponent size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="admin-content">
          {activeTab === 'dashboard' && <DashboardTab stats={stats} loading={loading} />}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'plans' && <PlansTab />}
          {activeTab === 'reports' && <ReportsTab />}
          {activeTab === 'blogs' && <BlogsTab />} {/* ✅ NEW CONTENT */}
          {activeTab === 'admins' && user?.role === 'super-admin' && <AdminsTab />}
        </div>
      </div>
    </div>
  );
};

// ========== DASHBOARD TAB ==========
const DashboardTab = ({ stats, loading }) => {
  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem' }}><Loader /></div>;
  }

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <h3>Total Users</h3>
            <p>{stats?.totalUsers || 0}</p>
          </div>
          <div className="stat-icon" style={{ background: '#dbeafe' }}>
            <Users size={32} color="#2563eb" />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <h3>Active Users</h3>
            <p style={{ color: '#16a34a' }}>{stats?.activeUsers || 0}</p>
          </div>
          <div className="stat-icon" style={{ background: '#d1fae5' }}>
            <CheckCircle size={32} color="#16a34a" />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <h3>Active Subscriptions</h3>
            <p style={{ color: '#ca8a04' }}>{stats?.activeSubscriptions || 0}</p>
          </div>
          <div className="stat-icon" style={{ background: '#fef3c7' }}>
            <Package size={32} color="#ca8a04" />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <h3>Total Revenue</h3>
            <p style={{ color: '#7c3aed' }}>{formatCurrency(stats?.totalRevenue || 0)}</p>
          </div>
          <div className="stat-icon" style={{ background: '#ede9fe' }}>
            <DollarSign size={32} color="#7c3aed" />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
          Recent Users
        </h2>
        {stats?.recentUsers?.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Registered</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentUsers.map(user => (
                  <tr key={user.user_id}>
                    <td style={{ fontWeight: 600 }}>{user.full_name}</td>
                    <td>{user.email_address}</td>
                    <td>{formatDate(user.created_at)}</td>
                    <td>
                      <span className={`badge ${user.blocked ? 'badge-danger' : 'badge-success'}`}>
                        {user.blocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>No users yet</p>
        )}
      </div>
    </div>
  );
};

// ========== USERS TAB ==========
const UsersTab = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchUsersAndPlans();
  }, []);

  const fetchUsersAndPlans = async () => {
    setLoading(true);
    try {
      const [usersRes, plansRes] = await Promise.all([
        adminService.getAllUsers(1, 1000),
        adminService.getAllPlans()
      ]);
      
      if (usersRes.success) {
        setUsers(usersRes.data || []);
      }
      if (plansRes.success) {
        setPlans(plansRes.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      alert('Error fetching users: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getPlanName = (planId) => {
    const plan = plans.find(p => p.plan_id === planId);
    return plan ? plan.plan_name : 'Free Plan';
  };

  const getPlanValidity = (planId) => {
    const plan = plans.find(p => p.plan_id === planId);
    if (!plan) return 'N/A';
    return `${plan.plan_duration} days`;
  };

  const handleBlockUser = async (userId, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'unblock' : 'block'} this user?`)) {
      return;
    }

    try {
      const response = await adminService.blockUser(userId, !currentStatus);
      if (response.success) {
        alert(response.message);
        fetchUsersAndPlans();
      } else {
        alert(response.message || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Block user error:', error);
      alert('Failed to update user status: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to DELETE user "${userName}"? This action cannot be undone!`)) {
      return;
    }

    try {
      const response = await adminService.deleteUser(userId);
      if (response.success) {
        alert('User deleted successfully!');
        fetchUsersAndPlans();
      } else {
        alert(response.message || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      alert('Failed to delete user: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleMakeAdmin = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to make "${userName}" an admin?\n\nThey will:\n• Have access to the admin panel\n• Be able to manage users and subscriptions\n• Appear in the Admin Management section`)) {
      return;
    }

    try {
      const response = await adminService.makeUserAdmin(userId);
      if (response.success) {
        alert(`✅ ${response.message}\n\nThe user will now appear in the Admin Management tab.`);
        fetchUsersAndPlans();
      } else {
        alert(response.message || 'Failed to promote user');
      }
    } catch (error) {
      console.error('Make admin error:', error);
      alert('Failed to promote user: ' + (error.response?.data?.message || error.message));
    }
  };

  const viewUserDetails = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const filteredUsers = users.filter(user =>
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email_address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem' }}><Loader /></div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>All Users ({filteredUsers.length})</h2>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#9ca3af'
          }} size={20} />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Plan</th>
              <th>Validity</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.user_id}>
                <td style={{ fontWeight: 600 }}>{user.full_name}</td>
                <td>{user.email_address}</td>
                <td>{user.mobile}</td>
                <td>
                  <span className="badge badge-primary">
                    {getPlanName(user.plan_id)}
                  </span>
                </td>
                <td>{getPlanValidity(user.plan_id)}</td>
                <td>
                  <span className={`badge ${user.blocked ? 'badge-danger' : 'badge-success'}`}>
                    {user.blocked ? 'Blocked' : 'Active'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => viewUserDetails(user)}
                      className="btn btn-sm"
                      style={{ padding: '0.25rem 0.5rem' }}
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    
                    {currentUser?.role === 'super-admin' && (
                      <button
                        onClick={() => handleMakeAdmin(user.user_id, user.full_name)}
                        className="btn btn-sm btn-primary"
                        style={{ padding: '0.25rem 0.5rem', background: '#7c3aed', borderColor: '#7c3aed' }}
                        title="Make Admin"
                      >
                        <ShieldCheck size={16} />
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleBlockUser(user.user_id, user.blocked)}
                      className={`btn btn-sm ${user.blocked ? 'btn-success' : 'btn-secondary'}`}
                      style={{ padding: '0.25rem 0.5rem' }}
                      title={user.blocked ? 'Unblock' : 'Block'}
                    >
                      {user.blocked ? <CheckCircle size={16} /> : <Ban size={16} />}
                    </button>
                    
                    <button
                      onClick={() => handleDeleteUser(user.user_id, user.full_name)}
                      className="btn btn-sm btn-danger"
                      style={{ padding: '0.25rem 0.5rem' }}
                      title="Delete User"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && selectedUser && (
        <Modal onClose={() => setShowModal(false)} title="User Details">
          <div style={{ display: 'grid', gap: '1rem' }}>
            <InfoItem label="Full Name" value={selectedUser.full_name} />
            <InfoItem label="Email" value={selectedUser.email_address} />
            <InfoItem label="Mobile" value={selectedUser.mobile} />
            <InfoItem label="Current Plan" value={getPlanName(selectedUser.plan_id)} />
            <InfoItem label="Plan Validity" value={getPlanValidity(selectedUser.plan_id)} />
            <InfoItem label="Registered" value={formatDate(selectedUser.created_at)} />
            <InfoItem label="Status" value={selectedUser.blocked ? 'Blocked' : 'Active'} />
          </div>
        </Modal>
      )}
    </div>
  );
};

// ========== PLANS TAB ==========
const PlansTab = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    plan_name: '',
    pdf_limit: '',
    plan_price: '',
    plan_duration: '',
    line1: '',
    line2: '',
    line3: ''
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const response = await adminService.getAllPlans();
      if (response.success) {
        setPlans(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormData({
      plan_name: '',
      pdf_limit: '',
      plan_price: '',
      plan_duration: '',
      line1: '',
      line2: '',
      line3: ''
    });
    setShowModal(true);
  };

  const openEditModal = (plan) => {
    setEditingPlan(plan);
    setFormData({
      plan_name: plan.plan_name,
      pdf_limit: plan.pdf_limit.toString(),
      plan_price: plan.plan_price.toString(),
      plan_duration: plan.plan_duration.toString(),
      line1: plan.line1 || '',
      line2: plan.line2 || '',
      line3: plan.line3 || ''
    });
    setShowModal(true);
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const planData = {
        plan_name: formData.plan_name,
        pdf_limit: Number(formData.pdf_limit),
        plan_price: Number(formData.plan_price),
        plan_duration: Number(formData.plan_duration),
        line1: formData.line1,
        line2: formData.line2,
        line3: formData.line3
      };

      let response;
      if (editingPlan) {
        response = await adminService.updatePlan(editingPlan.plan_id, planData);
      } else {
        response = await adminService.createPlan(planData);
      }

      if (response.success) {
        alert(editingPlan ? 'Plan updated successfully!' : 'Plan created successfully!');
        setShowModal(false);
        fetchPlans();
      } else {
        alert(response.message || 'Failed to save plan');
      }
    } catch (error) {
      console.error('Error saving plan:', error);
      alert('Failed to save plan: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this plan?')) return;

    try {
      const response = await adminService.deletePlan(planId);
      if (response.success) {
        alert('Plan deleted successfully!');
        fetchPlans();
      }
    } catch (error) {
      alert('Failed to delete plan');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem' }}><Loader /></div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Subscription Plans</h2>
        <button onClick={openCreateModal} className="btn btn-primary">
          <Plus size={18} /> Create New Plan
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {plans.map(plan => (
          <div key={plan.plan_id} className="card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              {plan.plan_name}
            </h3>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#667eea', marginBottom: '1rem' }}>
              {formatCurrency(plan.plan_price)}
            </div>
            <div style={{ color: '#6b7280', marginBottom: '1rem' }}>
              {plan.plan_duration} days • {plan.pdf_limit} PDFs
            </div>
            <div style={{ marginBottom: '1rem' }}>
              {plan.line1 && <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>✓ {plan.line1}</div>}
              {plan.line2 && <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>✓ {plan.line2}</div>}
              {plan.line3 && <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>✓ {plan.line3}</div>}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => openEditModal(plan)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                <Edit size={16} /> Edit
              </button>
              <button
                onClick={() => handleDeletePlan(plan.plan_id)}
                className="btn btn-danger"
                style={{ flex: 1 }}
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <Modal onClose={() => setShowModal(false)} title={editingPlan ? 'Edit Plan' : 'Create New Plan'}>
          <form onSubmit={handleSavePlan}>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label className="label">Plan Name</label>
                <input
                  type="text"
                  value={formData.plan_name}
                  onChange={(e) => setFormData({ ...formData, plan_name: e.target.value })}
                  className="input-field"
                  required
                  disabled={saving}
                />
              </div>
              <div>
                <label className="label">PDF Limit</label>
                <input
                  type="number"
                  value={formData.pdf_limit}
                  onChange={(e) => setFormData({ ...formData, pdf_limit: e.target.value })}
                  className="input-field"
                  required
                  disabled={saving}
                />
              </div>
              <div>
                <label className="label">Plan Price (Rs.)</label>
                <input
                  type="number"
                  value={formData.plan_price}
                  onChange={(e) => setFormData({ ...formData, plan_price: e.target.value })}
                  className="input-field"
                  required
                  disabled={saving}
                />
              </div>
              <div>
                <label className="label">Plan Duration (Days)</label>
                <input
                  type="number"
                  value={formData.plan_duration}
                  onChange={(e) => setFormData({ ...formData, plan_duration: e.target.value })}
                  className="input-field"
                  required
                  disabled={saving}
                />
              </div>
              <div>
                <label className="label">Feature 1</label>
                <input
                  type="text"
                  value={formData.line1}
                  onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
                  className="input-field"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="label">Feature 2</label>
                <input
                  type="text"
                  value={formData.line2}
                  onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
                  className="input-field"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="label">Feature 3</label>
                <input
                  type="text"
                  value={formData.line3}
                  onChange={(e) => setFormData({ ...formData, line3: e.target.value })}
                  className="input-field"
                  disabled={saving}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : (editingPlan ? 'Update Plan' : 'Create Plan')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

// ========== REPORTS TAB ==========
const ReportsTab = () => {
  const [userReport, setUserReport] = useState([]);
  const [policyReport, setPolicyReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [userRes, policyRes] = await Promise.all([
        adminService.getUserReport(dateRange.from, dateRange.to),
        adminService.getPolicyReport(dateRange.from, dateRange.to)
      ]);

      if (userRes.success) setUserReport(userRes.data || []);
      if (policyRes.success) setPolicyReport(policyRes.data || []);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        Reports & Analytics
      </h2>

      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'end', flexWrap: 'wrap' }}>
        <div>
          <label className="label">From Date</label>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
            className="input-field"
          />
        </div>
        <div>
          <label className="label">To Date</label>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            className="input-field"
          />
        </div>
        <button onClick={fetchReports} className="btn btn-primary">
          <Search size={18} /> Generate Report
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}><Loader /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>
              User Registrations
            </h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {userReport.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.date}</td>
                      <td><strong>{item.count}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>
              Policy Uploads
            </h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {policyReport.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.date}</td>
                      <td><strong>{item.count}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ========== BLOGS TAB (NEW) ==========
const BlogsTab = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const response = await adminService.getBlogs();
      if (response.success) setBlogs(response.data || []);
    } catch (error) {
      console.error('Fetch blogs error:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setVideoUrl('');
    setImageFile(null);
    setPreviewUrl('');
    setEditingBlog(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (blog) => {
    setEditingBlog(blog);
    setTitle(blog.title);
    setDescription(blog.description);
    setVideoUrl(blog.videoUrl || '');
    // If there's an existing image, user can see it in list, but here we prepare for new upload
    setPreviewUrl(blog.imageUrl ? `${import.meta.env.VITE_API_URL || 'http://localhost:3033'}/${blog.imageUrl}` : ''); 
    setShowModal(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('videoUrl', videoUrl);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      let response;
      if (editingBlog) {
        response = await adminService.updateBlog(editingBlog.blog_id, formData);
      } else {
        response = await adminService.createBlog(formData);
      }

      if (response.success) {
        alert(editingBlog ? 'Updated successfully!' : 'Created successfully!');
        setShowModal(false);
        fetchBlogs();
      } else {
        alert(response.message || 'Operation failed');
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    // ✅ FIX: Use window.confirm instead of just confirm
    if (!window.confirm('Delete this post?')) return;
    try {
      const res = await adminService.deleteBlog(id);
      if (res.success) fetchBlogs();
    } catch (e) {
      alert('Delete failed');
    }
  };

  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3033';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>News & Updates</h2>
        <button onClick={openCreateModal} className="btn btn-primary">
          <Plus size={18} /> New Post
        </button>
      </div>

      {loading ? <Loader /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {blogs.map(blog => (
            <div key={blog.blog_id} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {blog.imageUrl && (
                <div style={{ height: '160px', overflow: 'hidden', backgroundColor: '#e5e7eb' }}>
                  <img 
                    src={`${baseURL}/${blog.imageUrl.replace(/\\/g, '/')}`} 
                    alt={blog.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}
              <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontWeight: 700, marginBottom: '0.5rem', fontSize: '1.1rem' }}>{blog.title}</h3>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem', flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {blog.description}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                  <button onClick={() => openEditModal(blog)} className="btn btn-sm btn-secondary" style={{ flex: 1 }}>
                    <Edit size={16} /> Edit
                  </button>
                  <button onClick={() => handleDelete(blog.blog_id)} className="btn btn-sm btn-danger" style={{ flex: 1 }}>
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal onClose={() => setShowModal(false)} title={editingBlog ? "Edit Post" : "New Post"}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label className="label">Title</label>
              <input type="text" className="input-field" required value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            
            <div>
              <label className="label">Description / Content</label>
              <textarea className="input-field" rows="4" required value={description} onChange={e => setDescription(e.target.value)} />
            </div>

            <div>
              <label className="label">YouTube/Video Link (Optional)</label>
              <div style={{ position: 'relative' }}>
                <Video size={18} style={{ position: 'absolute', top: '12px', left: '10px', color: '#9ca3af' }} />
                <input type="url" className="input-field" style={{ paddingLeft: '2.5rem' }} value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://youtube.com/..." />
              </div>
            </div>

            <div>
              <label className="label">Cover Image</label>
              <div style={{ border: '2px dashed #e5e7eb', padding: '1.5rem', textAlign: 'center', borderRadius: '8px' }}>
                <input type="file" id="imgUpload" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                <label htmlFor="imgUpload" style={{ cursor: 'pointer', color: '#2563eb', fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <ImageIcon size={32} />
                  {imageFile ? imageFile.name : "Click to Upload Image"}
                </label>
              </div>
              {previewUrl && (
                <div style={{ marginTop: '1rem', height: '150px', borderRadius: '8px', overflow: 'hidden' }}>
                  <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
            </div>

            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Saving...' : 'Save Post'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};

// ========== ADMINS TAB ==========
const AdminsTab = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const response = await adminService.getAllAdmins(1, 100);
      if (response.success) {
        setAdmins(response.list || []);
      }
    } catch (error) {
      console.error('Failed to fetch admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoteAdmin = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to demote "${userName}" from admin to regular user?\n\nThey will:\n• Lose access to the admin panel\n• Return to regular user status\n• Be moved back to User Management`)) {
      return;
    }

    try {
      const response = await adminService.demoteAdmin(userId);
      if (response.success) {
        alert(`✅ ${response.message}`);
        fetchAdmins();
      } else {
        alert(response.message || 'Failed to demote admin');
      }
    } catch (error) {
      console.error('Demote admin error:', error);
      alert('Failed to demote admin: ' + (error.response?.data?.message || error.message));
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '4rem' }}><Loader /></div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Admin Management</h2>
        <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>
          Admins promoted from User Management appear here. You can demote them back to regular users.
        </p>
      </div>

      {admins.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <UserCog size={48} style={{ margin: '0 auto 1rem', color: '#9ca3af' }} />
          <p style={{ color: '#6b7280', fontSize: '1.125rem', marginBottom: '0.5rem' }}>No admins yet</p>
          <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
            Use the "Make Admin" button in User Management to promote users
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map(admin => (
                <tr key={admin.user_id}>
                  <td style={{ fontWeight: 600 }}>{admin.full_name}</td>
                  <td>{admin.email_address}</td>
                  <td>{admin.mobile}</td>
                  <td>{formatDate(admin.created_at)}</td>
                  <td>
                    <button
                      onClick={() => handleDemoteAdmin(admin.user_id, admin.full_name)}
                      className="btn btn-sm"
                      style={{ padding: '0.25rem 0.75rem', background: '#f59e0b', borderColor: '#f59e0b', color: 'white' }}
                      title="Demote to User"
                    >
                      <UserMinus size={16} /> Demote to User
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ========== UTILITY COMPONENTS ==========
const Modal = ({ children, onClose, title }) => (
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
    onClick={onClose}
  >
    <div
      style={{
        background: 'white',
        padding: '2.5rem',
        borderRadius: '1rem',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        position: 'relative'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#6b7280'
        }}
      >
        <XCircle size={24} />
      </button>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        {title}
      </h2>
      {children}
    </div>
  </div>
);

const InfoItem = ({ label, value }) => (
  <div>
    <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
      {label}
    </div>
    <div style={{ fontWeight: 600, color: '#111827' }}>{value}</div>
  </div>
);

export default AdminPanel;