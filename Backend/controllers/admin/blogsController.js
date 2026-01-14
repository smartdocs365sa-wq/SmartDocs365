// ============================================
// FILE: Backend/controllers/admin/blogsController.js
// ✅ FIXED: Added pagination support
// ============================================

const blogModel = require("../../models/blogModel");
const { v4 } = require("uuid");
const { getCurrentDateTime } = require("../../utils/repetedUsedFunction");

// Get all blogs (Admin)
const getAllBlogs = async (req, res, next) => {
    try {
        if (req.role !== "admin" && req.role !== "super-admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        const blogs = await blogModel.find().sort({ created_at: -1 });
        res.json({
            success: true,
            data: blogs
        });
    } catch (error) {
        console.error("Get all blogs error:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching blogs"
        });
    }
};

// Get public blogs (with pagination)
const getPublicBlogs = async (req, res, next) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 6; // 6 blogs per page
        const skip = (page - 1) * limit;

        // Get total count for pagination
        const totalBlogs = await blogModel.countDocuments({ is_active: true });
        
        // Get paginated blogs
        const blogs = await blogModel
            .find({ is_active: true })
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            success: true,
            data: blogs,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalBlogs / limit),
                totalBlogs: totalBlogs,
                hasMore: skip + blogs.length < totalBlogs
            }
        });
    } catch (error) {
        console.error("Get public blogs error:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching blogs"
        });
    }
};

// Create blog
const createBlog = async (req, res, next) => {
    try {
        if (req.role !== "admin" && req.role !== "super-admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        const { title, content, author, category } = req.body;

        if (!title || !content) {
            return res.status(400).json({
                success: false,
                message: "Title and content are required!"
            });
        }

        const blog = await blogModel.create({
            blog_id: v4(),
            title: title.trim(),
            content: content.trim(),
            author: author?.trim() || "SmartDocs365",
            category: category?.trim() || "General",
            is_active: true,
            created_at: getCurrentDateTime().dateAndTimeString,
            updated_at: getCurrentDateTime().dateAndTimeString
        });

        res.status(201).json({
            success: true,
            message: "Blog created successfully!",
            data: blog
        });
    } catch (error) {
        console.error("Create blog error:", error);
        res.status(500).json({
            success: false,
            message: "Error creating blog"
        });
    }
};

// Update blog
const updateBlog = async (req, res, next) => {
    try {
        if (req.role !== "admin" && req.role !== "super-admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        const { blog_id } = req.params;
        const { title, content, author, category, is_active } = req.body;

        const blog = await blogModel.findOneAndUpdate(
            { blog_id },
            {
                title: title?.trim(),
                content: content?.trim(),
                author: author?.trim(),
                category: category?.trim(),
                is_active,
                updated_at: getCurrentDateTime().dateAndTimeString
            },
            { new: true }
        );

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found!"
            });
        }

        res.json({
            success: true,
            message: "Blog updated successfully!",
            data: blog
        });
    } catch (error) {
        console.error("Update blog error:", error);
        res.status(500).json({
            success: false,
            message: "Error updating blog"
        });
    }
};

// Delete blog
const deleteBlog = async (req, res, next) => {
    try {
        if (req.role !== "admin" && req.role !== "super-admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied!"
            });
        }

        const { blog_id } = req.params;

        const blog = await blogModel.findOneAndDelete({ blog_id });

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found!"
            });
        }

        res.json({
            success: true,
            message: "Blog deleted successfully!"
        });
    } catch (error) {
        console.error("Delete blog error:", error);
        res.status(500).json({
            success: false,
            message: "Error deleting blog"
        });
    }
};

// Get single blog
const getBlog = async (req, res, next) => {
    try {
        const { blog_id } = req.params;

        const blog = await blogModel.findOne({ blog_id, is_active: true });

        if (!blog) {
            return res.status(404).json({
                success: false,
                message: "Blog not found!"
            });
        }

        res.json({
            success: true,
            data: blog
        });
    } catch (error) {
        console.error("Get blog error:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching blog"
        });
    }
};

module.exports = {
    getAllBlogs,
    getPublicBlogs,
    createBlog,
    updateBlog,
    deleteBlog,
    getBlog
};