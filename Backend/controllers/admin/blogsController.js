const blogModel = require("../../models/blogModel.js");
const { v4: uuidv4 } = require("uuid");
const fs = require('fs');

// ✅ Helper function to format description with line breaks
const formatDescription = (text) => {
  if (!text) return '';
  // Convert multiple spaces/newlines to single line break
  return text.replace(/\r\n/g, '\n').replace(/\n\s*\n/g, '\n\n').trim();
};

// ✅ Create Blog
const create = async (req, res, next) => {
  try {
    const { title, description, videoUrl } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ success: false, message: "Title and Description are required!" });
    }

    const imageUrl = req.file ? req.file.path : "";

    await blogModel.create({
      blog_id: uuidv4(),
      title,
      description: formatDescription(description), // ✅ Format description
      videoUrl,
      imageUrl
    });

    res.status(200).json({ success: true, message: "Blog Posted Successfully!" });
  } catch (error) {
    console.error("Create Blog Error:", error);
    next(error);
  }
};

// ✅ List Blogs (with pagination support)
const list = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalBlogs = await blogModel.countDocuments({ is_active: true });
    const data = await blogModel
      .find({ is_active: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    res.status(200).json({
      success: true,
      result: data.length,
      data: data,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalBlogs / limit),
        totalBlogs: totalBlogs,
        hasMore: skip + data.length < totalBlogs
      }
    });
  } catch (err) {
    console.log("List Blog Error:", err.message);
    next(err);
  }
};

// ✅ Update Blog
const update = async (req, res, next) => {
  try {
    const { blog_id } = req.params;
    const { title, description, videoUrl } = req.body;
    
    const updateData = { 
      title, 
      description: formatDescription(description), // ✅ Format description
      videoUrl 
    };
    
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