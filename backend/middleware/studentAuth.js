const jwt = require("jsonwebtoken");
const BlacklistedToken = require("../models/BlacklistedToken");

const studentAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ message: "Token manquant" });

    const token = authHeader.split(" ")[1];

    const blacklisted = await BlacklistedToken.findOne({ token });
    if (blacklisted)
      return res.status(401).json({ message: "Token invalide (déconnecté)" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.studentId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token invalide", error });
  }
};

module.exports = studentAuth;
