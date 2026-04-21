// Middleware d'authentification Admin.
// Vérifie la validité du token JWT pour les accès protégés de l'administration et s'assure que le token n'est pas blacklisté.

const jwt = require("jsonwebtoken");
const BlacklistedToken = require("../models/BlacklistedToken");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ message: "Token manquant" });

    const token = authHeader.split(" ")[1];

    // Vérifie si le token est blacklisté
    const blacklisted = await BlacklistedToken.findOne({ token });
    if (blacklisted)
      return res.status(401).json({ message: "Token invalide (déconnecté)" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔹 Stocker l'ID de l'admin pour l'utiliser dans les routes
    req.adminId = decoded.id;

    next();
  } catch (error) {
    res.status(401).json({ message: "Token invalide", error });
  }
};

module.exports = authMiddleware;