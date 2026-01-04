const express = require("express");
const router = express.Router();
const userModel = require("../../models/userModel");
const {isValidDate} = require("../../utils/repetedUsedFunction");
const pdfDetailsModel = require("../../models/pdfDetailsModel");

router.get("/user", async (req,res,next) => {
    try{
        
    if (req.role != "admin" && req.role != "super-admin") {
        return res.status(400).json({
          status: false,
          message: "You Do Not Have Access To Use This Api!",
        });
      }

    var { from_date, to_date } = req.query;

    let query = {};

    // Validate date formats before using them
    if(from_date && to_date){
    if (!isValidDate(from_date) || !isValidDate(to_date)) {
      return res.status(400).json({
         success:false,
         message: "Invalid date format" 
        });
    }

    var f = new Date(from_date);
     from_date = new Date(f.getFullYear(), f.getMonth()+1, f.getDate()-30);
    var t = new Date(to_date)
     to_date = new Date(t.getFullYear(), t.getMonth()+1, t.getDate()-30);

}else{
    from_date = new Date();
    to_date = new Date();
   from_date.setDate(from_date.getDate() - 7);
}

    console.log(from_date);
    console.log(to_date);
    
    var data = await userModel.aggregate([
        {
            $match: {
                created_at: {
                    $gte: new Date(from_date),
                    $lte: new Date(to_date)
                }
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
                count: { $sum: 1 } // Count the number of documents per date
            }
        },
        {
            $project: {
                _id: 0, // Exclude the default _id field
                date: '$_id', // Rename _id to date
                count: 1
            }
        },
        {
            $sort: { 'date': 1 } // Sort by date in ascending order
        }
    ]);
  
// Function to generate an array of dates between two dates (inclusive)
function getDateRangeArray(start, end) {
    const dates = [];
    let currentDate = new Date(start);

    while (currentDate <= end) {
        dates.push(new Date(currentDate).toISOString().slice(0, 10));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
}

const dateRange = getDateRangeArray(from_date, to_date);


const mergedData = dateRange.map(date => {
    const found = data.find(item => item.date === date);
    return found ? found : { date, count: 0 };
});

    var count = mergedData?.length;


    res.status(200).json({
      success: true,
      message: "Daily User Report Fetched Successfully!",
      result: count,
      data: mergedData,
    });

  } catch (err) {
    console.log("Error While Getting Pdf Data List :  ", err.message);
    next(err);
  }

});

router.get("/policy", async (req,res,next) => {
    try{
        
    if (req.role != "admin" && req.role != "super-admin") {
        return res.status(400).json({
          status: false,
          message: "You Do Not Have Access To Use This Api!",
        });
      }

    var { from_date, to_date } = req.query;

    let query = {};

    // Validate date formats before using them
    if(from_date && to_date){
    if (!isValidDate(from_date) || !isValidDate(to_date)) {
      return res.status(400).json({
         success:false,
         message: "Invalid date format" 
        });
    }

    var f = new Date(from_date);
     from_date = new Date(f.getFullYear(), f.getMonth()+1, f.getDate()-30);
    var t = new Date(to_date)
     to_date = new Date(t.getFullYear(), t.getMonth()+1, t.getDate()-30);

}else{
    from_date = new Date();
    to_date = new Date();
   from_date.setDate(from_date.getDate() - 7);
}

    console.log(from_date);
    console.log(to_date);
    
    var data = await pdfDetailsModel.aggregate([
        {
            $match: {
                created_at: {
                    $gte: new Date(from_date),
                    $lte: new Date(to_date)
                }
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
                count: { $sum: 1 } // Count the number of documents per date
            }
        },
        {
            $project: {
                _id: 0, // Exclude the default _id field
                date: '$_id', // Rename _id to date
                count: 1
            }
        },
        {
            $sort: { 'date': 1 } // Sort by date in ascending order
        }
    ]);
  
// Function to generate an array of dates between two dates (inclusive)
function getDateRangeArray(start, end) {
    const dates = [];
    let currentDate = new Date(start);

    while (currentDate <= end) {
        dates.push(new Date(currentDate).toISOString().slice(0, 10));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
}

const dateRange = getDateRangeArray(from_date, to_date);


const mergedData = dateRange.map(date => {
    const found = data.find(item => item.date === date);
    return found ? found : { date, count: 0 };
});

    var count = mergedData?.length;


    res.status(200).json({
      success: true,
      message: "Daily Policy Uploads Report Fetched Successfully!",
      result: count,
      data: mergedData,
    });

  } catch (err) {
    console.log("Error While Getting Pdf Data List :  ", err.message);
    next(err);
  }

});

module.exports = router;
