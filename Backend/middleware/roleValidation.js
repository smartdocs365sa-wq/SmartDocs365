
const validateAdmin = (req, res, next) => {
    if(req.role != "admin" && req.role != "super-admin"){
        return res.status(400).json({
            success:false,
            message:"You Do Not Have Access To Use This Api(s)!"
        })
    }
    next();
};

module.exports = validateAdmin;
