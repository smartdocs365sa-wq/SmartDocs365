const blogModel = require("../../models/blogModel.js");
const { v4: uuidv4 } = require("uuid");
const fs = require('fs');

// ✅ Create Blog
const create = async (req, res, next) => {
  try {
    const { title, description, videoUrl } = req.body;
    
    // Simple Validation
    if (!title || !description) {
      return res.status(400).json({ success: false, message: "Title and Description are required!" });
    }

    const imageUrl = req.file ? req.file.path : "";

    await blogModel.create({
      blog_id: uuidv4(),
      title,
      description,
      videoUrl,
      imageUrl
    });

    res.status(200).json({ success: true, message: "Blog Posted Successfully!" });
  } catch (error) {
    console.error("Create Blog Error:", error);
    next(error);
  }
};

// ✅ List Blogs (Newest First)
const list = async (req, res, next) => {
  try {
    // Sort by createdAt descending (-1)
    const data = await blogModel.find({ is_active: true }).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      result: data.length,
      data: data,
    });
  } catch (err) {
    console.log("List Blog Error:", err.message);
    next(err);
  }
};

// ✅ Update Blog (New Feature)
const update = async (req, res, next) => {
  try {
    const { blog_id } = req.params;
    const { title, description, videoUrl } = req.body;
    
    const updateData = { title, description, videoUrl };
    
    // Only update image if a new one is uploaded
    if (req.file) {
      updateData.imageUrl = req.file.path;
    }

    const updatedBlog = await blogModel.findOneAndUpdate(
      { blog_id },
      updateData,
      { new: true }
    );

    if (!updatedBlog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    res.status(200).json({ success: true, message: "Blog Updated Successfully!" });
  } catch (err) {
    console.log("Update Blog Error:", err);
    next(err);
  }
};

// ✅ Soft Delete Blog
const deleteBlog = async (req, res, next) => {
  try {
    const { id } = req.params;
    await blogModel.findOneAndUpdate({ blog_id: id }, { is_active: false });
    res.status(200).json({ success: true, message: "Blog Deleted Successfully!" });
  } catch (err) {
    console.log("Delete Blog Error:", err);
    next(err);
  }
}; 

module.exports = { create, list, update, deleteBlog };