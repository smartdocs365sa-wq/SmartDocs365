const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    first_name: {
      type: String,
      required: true,
      maxLength: 31,
    },
    last_name: {
      type: String,
      required: true,
      maxLength: 31,
    },
    full_name : {
      type:String,
      default: function () {
        if(this.first_name && this.last_name){
          return `${this.first_name}  ${this.last_name}`;
        }else {
          return "";
        }
      }
    },
    email_address: {
      type: String,
      required: true,
      maxLength: 255,
    },
    plan_id:{
      type:String,
      default:"1a38214d-3a3c-4584-8980-734ebbc3a20d"
    },
    mobile:{
      type:String,
      required:true
    },
    user_id: {
      type: String,
      required: true,
    },
    blocked:{
      type:Boolean,
      default:false
    },
    created_at: {
      type:Date
    },
    updated_at: {
      type: Date
    }
  },
  { versionKey: false }
);
module.exports = mongoose.model("user", userSchema);
