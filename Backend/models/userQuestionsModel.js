const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userQuestionsSchema = new Schema(
  {
    query_id:{
      type:String,
      required:true
    },
    user_id: {
      type: String,
      required: true,
    },
    full_name: {
      type: String,
      required: true,
    },
    email_address: {
      type: String,
      required: true,
    },
    mobile: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: false,
    },
    file_name:{
    type:String,
    default:null
    },
    file_path : {
      type :String,
      default:null
    },
    status:{
      type:Number,
      dafault:0
    },
    is_active: {
      type: Boolean,
      default: false,
    },
    created_at: {
      type: Date,
    },
    completed_at:{
      type:Date,
    }
  },
  { versionKey: false }
);
module.exports = mongoose.model("user-questions", userQuestionsSchema);
