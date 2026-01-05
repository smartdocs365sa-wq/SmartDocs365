// ============================================
// FILE: Backend/app.js
// ✅ FIXED: Added PUBLIC Blog Route (Line 45-56)
// ============================================

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const cron = require("node-cron");
const fs = require("fs");
const importExcelDataRoute = require('./routes/apis/importExcelData');

// ✅ IMPORT BLOG MODEL (Required for public access)
const Blog = require('./models/blogModel'); 

// importing middlewares
const allowedOrigins = require("./config/allowedOrigins");
const credentials = require("./middleware/credentials");
const errorHandler = require("./errorHandler");
const verifyJWT = require('./middleware/verifyJWT');

// ✅ Import subscription cron
const { checkExpiringSubscriptions } = require("./subscriptionCron");

// app setup
const app = express();
const PORT = process.env.PORT || 3033;

// Configure CORS options
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log("Blocked by CORS:", origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200,
  credentials: true
};

app.use(credentials);
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "/public")));
// Serve uploads folder publicly
app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

// ============================================
// ✅ NEW PUBLIC ROUTE: Get All Blogs (No Login Required)
// ============================================
app.get('/api/public/blogs', async (req, res) => {
  try {
    // Fetch ALL blogs, sorted by newest first
    const blogs = await Blog.find({}).sort({ created_at: -1 });
    res.json({ success: true, data: blogs });
  } catch (error) {
    console.error("Public Blog Fetch Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch blogs" });
  }
});

// ============================================
// ROUTES
// ============================================

app.use("/api", require("./routes/handler"));
app.use('/import-excel-data', importExcelDataRoute);

// handling error pages
app.use(errorHandler);

// Database connection
require("./middleware/db");

// ✅ START SUBSCRIPTION CRON JOB
cron.schedule("0 9 * * *", () => {
  console.log("🔔 Running daily subscription expiry check at 9 AM...");
  checkExpiringSubscriptions();
});

console.log("🚀 Running initial subscription check...");
checkExpiringSubscriptions();

app.listen(PORT, () => {
  console.log("✅ App is listening on port", PORT);
  console.log("✅ Public Blog Route is Active at /api/public/blogs");
});