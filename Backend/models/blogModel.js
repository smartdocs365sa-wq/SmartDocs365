const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const blogSchema = new Schema(
  {
    blog_id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String, default: "" },
    videoUrl: { type: String, default: "" }, // For YouTube/Video links
    is_active: { type: Boolean, default: true },
  },
  { 
    timestamps: true, // ✅ Automatically handles created_at and updated_at
    versionKey: false 
  }
);

module.exports = mongoose.model("blogs", blogSchema);