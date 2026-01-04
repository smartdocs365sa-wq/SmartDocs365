const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const account_Schema = new Schema(
  {
    user_id: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    role : {
      type:String,
      required:true,
      default:"user"
    }
  },
  { versionKey: false }
);
module.exports = mongoose.model("user-account", account_Schema);
