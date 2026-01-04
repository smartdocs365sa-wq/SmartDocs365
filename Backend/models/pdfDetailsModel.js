const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const pdfDetailsSchema = new Schema(
  {
    document_id: {
      type: String,
      required: true,
    },
    process_id:{
      type:String,
      required:true
    },
    user_id: {
      type: String,
      required: true,
    },
    file_name:{
      type:String, // This will store the FULL filename with timestamp: "1765866950804-Suresh.pdf"
    },
    original_name:{
      type:String, // ✅ NEW: Store original name without timestamp: "Suresh.pdf"
    },
    file_path: {
      type: String,
    },
    file_details: {
      type: Object,
      required: true,
    },
    total_page: {
      type: Number,
    },
    total_cost_INR :{
      type:Number
    },
    embedding_cost_USD:{
      type:Number
    },
    plan_id:{
      type:String,
    },
    recharge_id :{
      type:String,
    },
    is_active:{
      type:Boolean,
      default:true
    },
    remark:{
      type:String,
      default:""
    },
    created_at: {
      type: Date,
    },
    updated_at: {
      type: Date,
    },
    export_data:{
      type:Boolean,
      default:false
    }
  },
  { versionKey: false }
);
module.exports = mongoose.model("pdf-details", pdfDetailsSchema);