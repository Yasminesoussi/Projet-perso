// Contrôleur Admin.
// Gère l'authentification admin, le profil admin et le tableau de bord des statistiques globales.

const mongoose = require("mongoose");
const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");
const BlacklistedToken = require("../models/BlacklistedToken");
const Student = require("../models/Student");
const Reservation = require("../models/Reservation");
const Passage = require("../models/Passage");
const PackPurchase = require("../models/PackPurchase");

// 🔹 Connecte un administrateur et génère un token JWT
// Cette fonction vérifie les identifiants de l'admin (email/password) et crée un "badge" (token JWT) 
// qui lui permet d'accéder aux fonctionnalités réservées (ex: valider des étudiants).
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Vérification de l'état de la base de données Atlas
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        message: "MongoDB non connecté (vérifie la connexion Atlas/DNS) — réessaie dans quelques secondes",
      });
    }

    // Recherche de l'admin par son email
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(401).json({ message: "Identifiants invalides" });

    // Vérification du mot de passe (haché en base)
    const validPassword = await admin.isValidPassword(password);
    if (!validPassword) return res.status(401).json({ message: "Identifiants invalides" });

    // Création du token sécurisé avec une durée de vie de 1 heure
    const token = jwt.sign(
      { id: admin._id, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ message: "Connexion réussie", token });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ message: "Erreur serveur", error: error?.message || String(error) });
  }
};

// 🔹 Récupère les informations du profil de l'admin connecté
// Sert à afficher les détails de l'admin (nom, email) sur son tableau de bord mobile ou web.
exports.getMe = async (req, res) => {
  try {
    const admin = await Admin.findById(req.adminId).select("-password");
    if (!admin) return res.status(404).json({ message: "Admin introuvable" });

    res.json({ admin });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// 🔹 Met à jour les informations personnelles de l'admin (nom, email, tel, etc.)
// Permet à l'administrateur de modifier ses propres coordonnées de contact.
exports.updateMe = async (req, res) => {
  try {
    const { fullName, email, phone, address, bio } = req.body;

    const admin = await Admin.findById(req.adminId);
    if (!admin) return res.status(404).json({ message: "Admin introuvable" });

    admin.fullName = fullName;
    admin.email = email;
    admin.phone = phone;
    admin.address = address;
    admin.bio = bio;

    await admin.save();

    res.json({
      message: "Profil admin mis à jour avec succès",
      admin: {
        fullName: admin.fullName,
        email: admin.email,
        phone: admin.phone,
        address: admin.address,
        bio: admin.bio,
        role: admin.role
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// 🔹 Déconnecte l'admin en ajoutant son token à la liste noire (blacklist)
// Cette fonction est cruciale pour la sécurité : elle "tue" le token actuel pour qu'il ne soit plus utilisable.
exports.logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Token manquant" });

    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token manquant après Bearer" });

    const decoded = jwt.decode(token);
    if (!decoded) return res.status(400).json({ message: "Token invalide" });

    // Enregistrement du token dans la collection BlacklistedToken jusqu'à sa date d'expiration normale
    const expiresAt = new Date(decoded.exp * 1000);
    await BlacklistedToken.create({ token, expiresAt });

    res.json({ message: "Déconnexion réussie" });
  } catch (error) {
    console.error("Erreur logout :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// 🔹 Récupère les statistiques globales (revenus, tickets vendus/utilisés) et l'historique récent pour le dashboard
// C'est le "cerveau" du tableau de bord admin. Elle agrège les données de 5 tables différentes :
// 1. PackPurchase (Ventes), 2. Reservation (Consommation), 3. Student (Utilisateurs), 
// 4. Historique des achats, 5. Historique des passages (scans).
exports.getTicketsDashboard = async (req, res) => {
  try {
    const [purchaseStatsRows, usedStatsRows, studentsRaw, purchaseRows, passageRows] = await Promise.all([
      PackPurchase.aggregate([
        { $match: { status: "SUCCEEDED" } },
        {
          $group: {
            _id: null,
            sold: { $sum: "$tickets" },
            revenue: { $sum: "$amount" },
          },
        },
      ]),
      Reservation.aggregate([
        { $match: { status: "CONSUMED" } },
        {
          $group: {
            _id: null,
            used: { $sum: { $ifNull: ["$groupSize", 1] } },
          },
        },
      ]),
      Student.find({})
        .select("firstName lastName email studentNumber soldeTickets blockedTickets status")
        .sort({ createdAt: -1 })
        .lean(),
      PackPurchase.find({ status: "SUCCEEDED" })
        .populate("student", "firstName lastName email studentNumber")
        .populate("pack", "nom nbTickets prix")
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      Passage.find({})
        .populate("student", "firstName lastName email studentNumber")
        .populate("reservation", "groupSize")
        .sort({ date: -1, createdAt: -1 })
        .limit(50)
        .lean(),
    ]);

    const purchaseStats = purchaseStatsRows?.[0] || {};
    const usedStats = usedStatsRows?.[0] || {};

    const stats = {
      sold: Number(purchaseStats.sold || 0),
      used: Number(usedStats.used || 0),
      revenue: Number(purchaseStats.revenue || 0),
    };

    const students = studentsRaw.map((student) => ({
      id: student._id,
      firstName: student.firstName || "",
      lastName: student.lastName || "",
      fullName: `${student.firstName || ""} ${student.lastName || ""}`.trim(),
      email: student.email || "",
      studentNumber: student.studentNumber || "",
      balance: Number(student.soldeTickets || 0),
      blockedTickets: Number(student.blockedTickets || 0),
      status: student.status || "PENDING",
    }));

    const purchaseHistory = purchaseRows.map((purchase) => ({
      id: `purchase-${purchase._id}`,
      type: "Achat",
      user: `${purchase.student?.firstName || ""} ${purchase.student?.lastName || ""}`.trim() || "Etudiant",
      detail: purchase.pack?.nom || "Pack tickets",
      date: purchase.createdAt,
      amount: `+${Number(purchase.amount || 0).toFixed(Number.isInteger(Number(purchase.amount || 0)) ? 0 : 2)} DT`,
      sortDate: new Date(purchase.createdAt).getTime(),
    }));

    const usageHistory = passageRows.map((passage) => {
      // 💡 Le solde retiré correspond au nombre de personnes dans la réservation (groupSize)
      const quantity = Number(passage.reservation?.groupSize || 1);
      return {
        id: `passage-${passage._id}`,
        type: "Consommation",
        user: `${passage.student?.firstName || ""} ${passage.student?.lastName || ""}`.trim() || "Etudiant",
        detail: `${passage.repas || "Repas"}${passage.creneau ? ` • ${passage.creneau}` : ""}`,
        date: passage.date || passage.createdAt,
        // 💡 On affiche le signe "-" pour indiquer que les tickets ont été déduits du solde
        amount: `-${quantity} Ticket${quantity > 1 ? "s" : ""}`,
        sortDate: new Date(passage.date || passage.createdAt).getTime(),
      };
    });

    const history = [...purchaseHistory, ...usageHistory]
      .sort((a, b) => (b.sortDate || 0) - (a.sortDate || 0))
      .slice(0, 100)
      .map(({ sortDate, ...item }) => item);

    res.json({ stats, students, history });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message || error });
  }
};
