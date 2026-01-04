const jwt = require("jsonwebtoken");
require("dotenv").config();

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.sendStatus(401);
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.sendStatus(403);
    }
    req.user = decoded.username;
    req.user_id = decoded.user_id; // ✅ CRITICAL - Must be in JWT token
    req.role = decoded.role; // ✅ CRITICAL - Must be in JWT token
    next();
  });
};

module.exports = verifyJWT;