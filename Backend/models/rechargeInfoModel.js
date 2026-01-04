const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const rechargeInfoSchema = new Schema(
  {
    recharge_id: {
      type: String,
      required: true,
    },
    user_id: {
      type: String,
      required: true,
    },
    order_id: {
      type: String,
      required: true,
    },
    plan_id: {
      type: String,
      required: true,
    },
    is_active: {
      type: Boolean,
      default: false,
    },
    payment_status: {
      type: Boolean,
      default: false,
    },
    recharge_expiry_date: {
      type: String,
      required: true,
    },
    FullName : {
      type:String,
    },
    Pincode:{
      type:String
    } ,
    City:{
      type:String
    },
    Email_ID:{
      type:String
    },
    Mobile_Number:{
      type:String
    },
    GST_Number:{
      type:String
    },
    Amount:{
      type:Number
    },
    created_at: {
      type: Date,
    },
  },
  { versionKey: false }
);
module.exports = mongoose.model("recharge-info", rechargeInfoSchema);
