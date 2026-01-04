const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
const Handlebars = require('handlebars');
const welcomeMessageFile = path.join(__dirname, "../html/", "welcomeEmail.html");
const ResetPasswordMail = path.join(__dirname, "../html/", "ResetPasswordMail.html");
const sendOtpFile = path.join(__dirname, "../html/", "otpMail.html");
const expiryMailFile = path.join(__dirname, "../html/", "expiryMail.html");
const expiryPolicyMailFile = path.join(__dirname, "../html/", "policyExpireMail.html");
const crypto = require('crypto');
const secretKey = process.env.SECRET_KEY;
const algorithm = 'aes-256-cbc';
const baseUrl = "https://api.smartdocs365.com/api/"


const transporter = nodemailer.createTransport({
  host: 'mail.smartdocs365.com',
  port: 465,
  secure: true, // Use SSL/TLS
  auth: {
    user: 'do-not-reply@smartdocs365.com',
    pass: 't4dP4*xZ3',
  },
  tls: {
    // Avoid setting rejectUnauthorized to false in production
    // Instead, ensure your server's SSL certificate is properly configured
    rejectUnauthorized: false,
  },
  connectionTimeout: 1000000, // Increase connection timeout if needed
  timeout: 150000, // Increase overall timeout if needed
});



function sendWelcomeMail(email, name) {

  fs.readFile(welcomeMessageFile, "utf8", (err, template) => {
    if (err) {
      console.error(err);
      return;
    }

    // Replace the placeholder with dynamic data
    const renderedTemplate = template.replace("{{{ name }}}", name);

    // Email data
    const mailOptions = {
      from: "do-not-reply@smartdocs365.com",
      to: email,
      subject: "Welcome to SmartDocs365 Software!",
      html: renderedTemplate,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
      } else {
        console.log("Email sent:", info.response);
      }
    });
  });
}

// expiredMail("kapilpatidar991@gmail.com","kapil","01/05/2024")

function expiredMail(email, name, date) {
  // Read the contents of the HTML email template
     const templateData = fs.readFileSync(expiryMailFile, 'utf8');

     // Create a Handlebars template function
     const template = Handlebars.compile(templateData);
 
     // Replace the placeholders with dynamic data
     const renderedTemplate = template({ name, date });

    // Email data
    const mailOptions = {
      from: "do-not-reply@smartdocs365.com",
      to: email,
      subject: "Jump back in to SmartDocs365 to keep your subscription",
      html: renderedTemplate,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
      } else {
        console.log("Email sent:", info.response);
      }
    });
};

// expiredPolicyMail("vishnupatidar94@gmail.com","Kapil Patidar", "28/05/2024","TESTING123")
function expiredPolicyMail(email, name ,date,number,days) {

console.log(days , "  :  ", email , " :" , name , date);
  const templateData = fs.readFileSync(expiryPolicyMailFile, 'utf8');

  // Create a Handlebars template function
  const template = Handlebars.compile(templateData);

  // Replace the placeholders with dynamic data
  const renderedTemplate = template({ name, number, date ,days});
    // Email data
    const mailOptions = {
      from: "do-not-reply@smartdocs365.com",
      to: email,
      subject: "Time to Renew Your Policy: Get Back to SmartDocs365.",
      html: renderedTemplate,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
      } else {
        console.log("Email sent:", info.response);
      }
    });
  }

function sendOtpCode(email, otpCode) {

  fs.readFile(sendOtpFile, "utf8", (err, template) => {
    if (err) {
      console.error(err);
      return;
    }

    // Replace the placeholder with dynamic data
    const renderedTemplate = template.replace("{{{ otpCode }}}", otpCode);

    // Email data
    const mailOptions = {
      from: "do-not-reply@smartdocs365.com",
      to: email,
      subject: "SmartDocs365 Registration: Your OTP for Verification",
      html: renderedTemplate,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
      } else {
        console.log("Email sent:", info.response);
      }
    });
  });
}

async function sendResetEmail(email, name, resetToken) {
  try {
    // Read the contents of the HTML email template
    const templateData = fs.readFileSync(ResetPasswordMail, 'utf8');

    // Create a Handlebars template function
    const template = Handlebars.compile(templateData);

    // Replace the placeholders with dynamic data
    const renderedTemplate = template({ name, resetToken ,baseUrl});

    // Email data
    const mailOptions = {
      from: 'do-not-reply@smartdocs365.com',
      to: email,
      subject: 'SmartDocs365 Reset Password Link!',
      html: renderedTemplate,
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
    
    return true; // Email sent successfully
  } catch (error) {
    console.error('Error sending email:', error);
    return false; // Email sending failed
  }
}

// This function give us modified date
function addDaysToCurrentDate(days) {
  const currentDate = new Date();

  // Calculate EST timezone offset (UTC - 5 hours for EST)
  const estOffset = -5 * 60 * 60 * 1000;

  // Adjust the current date to EST
  const estDate = new Date(currentDate.getTime() + estOffset);

  // Add days to the EST date
  estDate.setDate(estDate.getDate() + days);

  const year = estDate.getFullYear();
  const month = (estDate.getMonth() + 1).toString().padStart(2, '0');
  const day = estDate.getDate().toString().padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// this function generate current date and time with customize way
function getCurrentDateTime() {
  // Get current date in UTC
  const now = new Date();

  // Adjust the time to EST (UTC - 5 hours for EST)
  const estTime = new Date(now.getTime() - 5 * 60 * 60 * 1000);

  const year = estTime.getFullYear();
  const month = String(estTime.getMonth() + 1).padStart(2, "0");
  const day = String(estTime.getDate()).padStart(2, "0");
  const hours = String(estTime.getHours()).padStart(2, "0");
  const minutes = String(estTime.getMinutes()).padStart(2, "0");
  const seconds = String(estTime.getSeconds()).padStart(2, "0");

  const dateString = `${year}-${month}-${day}`;
  const timeString = `${hours}:${minutes}:${seconds}`;
  const dateAndTimeString = `${dateString} ${timeString}`;

  var dateTime = {
    dateString,
    timeString,
    dateAndTimeString,
  };
  return dateTime;
}


//To validate Name
function namingValidation(str) {
  const regex = /^[a-zA-Z\s]+$/;
  return regex.test(str);
}

//Validate Email Syntax
function isEmailValid(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

//This function use for pagination
function getOffset(currentPage = 1, listPerPage) {
  return (currentPage - 1) * [listPerPage];
}

function emptyOrRows(rows) {
  if (!rows) {
    return [];
  }
  return rows;
}

// Encrypts data (supports objects, arrays, and strings)
const encryptData = (data) => {
//   if(!data){
//     return null;
//   }
// return data;
console.log(data);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), iv);

  let inputData = data;
  if (typeof data !== 'string') {
    console.log("KAPIL");
    inputData = JSON.stringify(data);
  }

  let encryptedData = cipher.update(inputData, 'utf-8', 'hex');
  encryptedData += cipher.final('hex');

  return { iv: iv.toString('hex'), encryptedData };
};

// Decrypts the encrypted data
const decryptData = (data) => {

var {iv, encryptedData} = data;
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey), Buffer.from(iv, 'hex'));

  let decryptedData = decipher.update(encryptedData, 'hex', 'utf-8');
  decryptedData += decipher.final('utf-8');

  try {
    return JSON.parse(decryptedData);
  } catch (error) {
    // Return as string if JSON parsing fails (might be a simple string)
    return decryptedData;
  }
};

// This function validate US Zip code
function validateZIPCode(zipCode) {
  // Define a regular expression pattern for a 5-digit zip code
  const pattern = /^\d{5}$/;

  // Use the test method of the regular expression to check if the input matches the pattern
  return pattern.test(zipCode);
}


function deleteFile(filePath) {
  try {
    fs.unlinkSync(filePath); 
    console.log(`File deleted: ${filePath}`);
    return true; 
  } catch (err) {
    console.error(`Error deleting file: ${err.message}`);
    return false; 
  }
}

// Shipping Charges count 

function priceBreakDown (price,zip) {
  var zipCode = zip;
  if(!zipCode){
    zipCode = "23123";
  }
  var shippingCost,demandeyCharges,stateTax,processingFee;

  /**Shipping Code Calculated Based On ZipCode */
  var zipCode = zipCode+"";
  var value=zipCode.charAt(0);
  if(value=="0" || value=="1"){
    shippingCost = 30;
  }else if (value=="2" || value=="3"){
    shippingCost=40;
  }else if (value=="4" || value=="5"){
    shippingCost=50;
  }else if (value=="6" || value=="7"){
    shippingCost=60;
  }else if (value=="8" || value=="9"){
    shippingCost=70;
  }

/** End */

/* DemandeyCharges Calculated 7% on Base Price*/

demandeyCharges = +price * 7 / 100 ; 

/** End */

/** ProcessingFee Calculated 0.75% And Per Transaction 0.10 cents*/

processingFee = (+price * 0.75 / 100) + 0.10 ;

/** End */

stateTax = +price * 6.25 / 100;

var actualTotal = +price+shippingCost+demandeyCharges+stateTax+processingFee;

  shippingCost = parseFloat(shippingCost).toFixed(2);
  demandeyCharges = parseFloat(demandeyCharges).toFixed(2);
  stateTax = parseFloat(stateTax).toFixed(2);
  processingFee = parseFloat(processingFee).toFixed(2);
  actualTotal = parseFloat(actualTotal).toFixed(2);


return {
  shippingCost,
  demandeyCharges,
  stateTax,
  processingFee,
  actualTotal
}
}


function validateCardNumber(cardNumber) {
  cardNumber = cardNumber.replace(/\s+/g, '').replace(/-/g, '');
  
  if (!/^\d+$/.test(cardNumber)) {
      return false;
  }

  // Check card number length for common card types (13-16 digits for most cards)
  if (!(cardNumber.length >= 13 && cardNumber.length <= 16)) {
      return false;
  }

  let sum = 0;
  let isEven = false;

  // Reverse iteration through the digits
  for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber.charAt(i), 10);

      if (isEven) {
          digit *= 2;
          if (digit > 9) {
              digit -= 9;
          }
      }

      sum += digit;
      isEven = !isEven;
  }
  return sum % 10 === 0;
}


function isFutureDate(cardDate) {
  // Splitting the card date into month and year
  const [inputMonth, inputYear] = cardDate.split('/').map(item => parseInt(item, 10));

  // Getting the current date and year
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear() % 100; // Get the last two digits of the year

  // Comparing the year and month
  if (inputYear > currentYear || (inputYear === currentYear && inputMonth > (currentDate.getMonth() + 1))) {
    return true; // Date is in the future
  } else {
    return false; // Date is in the past or current month
  }
}

function isValidDate(dateString) {
  // Check if the date string can be converted to a valid Date object
  return !isNaN(Date.parse(dateString));
}


const transporterforQueryMail = nodemailer.createTransport({
  host: 'mail.smartdocs365.com', // Replace with your actual SMTP server
  port: 465, // or 465 for SSL/TLS
  secure: true, // true for 465, false for other ports
  auth: {
    user: 'do-not-reply@smartdocs365.com', // Replace with your actual email address
    pass: 't4dP4*xZ3', // Replace with your actual email password
  },
  tls: {
    rejectUnauthorized: false, // Bypass certificate verification
  },
});

async function  sendMailToSupportMail(payload)  {
    // Email data
    const currentDate = new Date();

    const formattedDate = currentDate.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });

    const data  =  payload.file_name  ? [
    {
      filename: payload.file_name,
      path: payload.file_path,
    },
  ]
: [] ;

    const mailOptions = {
      from: payload?.email_address || 'userquery@smartdocs365.com',
      to: 'support@smartdocs365.com',
      subject: 'Assistance Needed: Inquiry, Information, or Contact Regarding For Your Software',
      text: `Dear SmartDocs365 Team,\nDate : ${formattedDate}.\n\nMy name is ${payload?.full_name}. My Contact Details is Email :  ${payload?.email_address} and Mobile Number is ${payload?.mobile} \n\nDescription :  ${payload?.description}. \n\n\nThankyou Team SmartDocs365`, // Replace with your text content
      attachments:data, // Include attachments only if filename exists

    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
      } else {
        console.log("Email sent:", info.response);
      }
    });
}

module.exports = {
  getCurrentDateTime,
  namingValidation,
  isEmailValid,
  getOffset,
  emptyOrRows,
  sendWelcomeMail,
  encryptData,
  decryptData,
  validateZIPCode,
  deleteFile,
  addDaysToCurrentDate,
  priceBreakDown,
  sendResetEmail,
  validateCardNumber,
  isFutureDate,
  isValidDate,
  sendOtpCode,
  expiredMail,
  expiredPolicyMail,
  sendMailToSupportMail
};
