const express = require("express");
const router = express.Router();
const blogsController = require("../../controllers/admin/blogsController.js");
const { upload } = require('../../middleware/uploadImage');

// Public route (for Dashboard to read)
router.get("/list", blogsController.list);

// Protected Routes (Admin only)
router.use(require('../../middleware/roleValidation.js'));

router.post('/create', upload.single('image'), blogsController.create);
router.put('/update/:blog_id', upload.single('image'), blogsController.update); // ✅ Added Update Route
router.delete("/delete-blog-id/:id", blogsController.deleteBlog);

module.exports = router;