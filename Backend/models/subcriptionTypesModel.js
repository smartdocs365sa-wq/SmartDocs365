const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const subcriptionPlanSchema = new Schema(
  {
    plan_id: {
      type: String,
      required: true,
    },
    plan_name: {
      type: String,
      required: true,
    },
    pdf_limit: {
      type: Number,
      required: true,
    },
    plan_price: {
      type: Number,
      required: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    plan_duration:{
      type:Number,
      required:true
    },
    line1:{
      type:String,
      default:""
    },
    line2:{
      type:String,
      default:""
    },
    line3:{
      type:String,
      default:""
    },
    created_at: {
      type: Date,
    },
    updated_at: {
      type: Date,
    },
  },
  { versionKey: false }
);

// ✅ FIXED: Changed model name from "user-subcription-info" to "subscription-plans"
module.exports = mongoose.model("subscription-plans", subcriptionPlanSchema);