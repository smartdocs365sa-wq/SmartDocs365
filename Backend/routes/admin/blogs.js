// ============================================
// FILE: Backend/routes/admin/blogs.js
// ✅ FIXED: Added pagination endpoint
// ============================================

const express = require("express");
const router = express.Router();
const {
    getAllBlogs,
    getPublicBlogs,
    createBlog,
    updateBlog,
    deleteBlog,
    getBlog
} = require("../../controllers/admin/blogsController");

// Admin routes (protected)
router.get("/list", getAllBlogs);
router.post("/create", createBlog);
router.put("/update/:blog_id", updateBlog);
router.delete("/delete/:blog_id", deleteBlog);

// Public routes (accessible without auth)
router.get("/public", getPublicBlogs); // With pagination support
router.get("/public/:blog_id", getBlog);

module.exports = router;