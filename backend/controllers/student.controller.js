// Contrôleur Étudiant.
// Gère l'authentification étudiant, le profil, les notifications et la validation des comptes par l'admin.

const Student = require("../models/Student");
const jwt = require("jsonwebtoken");
const BlacklistedToken = require("../models/BlacklistedToken");
const StudentNotification = require("../models/StudentNotification");
const KitchenOrder = require("../models/KitchenOrder");
const Reservation = require("../models/Reservation");
const Menu = require("../models/Menu");
const { sendStudentStatusEmail } = require("../services/email.service");

// ============================
// AUTH & PROFILE
// ============================

// 🔹 Enregistre un nouvel étudiant avec sa carte d'identité (Cloudinary)
exports.signup = async (req, res) => {
  try {
    const { firstName, lastName, dateOfBirth, email, phone, university, level, studentNumber, password } = req.body;

    if (!firstName || !lastName || !dateOfBirth || !email || !phone || !university || !level || !studentNumber || !password) {
      return res.status(400).json({ message: "Champs manquants" });
    }

    if (!req.files || !req.files.card || req.files.card.length === 0) {
      return res.status(400).json({ message: "Carte étudiant obligatoire" });
    }

    const cardImage = req.files.card[0].path;

    const student = new Student({
      firstName,
      lastName,
      dateOfBirth,
      email,
      phone,
      university,
      level,
      studentNumber,
      cardImage,
      password
    });

    await student.save();
    res.status(201).json({ message: "Inscription réussie, statut EN ATTENTE" });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({ message: `${field} déjà utilisé` });
    }
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// 🔹 Connecte un étudiant et vérifie si son compte a été accepté par l'admin
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const student = await Student.findOne({ email });
    if (!student) return res.status(401).json({ message: "Identifiants invalides" });

    const valid = await student.isValidPassword(password);
    if (!valid) return res.status(401).json({ message: "Identifiants invalides" });

    if (student.status !== "ACCEPTED") {
      return res.status(403).json({ message: "Compte en attente de validation par l’administration" });
    }

    const token = jwt.sign(
      { id: student._id, email: student.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ message: "Connexion réussie", token });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// 🔹 Récupère les informations de profil de l'étudiant connecté
exports.getMe = async (req, res) => {
  try {
    const student = await Student.findById(req.studentId).select("-password");
    if (!student) return res.status(404).json({ message: "Étudiant introuvable" });
    res.json({ student });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// 🔹 Déconnecte l'étudiant (blacklist du token)
exports.logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Token manquant" });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.decode(token);
    if (!decoded) return res.status(400).json({ message: "Token invalide" });

    const expiresAt = new Date(decoded.exp * 1000);
    await BlacklistedToken.create({ token, expiresAt });

    res.json({ message: "Déconnexion réussie" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// ============================
// NOTIFICATIONS
// ============================

// 🔹 Récupère les notifications non archivées de l'étudiant
exports.getMyNotifications = async (req, res) => {
  try {
    const notifications = await StudentNotification.find({ student: req.studentId, dismissed: false })
      .sort({ createdAt: -1 });
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// 🔹 Marque une ou plusieurs notifications comme lues
exports.markNotificationsRead = async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    await StudentNotification.updateMany(
      { _id: { $in: ids }, student: req.studentId },
      { $set: { read: true } }
    );
    res.json({ message: "Notifications marquées comme lues" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// 🔹 Archive (cache) une notification
exports.dismissNotification = async (req, res) => {
  try {
    await StudentNotification.findOneAndUpdate(
      { _id: req.params.id, student: req.studentId },
      { $set: { dismissed: true } }
    );
    res.json({ message: "Notification supprimée" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// ============================
// TICKETS & ORDERS
// ============================

// 🔹 Ajoute manuellement des tickets au solde de l'étudiant (debug/admin)
exports.creditWallet = async (req, res) => {
  try {
    const { nbTickets } = req.body;
    const value = parseInt(nbTickets, 10);
    if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ message: "nbTickets invalide" });

    const student = await Student.findById(req.studentId);
    if (!student) return res.status(404).json({ message: "Étudiant introuvable" });

    student.soldeTickets = (student.soldeTickets || 0) + value;
    await student.save();
    res.json({ message: "Solde mis à jour", soldeTickets: student.soldeTickets });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// 🔹 Récupère l'historique des commandes passées en cuisine par l'étudiant
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await KitchenOrder.find({ student: req.studentId })
      .sort({ createdAt: -1 })
      .populate("reservation", "groupSize typeRepas status selectedSeats")
      .lean();
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// 🔹 Permet à l'étudiant de confirmer qu'il a bien reçu son plat
exports.confirmOrderReceipt = async (req, res) => {
  try {
    const order = await KitchenOrder.findOne({ _id: req.params.id, student: req.studentId });
    if (!order) return res.status(404).json({ message: "Commande introuvable" });
    if (order.status !== "SERVED") return res.status(400).json({ message: "Seule une commande servie peut être confirmée" });
    if (order.studentConfirmedAt) return res.json({ message: "Réception déjà confirmée", order });

    order.studentConfirmedAt = new Date();
    await order.save();
    res.json({ message: "Réception confirmée", order });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// ============================
// ADMIN ACTIONS ON STUDENTS
// ============================

// 🔹 Liste les nouveaux étudiants en attente de validation (Admin)
exports.listPendingStudents = async (req, res) => {
  try {
    const students = await Student.find({ status: "PENDING" }).select("-password");
    res.json({ students });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// 🔹 Accepte l'inscription d'un étudiant et lui envoie un email (Admin)
exports.approveStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Étudiant introuvable" });
    student.status = "ACCEPTED";
    await student.save();
    try {
      await sendStudentStatusEmail(student.email, "ACCEPTED");
      // 🔔 Création d'une notification pour l'étudiant
      await StudentNotification.create({
        student: student._id,
        key: `account_accepted_${student._id}`,
        type: "menu",
        title: "Compte validé ! 🎉",
        body: "Votre compte a été accepté par l'administrateur. Vous pouvez maintenant réserver vos repas.",
        icon: "checkmark-circle-outline",
        bg: "#D4EDDA",
        tint: "#155724",
        actionRoute: "StudentHome",
      });
    } catch (e) {
      console.error("Erreur notification acceptation :", e.message);
    }
    res.json({ message: "Étudiant accepté" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// 🔹 Refuse l'inscription d'un étudiant et lui envoie un email (Admin)
exports.rejectStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Étudiant introuvable" });
    student.status = "REJECTED";
    await student.save();
    try {
      await sendStudentStatusEmail(student.email, "REJECTED");
    } catch (e) {}
    res.json({ message: "Étudiant refusé" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};
