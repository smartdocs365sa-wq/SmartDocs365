// ============================================
// FILE: src/services/subscription.js
// ============================================
import api from './api';

export const subscriptionService = {
  async getPlans() {
    // ✅ Matches the public route in handler.js
    const response = await api.get('/subcription-plan-direct/list');
    return response.data;
  },

  async purchasePlan(planId, billingData) {
    const response = await api.post(`/recharge/purchase/plan-id/${planId}`, billingData);
    return response.data;
  },

  async getUserSubscription(userId) {
    const response = await api.get(`/user/get-user-subcription-info/${userId}`);
    return response.data;
  }
};