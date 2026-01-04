const multer = require("multer");
const path = require("path");

// Set storage engine for Product Images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    // ✅ FIX: Clean the filename by removing special characters and spaces
    const cleanOriginalName = file.originalname
      .replace(/\s+/g, '_')  // Replace spaces with underscores
      .replace(/[()]/g, '')  // Remove parentheses
      .replace(/[^\w\s.-]/g, ''); // Remove other special chars except . - _
    
    const timestamp = Date.now();
    const finalFilename = `${timestamp}-${cleanOriginalName}`;
    
    console.log("📁 Multer filename generation:");
    console.log("   Original:", file.originalname);
    console.log("   Cleaned:", cleanOriginalName);
    console.log("   Final:", finalFilename);
    
    cb(null, finalFilename);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024 * 1024 * 1024 , // 5 MB file size limit
  },
  fileFilter: function (req, file, cb) {
    // Check if file is a PDF or image (you can add more image MIME types)
    if (
      file.mimetype === "application/pdf" ||
      file.mimetype.startsWith("image/")
    ) {
      // Set the type property in req based on file type
      req.type = file.mimetype.startsWith("image/") ? "image" : "pdf";
      cb(null, true);
    } else {
      // Reject other file types
      cb(new Error("File type not supported"));
    }
  },
});

module.exports = { upload };