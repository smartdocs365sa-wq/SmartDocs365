const express = require("express");
const router = express.Router();
const subcriptionPlanController = require("../../controllers/admin/subcriptionPlanController.js");

// ✅ Public routes
router.get("/list", subcriptionPlanController.list);
router.get("/get/specific-plan-detail/:id", subcriptionPlanController.specificPlanDetail);

// ✅ Admin-only routes (with role validation)
router.use(require('../../middleware/roleValidation.js'));

router.post('/create', subcriptionPlanController.create);
router.put('/update/:id', subcriptionPlanController.updatePlan); // ✅ ADDED update route
router.delete("/delete-plan-id/:id", subcriptionPlanController.deletePlan);

module.exports = router;