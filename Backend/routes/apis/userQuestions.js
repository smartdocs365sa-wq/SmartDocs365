const userQuestionsModel = require('../../models/userQuestionsModel');
const { v4 } = require("uuid");
const express = require("express");
const router = express.Router();
const {
  getCurrentDateTime,
  namingValidation,
  addDaysToCurrentDate,
  isEmailValid,
  getOffset,
  sendMailToSupportMail
} = require("../../utils/repetedUsedFunction");
const {upload} = require('../../middleware/uploadImage');

 router.post("/add" , upload.single('file'),  async (req, res, next) => {
  var requiredFields = [
    "full_name",
    "email_address",
    "mobile",
    "description",
  ];

  for (const field of requiredFields) {
    if (!Object.keys(req.body).includes(field)) {
      return res.status(422).json({
        success: false,
        message: `Required field "${field}"  Missing!`,
      });
    }
  }

  let { full_name, email_address, description, mobile } = req.body;

  for (const field of Object.keys(req.body)) {
    if (!field) {
      return res.status(422).json({
        success: false,
        message: `${field} Not Be Empty!`,
      });
    }
  }

  // trim all white spaces
  full_name = full_name?.trim();
  description = description?.trim();
  email = email_address?.trim();
  mobile = mobile?.trim();

  //validate user name  length less than 32
  if (full_name.length > 40) {
    return res.status(422).json({
      success: false,
      message: "name length should be less than 39 !",
    });
  }

  if (!namingValidation(full_name)) {
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

  
  // Generate CurrentDate And Time
  var created_at = getCurrentDateTime().dateAndTimeString;
  var completed_at = getCurrentDateTime().dateAndTimeString;
  var user_id = req?.user_id;
 user_id =  (user_id == null || user_id == undefined) ? "Without Login" : user_id;
  var query_id = v4();
  var file_path = req?.file?.path;
  var file_name = req?.file?.originalname;
  try {


    const payload = {
      query_id,
      full_name,
      email_address,
      user_id,
      mobile,
      description,
      file_name,
      file_path,
      created_at,
      completed_at
    }

    try{
    await sendMailToSupportMail(payload);
    }catch(err){
      console.log("Error When Send User Query To Mail :", err.message);
    }

    let result = await userQuestionsModel.create(payload);

      res.status(201).json({
        success: true,
        message: `We look forward to connecting with you shortly.`,
      });

  } catch (err) {
    console.log(err.message);
    next(err);
  }
});

// For Admin
router.get("/list", async (req, res,next) => {
  try {

    if(req.role != "admin" && req.role != "super-admin"){
      return res.status(400).json({
        status:false,
        message:"You Do Not Have Access To Use This Api!"
      })
    }

    const offset = getOffset(req?.query?.page, req?.query?.listPerPage);
    const limit = req?.query?.listPerPage || 0;

    // Calculate 15 days ago
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
  
    const query = {
      completed_at: {
        $gt: fifteenDaysAgo, 
      },
      status:3
    };

    // await userQuestionsModel.deleteMany({query});
    
    let list;
    if(limit){
       list = await userQuestionsModel.find().skip(offset).limit(limit).exec();
    }else{
        list = await userQuestionsModel.find();
    }
    console.log(list);
    list.reverse();

    res.status(200).json({
      success: true,
      message: "Users Questions List Fetched Successfully!",
      data: list,
    });
  } catch (err) {
    console.log(err.message);
    next(err);
  }
});

router.put("/query/status",async (req, res,next) => {
  try{

    if(req.role != "admin" && req.role != "super-admin"){
      return res.status(400).json({
        status:false,
        message:"You Do Not Have Access To Use This Api!"
      })
    }

    var requiredFields = [
      "query_id",
      "status",
    ];
  
    for (const field of requiredFields) {
      if (!Object.keys(req.body).includes(field)) {
        return res.status(422).json({
          success: false,
          message: `Required field "${field}"  Missing!`,
        });
      }
    }
  
    let { query_id, status} = req.body;


    var isCompleted = await userQuestionsModel.findOne({query_id});
    if(isCompleted?.status == "3"){
      return res.status(403).json({
        success:false,
        message:"It's Completed , Now You Can't Change It Again!"
      })
    }

    if(status == "3"){
    await userQuestionsModel.findOneAndUpdate({query_id},{
      status,
      completed_at:new Date()
        })}else{
      await userQuestionsModel.findOneAndUpdate({query_id},{
        status
      })
    }
  
  
    res.status(200).json({
      success:true,
      message:"Status Changed Successfully"
    })

  }catch(err){
    console.log(err.message);
    next(err);
  }
})


module.exports = router;