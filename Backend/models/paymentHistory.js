const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const paymentHistorySchema = new Schema(
  {
    recharge_id: {
      type: String,
      required: true,
    },
    data : {
        type:Object
    },
    created_at: {
      type: Date,
      default:Date.now()
    },
  },
  { versionKey: false }
);
module.exports = mongoose.model("payment-history", paymentHistorySchema);
