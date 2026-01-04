// ============================================
// FILE: src/services/admin.js - COMPLETE FIXED VERSION
// ============================================
import api from './api';

export const adminService = {
  // ========== USER MANAGEMENT ==========
  async getAllUsers(page = 1, limit = 10) {
    const response = await api.get(`/user/list?page=${page}&listPerPage=${limit}`);
    return response.data;
  },

  async blockUser(userId, status) {
    const response = await api.put('/user/block', {
      user_id: userId,
      Status: status
    });
    return response.data;
  },

  async deleteUser(userId) {
    const response = await api.post('/user/delete', { user_id: userId });
    return response.data;
  },

  async makeUserAdmin(userId) {
    const response = await api.post('/user/make-admin', { user_id: userId });
    return response.data;
  },

  async getUserSubscription(userId) {
    const response = await api.get(`/user/get-user-subcription-info/${userId}`);
    return response.data;
  },

  // ========== ADMIN MANAGEMENT (Super-Admin Only) ==========
  async getAllAdmins(page = 1, limit = 10) {
    const response = await api.get(`/user/admin/list?page=${page}&listPerPage=${limit}`);
    return response.data;
  },

  async createAdmin(adminData) {
    const response = await api.post('/user/register/admin', adminData);
    return response.data;
  },

  async deleteAdmin(userId) {
    const response = await api.post('/user/delete-admin', { user_id: userId });
    return response.data;
  },

  async demoteAdmin(userId) {
    const response = await api.post('/user/demote-admin', { user_id: userId });
    return response.data;
  },

  // ========== SUBSCRIPTION PLAN MANAGEMENT ==========
  async getAllPlans() {
    const response = await api.get('/subcription-plan/list');
    return response.data;
  },

  async getPlanDetails(planId) {
    const response = await api.get(`/subcription-plan/get/specific-plan-detail/${planId}`);
    return response.data;
  },

  async createPlan(planData) {
    const response = await api.post('/subcription-plan/create', planData);
    return response.data;
  },

  async updatePlan(planId, planData) {
    const response = await api.put(`/subcription-plan/update/${planId}`, planData);
    return response.data;
  },

  async deletePlan(planId) {
    const response = await api.delete(`/subcription-plan/delete-plan-id/${planId}`);
    return response.data;
  },

  // ========== ANALYTICS & REPORTS ==========
  async getUserReport(fromDate, toDate) {
    const response = await api.get('/report/user', {
      params: { from_date: fromDate, to_date: toDate }
    });
    return response.data;
  },

  async getPolicyReport(fromDate, toDate) {
    const response = await api.get('/report/policy', {
      params: { from_date: fromDate, to_date: toDate }
    });
    return response.data;
  },

  // ========== DASHBOARD STATS ==========
  async getDashboardStats() {
    try {
      const [usersRes, plansRes] = await Promise.all([
        api.get('/user/list?page=1&listPerPage=10000'),
        api.get('/subcription-plan/list')
      ]);

      const users = usersRes.data.data || [];
      const plans = plansRes.data.data || [];

      // Calculate stats
      const totalUsers = users.length;
      const blockedUsers = users.filter(u => u.blocked).length;
      const activeUsers = totalUsers - blockedUsers;
      
      let totalRevenue = 0;
      let activeSubscriptions = 0;
      
      // Create a plan price map for quick lookup
      const planPriceMap = {};
      plans.forEach(plan => {
        planPriceMap[plan.plan_id] = plan.plan_price;
      });
      
      // Calculate revenue from users with active subscriptions
      users.forEach(user => {
        if (user.plan_id && planPriceMap[user.plan_id]) {
          // If user has a paid plan (not default free plan)
          if (user.plan_id !== '1a38214d-3a3c-4584-8980-734ebbc3a20d') {
            activeSubscriptions++;
            totalRevenue += planPriceMap[user.plan_id];
          }
        }
      });

      return {
        success: true,
        data: {
          totalUsers,
          activeUsers,
          blockedUsers,
          totalPlans: plans.length,
          activeSubscriptions,
          totalRevenue,
          recentUsers: users.slice(0, 5)
        }
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return { success: false, message: 'Failed to fetch stats' };
    }
  },

  // ========== BLOG MANAGEMENT (NEW) ==========
  async getBlogs() {
    // This calls the public list route
    const response = await api.get('/admin/blogs/list');
    return response.data;
  },

  async createBlog(formData) {
    // Note: formData must be an instance of FormData() for file upload
    const response = await api.post('/admin/blogs/create', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  async updateBlog(blogId, formData) {
    const response = await api.put(`/admin/blogs/update/${blogId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  async deleteBlog(blogId) {
    const response = await api.delete(`/admin/blogs/delete-blog-id/${blogId}`);
    return response.data;
  }
};

export default adminService;