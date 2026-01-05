// ============================================
// FILE: Backend/app.js
// ✅ FIXED: Static file serving for Images & PDFs
// ============================================

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const cron = require("node-cron");
const fs = require("fs");
const importExcelDataRoute = require('./routes/apis/importExcelData');

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

// ============================================
// MIDDLEWARE ORDER IS IMPORTANT
// ============================================

app.use(credentials);
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

// ✅ FIXED: Serve static files correctly
// This tells the server: "If someone asks for /uploads, look in the uploads folder"
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "/public")));

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
// Run every day at 9 AM to check for expiring subscriptions
cron.schedule("0 9 * * *", () => {
  console.log("🔔 Running daily subscription expiry check at 9 AM...");
  checkExpiringSubscriptions();
});

// Also run on server start (for testing)
console.log("🚀 Running initial subscription check...");
checkExpiringSubscriptions();

app.listen(PORT, () => {
  console.log("✅ App is listening on port", PORT);
  console.log("✅ Subscription expiry notifications enabled");
});