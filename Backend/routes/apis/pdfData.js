const express = require("express");
const router = express.Router();
const pdfDataController = require("../../controllers/pdfDataController.js");

router.get('/list' , pdfDataController.list);
router.get("/expire-policy/list" , pdfDataController.expiryPolicyList);
router.post("/update", pdfDataController.update);
router.delete("/delete-document-id/:id" , pdfDataController.deleteData);
router.get("/list-process-id/:id" , pdfDataController.dataByProcessId);
module.exports = router;
