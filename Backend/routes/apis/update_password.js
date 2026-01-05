const express = require("express");
const router = express.Router();
const bcryptjs = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const {upload} = require('../../middleware/uploadImage');
const ResetPasswordForm = path.join(__dirname, "../../html/", "resetPasswordForm.html");
const InvalidMessage = path.join(__dirname, "../../html/", "InvalidMessage.html");
const accountModel = require("../../models/accountModel");
const userModel = require('../../models/userModel');
const { getCurrentDateTime, decryptData,isEmailValid,sendResetEmail } = require("../../utils/repetedUsedFunction");
const jwt = require('jsonwebtoken');
const secretKey = 'sdlfklfas6df5sd4fsdf5';
const verifyJWT = require("../../middleware/verifyJWT");

// Function to generate a JWT token with an expiry time
function generateToken(email,user_id) {
  return jwt.sign({ email,user_id}, secretKey, { expiresIn: '5m' }); // Token expires in 1 hour
}

// Function to verify and decode the JWT token
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, secretKey);
    return decoded;
  } catch (err) {
    return null;
  }
}

function isSpecialCharacter(password) {
  // Check for at least one special character
  const specialCharacterRegex = /[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/;
  const hasSpecialCharacter = specialCharacterRegex.test(password);

  return hasSpecialCharacter
}
function isUpperCaseInPassword(password) {
  // Check for at least one UpperCase character
  const uppercaseRegex = /[A-Z]/;
  const hasUppercase = uppercaseRegex.test(password);
  return hasUppercase;
}

router.get('/forgot-password/:email', async (req,res,next) => {
  try{    
    const email = req.params?.email;
    if(!email){
      return res.status(400).json({
        success:false,
        message:"Required Param Missing!"
      })
    }
   
    if(!isEmailValid(email)){
      return res.status(400).json({
        success:false,
        message:"Please Enter Right Email Address!"
      })
    }

    console.log(email);
    var isRec = await userModel.findOne({email_address:email});
    if(!isRec){
      return res.status(400).json({
        success:false,
        message:"Wrong Email Address!"
      })
    }

    var user_id = isRec?.user_id;
    var name = isRec?.first_name;

      const resetToken = generateToken(email,user_id);
     var isSend = await sendResetEmail(email,name, resetToken);
      if(isSend){
        res.status(200).json({
          success:true,
          message:`Password reset link sent successfully to this email ${email}`
        })
      }else{
        throw new Error(`We Facing Some Techincal Issue, Please Try Some Time Later!`)
      }
     
    }
    catch(err){
        console.log('Error while Updating Password  :  ',err.message);
        next(err);
    }
    
})


// GET /reset-password/:token endpoint
router.get('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const decoded = verifyToken(token);
  var email = decoded?.email;
  if (email) {
      res.sendFile(ResetPasswordForm);
  } else {
    res.sendFile(InvalidMessage);
  }
});

// POST /reset-password/:token endpoint
router.post('/reset-password-set/:token', upload.none(), async (req, res) => {
  const { token } = req.params;
  console.log(token);
  const decoded = verifyToken(token);
  console.log(decoded);
  var email = decoded?.email;
  var user_id = decoded?.user_id;
  const { password } = req.body;

  if(!password){
  return res.status(500).json({
      success:false,
      message:"Password Missing.!"
    })
  }

if(!user_id){
 return res.status(500).json({
    success:false,
    message:"Unable to reset password. Please try again.!"
  })
}

  // To validate password length
  
  if (password?.length < 8) {
    return res.status(422).json({
      success: false,
      message: "Password must be 8 charactors!",
    });
  }
  // SPECIAL CHARACTER CONTAIN OR NOT 
  if (!isSpecialCharacter(password)) {
    return res.status(422).json({
      success: false,
      message: "Password must contain atleast one Special Character!",
    });
  }
  // Uppercase CHARACTER CONTAIN OR NOT 
  if (!isUpperCaseInPassword(password)) {
    return res.status(422).json({
      success: false,
      message: "Password must contain atleast one UpperCase Character!",
    });
  }

// This Code Encrypt the user password
var hashedPassword = await bcryptjs.hash(password, 10);
console.log(hashedPassword);
var updResult =  await accountModel.findOneAndUpdate({user_id:user_id},{password:hashedPassword})
console.log(updResult);
  if (updResult) {
    res.status(200).json({
      success:true,
      message:"Password Reset Successfully!"
    })
  } else {
    res.status(500).json({
      success:false,
      message:"Unable to reset password. Please try again.!"
    })
  }
});

router.use(verifyJWT);
router.post('/update-password',  async (req, res, next) => {
try{    


  var requiredFields = [
    "user_id",
    "old_password",
    "new_password",
  ];

  for (const field of requiredFields) {
    if (!Object.keys(req.body).includes(field)) {
      return res.status(422).json({
        success: false,
        message: `Required field "${field}"  Missing!`,
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


var {user_id,old_password,new_password} = req.body;

if(
    !user_id ||
    !old_password ||
    !new_password
){
    return res.status(400).json({
        success:false,
        message:"Required Fields Missing!"
    })
}

// Find that user in demandey account for verification
var accoundDetails = await accountModel.findOne({user_id:user_id})
if (!accoundDetails) {
  return res.json({
    success: false,
    message: "Invalid credentials!",
  });
}

// verify  user input password to store hashedpassword from database

const isMatch = await bcryptjs.compare(old_password, accoundDetails?.password);

if (!isMatch) {
  return res.json({
    success: false,
    message: "Invalid credentials!",
  });
}

// To validate password length
if (new_password.length < 8) {
    return res.status(422).json({
      success: false,
      message: "Password length minimum  8 Characters",
    });
  }


  // This Code Encrypt the user password
  var hashedPassword = await bcryptjs.hash(new_password, 10);

 var updResult =  await accountModel.findOneAndUpdate({user_id:user_id},{password:hashedPassword})

 if(updResult){
    return res.status(200).json({
        success:true,
        message:"Password Updated Successfully!"
    })
 }else{
throw new Error('Something Went Wrong While Updating Password!');
 }
}
catch(err){
    console.log('Error while Updating Password  :  ',err.message);
    next(err);
}

})


router.get("/check-active-account-status" , async (req,res,next) => {
  try{

    const user_id = req.user_id;

    const user = await userModel.findOne({user_id:user_id});

    res.status(200).json({
      success:true,
      message:"User Account Active Status Fetched Successfully!",
      blocked : user?.blocked
    })

  }catch(err){
    console.log("Error While Getting Account Active Status For User");
    next(err);
  }
})


module.exports = router;