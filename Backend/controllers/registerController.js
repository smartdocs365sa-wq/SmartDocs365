// ============================================
// FILE: Backend/controllers/registerController.js
// ✅ UPDATED: Added Contact Us using existing Zoho Queue
// ============================================

const userModel = require("../models/userModel");
const bcryptjs = require("bcryptjs");
const accountModel = require("../models/accountModel");
const rechargeInfoModel = require("../models/rechargeInfoModel");
const subcriptionTypesModel = require("../models/subcriptionTypesModel.js");
const pdfDetailsModel = require("../models/pdfDetailsModel.js");
const userSubcriptionInfoModel = require("../models/userSubcriptionInfoModel.js"); 
const { v4 } = require("uuid");

// ✅ IMPORT sendEmailQueued HERE
const {
  getCurrentDateTime,
  namingValidation,
  addDaysToCurrentDate,
  isEmailValid,
  getOffset,
  sendWelcomeMail,
  sendOtpCode,
  encryptData,
  sendEmailQueued // <--- This will now work because of the fix above
} = require("../utils/repetedUsedFunction");

// ⚠️ IMPORTANT: Ensure this ID matches the 'Free Trial' plan in your Database
const FREE_TRIAL_PLAN_ID = "1a38214d-3a3c-4584-8980-734ebbc3a20d";

// ✅ USER REGISTRATION WITH AUTO FREE TRIAL
const create = async (req, res, next) => {
  var requiredFields = [
    "first_name",
    "last_name",
    "email_address",
    "password",
    "mobile",
  ];

  for (const field of requiredFields) {
    if (!Object.keys(req.body).includes(field)) {
      return res.status(422).json({
        success: false,
        message: `Required field "${field}" Missing!`,
      });
    }
  }

  let { first_name, last_name, email_address, password, mobile } = req.body;

  // Trim and Validate
  first_name = first_name?.trim();
  last_name = last_name?.trim();
  email_address = email_address?.trim();
  password = password?.trim();
  mobile = mobile?.trim();

  if (first_name.length > 32 || last_name.length > 32) {
    return res.status(422).json({ success: false, message: "Name length too long!" });
  }

  if (!namingValidation(first_name + " " + last_name)) {
    return res.status(422).json({ success: false, message: "Name must contain only alphabets" });
  }

  if (!isEmailValid(email_address)) {
    return res.status(422).json({ success: false, message: "Invalid Email format!" });
  }

  if (password.length < 8) {
    return res.status(422).json({ success: false, message: "Password must be at least 8 characters" });
  }

  // Check Duplicate
  try {
    let duplicateEmail = await userModel.findOne({ email_address: email_address });
    if (duplicateEmail) {
      return res.status(422).json({ success: false, message: "Email ID Already Exists" });
    }
  } catch (error) {
    console.log(error.message);
  }

  // Encrypt Password
  var hashedPassword = await bcryptjs.hash(password, 10);
  var created_at = getCurrentDateTime().dateAndTimeString;
  var updated_at = getCurrentDateTime().dateAndTimeString;
  var user_id = v4();

  try {
    // 1. Create User
    let result = await userModel.create({
      first_name,
      last_name,
      email_address,
      user_id,
      mobile,
      plan_id: FREE_TRIAL_PLAN_ID,
      created_at,
      updated_at,
    });

    if (result) {
      // 2. Setup Free Trial Dates (e.g., 20 Days)
      const trialDuration = 20; // Match your Admin Panel setting
      var recharge_expiry_date = addDaysToCurrentDate(trialDuration);
      
      // 3. Create Recharge History (Payment Status: True)
      await rechargeInfoModel.create({
        recharge_id: v4(),
        user_id,
        order_id: v4(),
        plan_id: FREE_TRIAL_PLAN_ID,
        is_active: true,
        payment_status: true, // Auto-approved
        created_at: getCurrentDateTime().dateAndTimeString,
        recharge_expiry_date,
        FullName: `${first_name} ${last_name}`,
        Email_ID: email_address,
        Mobile_Number: mobile,
        Amount: 0
      });

      // 4. ✅ CRITICAL ADDITION: Create Active Subscription Entry
      // This ensures the dashboard sees the user as "Active" immediately
      const now = new Date();
      const expiryDate = new Date();
      expiryDate.setDate(now.getDate() + trialDuration);

      await userSubcriptionInfoModel.create({
        user_id,
        plan_id: FREE_TRIAL_PLAN_ID,
        start_date: now,
        expiry_date: expiryDate,
        pdf_limit: 15, // Match your Admin Panel limit
        is_active: true
      });

      // 5. Create Account Login
      await accountModel.create({
        user_id: user_id,
        password: hashedPassword,
        role: "user"
      });

      // 6. Send Email
      sendWelcomeMail(email_address, first_name);

      res.status(201).json({
        success: true,
        message: `Registration Successful! Free Trial Activated.`,
      });
    } else {
      throw new Error("User creation failed.");
    }
  } catch (err) {
    console.log(err.message);
    next(err);
  }
};

// For Admin - Get User List
const userList = async (req, res, next) => {
  try {
    if (req.role != "admin" && req.role != "super-admin") {
      return res.status(400).json({
        status: false,
        message: "You Do Not Have Access To Use This Api!",
      });
    }
    const offset = getOffset(req?.query?.page, req?.query?.listPerPage);
    const limit = req?.query?.listPerPage || 0;

    let list = await accountModel.aggregate([
      {
        $match: { role: 'user' }
      },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "user_id",
          as: "userInfo",
        },
      },
      {
        $unwind: "$userInfo",
      },
      {
        $lookup: {
          from: "recharge-infos",
          localField: "user_id",
          foreignField: "user_id",
          as: "RechargeInfoFull",
        },
      },
      {
        $addFields: {
          password: "$userInfo.role",
          first_name: "$userInfo.first_name",
          last_name: "$userInfo.last_name",
          email_address: "$userInfo.email_address",
          plan_id: "$userInfo.plan_id",
          mobile: "$userInfo.mobile",
          user_id: "$userInfo.user_id",
          blocked: "$userInfo.blocked",
          created_at: "$userInfo.created_at",
          updated_at: "$userInfo.updated_at",
          full_name: "$userInfo.full_name",
          pdfInfo: "$pdfInfo",
          RechargeInfo: "$RechargeInfo",
          RechargeInfoFull: "$RechargeInfoFull",
          planInfo: "$planInfo",
          notification: "$notification",
        }
      },
      {
        $lookup: {
          from: "pdf-details",
          localField: "user_id",
          foreignField: "user_id",
          as: "pdfInfo",
        },
      },
      {
        $lookup: {
          from: "recharge-infos",
          let: { user_id: "$user_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$user_id", "$$user_id"] },
                    { $eq: ["$is_active", true] },
                  ],
                },
              },
            },
          ],
          as: "RechargeInfo",
        },
      },
      {
        $unwind: {
          path: "$RechargeInfo",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "subscription-plans",
          localField: "RechargeInfo.plan_id",
          foreignField: "plan_id",
          as: "planInfo",
        },
      },
      {
        $unwind: {
          path: "$planInfo",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "notifications",
          localField: "user_id",
          foreignField: "user_id",
          as: "notification",
        },
      },
      {
        $project: {
          userInfo: 0
        }
      }
    ]);

    const seenIds = new Set();
    var uniqueListWithSet = list.filter(item => {
      const key = item?.user_id;
      if (!seenIds.has(key)) {
        seenIds.add(key);
        return true;
      }
      return false;
    });

    var count = uniqueListWithSet?.length;
    uniqueListWithSet?.reverse();
    var end = +offset + +limit;
    uniqueListWithSet = uniqueListWithSet.slice(offset, end);

    res.status(200).json({
      success: true,
      message: "users List Fetched Successfully!",
      result: count,
      data: uniqueListWithSet,
    });
  } catch (err) {
    console.log(err.message);
    next(err);
  }
};

// For Super Admin Only - Get Admin List
const adminList = async (req, res, next) => {
  try {
    if (req.role != "super-admin") {
      return res.status(400).json({
        status: false,
        message: "You Do Not Have Access To Use This Api!",
      });
    }
    const offset = getOffset(req?.query?.page, req?.query?.listPerPage);
    const limit = req?.query?.listPerPage || 0;

    var list = await accountModel.aggregate([
      {
        $match: { role: 'admin' }
      },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "user_id",
          as: "adminList"
        }
      },
      {
        $unwind: "$adminList"
      },
      {
        $skip: offset,
      },
      {
        $limit: +limit,
      },
      {
        $project: {
          _id: "$adminList._id",
          first_name: "$adminList.first_name",
          last_name: "$adminList.last_name",
          email_address: "$adminList.email_address",
          mobile: "$adminList.mobile",
          user_id: "$adminList.user_id",
          created_at: "$adminList.created_at",
          updated_at: "$adminList.updated_at",
          full_name: "$adminList.full_name"
        }
      },
      {
        $replaceRoot: { newRoot: "$$ROOT" }
      }
    ]);

    res.status(200).json({
      success: true,
      message: "Admin List Fetched Successfully",
      list: list
    })

  } catch (err) {
    console.log("Error When getting User List", err.message);
    next(err);
  }
}

// For Super Admin Only - Create Admin
const createAdmin = async (req, res, next) => {
  if (req.role != "admin" && req.role != "super-admin") {
    return res.status(400).json({
      status: false,
      message: "You Do Not Have Access To Use This Api!",
    });
  }

  var requiredFields = [
    "first_name",
    "last_name",
    "email_address",
    "password",
    "mobile",
  ];

  for (const field of requiredFields) {
    if (!Object.keys(req.body).includes(field)) {
      return res.status(422).json({
        success: false,
        message: `Required field "${field}"  Missing!`,
      });
    }
  }

  let { first_name, last_name, email_address, password, mobile } = req.body;

  for (const field of Object.keys(req.body)) {
    if (!field) {
      return res.status(422).json({
        success: false,
        message: `${field} Not Be Empty!`,
      });
    }
  }

  first_name = first_name?.trim();
  last_name = last_name?.trim();
  email_address = email_address?.trim();
  password = password?.trim();
  mobile = mobile?.trim();

  if (first_name.length > 32 || last_name.length > 32) {
    return res.status(422).json({
      success: false,
      message: "user name length should be less than 31 !",
    });
  }

  if (!namingValidation(first_name + " " + last_name)) {
    return res.status(422).json({
      success: false,
      message: "Name Contain Only Alphabets",
    });
  }

  if (!isEmailValid(email_address)) {
    return res.status(422).json({
      success: false,
      message: "Wrong Email Id!",
    });
  }

  if (password.length < 8) {
    return res.status(422).json({
      success: false,
      message: "Password length should be at least 8 Characters",
    });
  }

  try {
    let duplicateEmail = await userModel.findOne({ email_address: email_address });
    if (duplicateEmail) {
      return res.status(422).json({
        success: false,
        message: "Email ID Already Exist's",
      });
    }
  } catch (error) {
    console.log(error.message);
  }

  var hashedPassword = await bcryptjs.hash(password, 10);
  var created_at = getCurrentDateTime().dateAndTimeString;
  var updated_at = getCurrentDateTime().dateAndTimeString;
  var user_id = v4();

  try {
    let result = await userModel.create({
      first_name,
      last_name,
      email_address,
      user_id,
      mobile,
      created_at,
      updated_at,
    });

    var recharge_expiry_date = addDaysToCurrentDate(365); // 1 year for admin

    var rechargePayload = {
      recharge_id: v4(),
      user_id,
      order_id: v4(),
      plan_id: FREE_TRIAL_PLAN_ID,
      is_active: true,
      payment_status: true,
      created_at: getCurrentDateTime().dateAndTimeString,
      recharge_expiry_date,
    };

    if (result) {
      await rechargeInfoModel.create(rechargePayload);

      await accountModel.create({
        user_id: user_id,
        role: "admin",
        password: hashedPassword,
      });
      sendWelcomeMail(email_address, first_name);
      res.status(201).json({
        success: true,
        message: `Admin Registration Successfully!`,
      });
    } else {
      throw new Error("Something Went Wrong!");
    }
  } catch (err) {
    console.log(err.message);
    next(err);
  }
};

const deleteAdmin = async (req, res, next) => {
  try {
    if (req.role != "super-admin") {
      return res.status(400).json({
        status: false,
        message: "You Do Not Have Access To Use This Api!",
      });
    }

    var requiredFields = [
      "user_id"
    ];

    for (const field of requiredFields) {
      if (!Object.keys(req.body).includes(field)) {
        return res.status(422).json({
          success: false,
          message: `Required field "${field}"  Missing!`,
        });
      }
    }

    let { user_id, Status } = req.body;

    await userModel.findOneAndDelete({ user_id });
    await accountModel.findOneAndDelete({ user_id });

    res.status(200).json({
      success: true,
      message: "Admin Deleted Successfully"
    })

  } catch (err) {
    next(err);
  }
}

const blockUser = async (req, res, next) => {
  try {
    if (req.role != "admin" && req.role != "super-admin") {
      return res.status(400).json({
        status: false,
        message: "You Do Not Have Access To Use This Api!",
      });
    }

    var requiredFields = [
      "user_id",
      "Status",
    ];

    for (const field of requiredFields) {
      if (!Object.keys(req.body).includes(field)) {
        return res.status(422).json({
          success: false,
          message: `Required field "${field}"  Missing!`,
        });
      }
    }

    let { user_id, Status } = req.body;

    await userModel.findOneAndUpdate({ user_id }, {
      blocked: Status
    });

    if (Status) {
      res.status(200).json({
        success: true,
        message: "User Blocked Successfully!"
      })
    } else {
      res.status(200).json({
        success: true,
        message: "User Un-Blocked Successfully!"
      })
    }

  } catch (err) {
    next(err);
  }
}

// ✅ GET USER DETAIL WITH SUBSCRIPTION INFO
const getUserDetail = async (req, res, next) => {
  try {
    const user_id = req?.user_id;

    if (!user_id) {
      return res.status(401).json({
        success: false,
        message: "user_id  Missing!",
      });
    }

    var user = await userModel.findOne({ user_id });

    var rechargeInfos = await rechargeInfoModel.find({ user_id, is_active: true, payment_status: true });
    var currentPlanID = rechargeInfos[rechargeInfos?.length - 1]?.plan_id;
    var isRechargeActive = false;
    var pdfCount = 0;
    var totalLimit = 0;
    var planName = "";
    var planPrice = "";
    var rechargeDate;
    var rechargeExpiredDate;

    let latestExpiryDate = new Date(0);

    for (var i = 0; i < rechargeInfos.length; i++) {
      var recharge_id = rechargeInfos[i]?.recharge_id;
      var plan_id = rechargeInfos[i]?.plan_id;
      var planInfo = await subcriptionTypesModel.findOne({ plan_id });
      if (planInfo) {
        totalLimit = totalLimit + planInfo?.pdf_limit;
      }
      
      var pdfDataForThisRechargeId = await pdfDetailsModel.find({ recharge_id });
      pdfCount = pdfCount + pdfDataForThisRechargeId.length;
      isRechargeActive = true;
      if (isRechargeActive && planInfo) {
        planName = planName + "    " + planInfo?.plan_name;
        planPrice = planInfo?.plan_price;
        var targetExpiryDate = new Date(rechargeInfos[i]?.recharge_expiry_date);

        if (targetExpiryDate > latestExpiryDate) {
          latestExpiryDate = targetExpiryDate;
          rechargeExpiredDate = rechargeInfos[i]?.recharge_expiry_date;
        }
      }
    }

    if (user) {
      res.status(200).json({
        success: true,
        message: "user Detail Fetched Successfully!",
        data: user,
        currentPlanID,
        other: {
          totalPdfLimit: totalLimit,
          usedLimit: pdfCount,
          leftLimit: +totalLimit - +pdfCount,
          planName,
          planPrice,
          rechargeDate,
          rechargeExpiredDate
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: "No User Found For This user_id!",
      });
    }
  } catch (err) {
    console.log(err.message);
    res.status(500).json({
      success: false,
      message:
        "Error while getting Consumer Instance by user_id " + err.message,
    });
  }
};

const getUserSubcription = async (req, res, next) => {
  try {
    const user_id = req?.params?.userId;

    if (!user_id) {
      return res.status(401).json({
        success: false,
        message: "user_id  Missing!",
      });
    }

    var rechargeInfos = await rechargeInfoModel.find({ user_id, is_active: true, payment_status: true });

    var isRechargeActive = false;
    var pdfCount = 0;
    var totalLimit = 0;
    var planName = "";
    var planPrice = "";
    var rechargeDate;
    var rechargeExpiredDate;
    var planInfo;
    let latestExpiryDate = new Date(0);

    for (var i = 0; i < rechargeInfos.length; i++) {
      var recharge_id = rechargeInfos[i]?.recharge_id;
      var plan_id = rechargeInfos[i]?.plan_id;
      planInfo = await subcriptionTypesModel.findOne({ plan_id });
      if (planInfo) {
          totalLimit = totalLimit + planInfo?.pdf_limit;
      }
      var pdfDataForThisRechargeId = await pdfDetailsModel.find({ recharge_id });
      pdfCount = pdfCount + pdfDataForThisRechargeId.length;
      isRechargeActive = true;
      if (isRechargeActive && planInfo) {
        planName = planName + "    " + planInfo?.plan_name;
        planPrice = planInfo?.plan_price;
        rechargeDate = rechargeInfos[i]?.created_at;

        var targetExpiryDate = new Date(rechargeInfos[i]?.recharge_expiry_date);

        if (targetExpiryDate > latestExpiryDate) {
          latestExpiryDate = targetExpiryDate;
          rechargeExpiredDate = rechargeInfos[i]?.recharge_expiry_date;
        }
      }
    }

    res.status(200).json({
      success: true,
      message: "user Subcription Info Fetched Successfully!",
      data: {
        totalPdfLimit: totalLimit,
        usedLimit: pdfCount,
        leftLimit: +totalLimit - +pdfCount,
        planName,
        planPrice,
        LatestplanName: planName[0],
        rechargeDate,
        rechargeExpiredDate,
        planInfo
      }
    });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({
      success: false,
      message:
        "Error while getting Consumer Instance by user_id " + err.message,
    });
  }
};

const updateProfile = async (req, res) => {
  var user_id = req?.params?.uuid;
  if (!user_id) {
    return res.status(401).json({
      success: false,
      message: "user id missing!",
    });
  }

  var requiredFields = ["first_name", "last_name", "email_address", "mobile"];
  for (const field of requiredFields) {
    if (!Object.keys(req.body).includes(field)) {
      return res.status(422).json({
        success: false,
        message: `Required field(s) ${field} are Missing!`,
      });
    }
  }

  for (const field of Object.keys(req.body)) {
    if (!field) {
      return res.status(422).json({
        success: false,
        message: `${field} Not Be Empty!`,
      });
    }
  }

  let { first_name, last_name, email_address, mobile } = req.body;

  first_name = first_name.trim();
  last_name = last_name.trim();
  email = email_address.trim();
  mobile = mobile.trim();

  if (first_name.length > 32 || last_name.length > 32) {
    return res.status(422).json({
      success: false,
      message: "user name length should be less than 31 !",
    });
  }

  if (!namingValidation(first_name + " " + last_name)) {
    return res.status(422).json({
      success: false,
      message: "Name Contain Only Alphabets",
    });
  }

  if (!isEmailValid(email_address)) {
    return res.status(422).json({
      success: false,
      message: "Wrong Email Id!",
    });
  }

  try {
    let duplicateEmail = await userModel.findOne({ email_address: email_address });
    if (duplicateEmail) {
      if (duplicateEmail?.user_id != user_id) {
        return res.status(422).json({
          success: false,
          message: "Email ID Already Exist's",
        });
      }
    }
  } catch (error) {
    console.log(error.message);
  }

  try {
    var updated_at = getCurrentDateTime().dateAndTimeString;
    let result = await userModel.findOneAndUpdate(
      { user_id },
      {
        first_name,
        last_name,
        email_address,
        mobile,
        updated_at,
      }
    );

    if (result) {
      res.status(201).json({
        success: true,
        message: `User Updated Successfully!`,
      });
    } else {
      throw new Error("Something Went Wrong while updating user detail!");
    }
  } catch (err) {
    console.log(err.message);
    next(err);
  }
};

const sendOtp = async (req, res, next) => {
  try {
    var email = req?.params?.email;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email Not Found!",
      });
    }

    if (!isEmailValid(email)) {
      return res.status(422).json({
        success: false,
        message: "Wrong Email Id!",
      });
    }

    try {
      let duplicateEmail = await userModel.findOne({ email_address: email });
      if (duplicateEmail) {
        return res.status(422).json({
          success: false,
          message: "Email ID Already Exist's",
        });
      }
    } catch (error) {
      console.log(error.message);
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000);
    sendOtpCode(email, otpCode);
    var otp = encryptData(otpCode);
    res.status(201).json({
      success: true,
      message: "OTP Sent Successfully",
      otp: otpCode,
      otpCode: otp,
    });
  } catch (err) {
    console.log(err.message);
    res.status(500).json({
      success: false,
      message: "Facing Some Technical Error!",
    });
  }
};

// ✅ NEW CONTACT US FUNCTION (Uses existing queue)
const contactUs = async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validation
    if (!name || !email || !subject || !message) {
      return res.status(422).json({ 
        success: false, 
        message: "All fields are required!" 
      });
    }

    const supportEmail = process.env.EMAIL_USER || "Support@smartdocs365.com";

    // Use existing sendEmailQueued function
    await sendEmailQueued({
      to: supportEmail,
      replyTo: email, 
      subject: `[Contact Form] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #2563eb;">New Contact Message</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <h3 style="color: #4b5563;">Message:</h3>
          <p style="background-color: #f9fafb; padding: 15px; border-radius: 8px; white-space: pre-wrap;">${message}</p>
        </div>
      `,
    });

    res.status(200).json({ 
      success: true, 
      message: "Message sent successfully! We will contact you soon." 
    });

  } catch (error) {
    console.error("Contact Us Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to send message. Please try again later." 
    });
  }
};

module.exports = {
  create,
  userList,
  adminList,
  getUserDetail,
  updateProfile,
  sendOtp,
  createAdmin,
  blockUser,
  getUserSubcription,
  deleteAdmin,
  contactUs // ✅ Exported
};