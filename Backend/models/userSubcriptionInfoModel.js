// ============================================
// FILE: Backend/models/userSubcriptionInfoModel.js
// ============================================

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSubcriptionInfo = new Schema(
  {
    user_id: {
      type: String,
      required: true,
      unique: true // Ensures one subscription per user
    },
    plan_id: {
      type: String,
      required: true,
    },
    plan_active: {
      type: Boolean,
      default: true,
    },
    plan_name: {
      type: String,
      default: "Free Trial"
    },
    plan_type: {
      type: String,
      default: "Default",
    },
    // The Limit from the Plan
    pdf_limit: {
      type: Number,
      default: 0,
    },
    // ✅ NEW FIELD: The Monotonic Counter (Only Increases)
    total_uploads_used: {
      type: Number,
      default: 0,
    },
    // The fixed expiry date
    expiry_date: {
      type: Date
    },
    created_at: {
      type: Date,
      default: Date.now
    },
    updated_at: {
      type: Date,
      default: Date.now
    },
  },
  { versionKey: false }
);

module.exports = mongoose.model("user-subcription-info", userSubcriptionInfo);