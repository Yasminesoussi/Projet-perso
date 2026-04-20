// Controleur admin.
// Il gere l'auth admin, le scan QR, le suivi des reservations et la validation des comptes etudiants.

const mongoose = require("mongoose");
const Admin = require("../models/Admin");
const jwt = require("jsonwebtoken");
const BlacklistedToken = require("../models/BlacklistedToken");
const Student = require("../models/Student");
const { sendStudentStatusEmail } = require("../services/email.service");
const Reservation = require("../models/Reservation");
const Passage = require("../models/Passage");
const PackPurchase = require("../models/PackPurchase");
const Review = require("../models/Review");
const ServiceFeedback = require("../models/ServiceFeedback");

// 🔹 LOGIN
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        message: "MongoDB non connecté (vérifie la connexion Atlas/DNS) — réessaie dans quelques secondes",
      });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(401).json({ message: "Identifiants invalides" });

    const validPassword = await admin.isValidPassword(password);
    if (!validPassword) return res.status(401).json({ message: "Identifiants invalides" });

    // Générer token JWT
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

function parseStartEnd(dateISO, creneau) {
  // Transforme un creneau texte en vraies dates JS pour les controles horaires.
  const times = String(creneau).split(/→|-/).map(s => s.trim());
  const toHM = (t) => {
    const cleaned = String(t).replace(/\s+/g, "");
    const m = cleaned.match(/^(\d{1,2})h?[:]?(\d{2})$/i);
    if (!m) return null;
    return { h: parseInt(m[1], 10), m: parseInt(m[2], 10) };
  };
  const startHM = toHM(times[0] || "");
  const endHM = toHM(times[1] || "");
  if (!startHM) return { start: null, end: null };
  const [y, mo, d] = String(dateISO).split("-").map(n => parseInt(n, 10));
  const start = new Date(y, (mo || 1) - 1, d || 1, startHM.h, startHM.m, 0, 0);
  let end = endHM ? new Date(y, (mo || 1) - 1, d || 1, endHM.h, endHM.m, 0, 0) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  if (endHM && end <= start) {
    end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  }
  return { start, end };
}

function setReservationSeatStatus(reservation, nextSeatStatus) {
  // Met le meme statut sur toutes les places d'une reservation.
  reservation.selectedSeats = (reservation.selectedSeats || []).map((seat) => ({
    id: seat?.id,
    label: seat?.label,
    tableId: seat?.tableId,
    tableLabel: seat?.tableLabel,
    status: nextSeatStatus,
  }));
}

// 🔹 CONSOMMATION VIA QR (SCAN ADMIN)
exports.consumeByQR = async (req, res) => {
  try {
    const { qrPayload } = req.body || {};
    if (!qrPayload) return res.status(400).json({ message: "QR manquant" });

    let decoded;
    try {
      const json = Buffer.from(qrPayload, "base64url").toString("utf8");
      decoded = JSON.parse(json);
    } catch {
      return res.status(400).json({ message: "QR invalide" });
    }
    if (decoded?.type !== "RESERVATION") {
      return res.status(400).json({ message: "QR non supporté" });
    }

    const { studentId, dateISO, repas, creneau } = decoded;
    if (!studentId || !dateISO || !repas || !creneau) {
      return res.status(400).json({ message: "QR incomplet" });
    }

    // On cherche la reservation qui correspond au QR scanne.
    let reservation = await Reservation.findOne({
      student: studentId,
      dateISO,
      repas,
      creneau
    });
    if (!reservation) {
      // tolérer statut mis à jour mais même clé (ex: slight changes)
      reservation = await Reservation.findOne({ student: studentId, dateISO, repas });
    }
    if (!reservation) return res.status(404).json({ message: "Réservation introuvable" });

    // Validation d'état
    if (reservation.status === "CANCELLED") {
      return res.status(400).json({ message: "Réservation annulée" });
    }
    if (reservation.status === "CONSUMED") {
      return res.status(400).json({ message: "Déjà consommée" });
    }

    // Le scan n'est accepte que dans une fenetre de temps raisonnable.
    const { start, end } = parseStartEnd(reservation.dateISO, reservation.creneau);
    const now = new Date();
    if (start && end) {
      const graceStart = new Date(start.getTime() - 15 * 60 * 1000);
      const graceEnd = new Date(end.getTime() + 30 * 60 * 1000);
      if (now < graceStart) {
        return res.status(400).json({ message: "Trop tôt pour scanner" });
      }
      if (now > graceEnd) {
        return res.status(400).json({ message: "Réservation expirée" });
      }
    }

    // Quand le QR est valide, on consomme la reservation et on debite les tickets.
    reservation.status = "CONSUMED";
    setReservationSeatStatus(reservation, "occupied");
    await reservation.save();

    const student = await Student.findById(reservation.student);
    if (student) {
      student.blockedTickets = Math.max(0, (student.blockedTickets || 0) - (reservation.groupSize || 1));
      student.soldeTickets = Math.max(0, (student.soldeTickets || 0) - (reservation.groupSize || 1));
      await student.save();
    }

    await Passage.create({
      reservation: reservation._id,
      student: reservation.student,
      admin: req.adminId || null,
      date: new Date(),
      repas: reservation.repas,
      creneau: reservation.creneau,
      source: "QR"
    });

    res.json({
      message: "Passage validé",
      reservation: { id: reservation._id, status: "CONSUMED" },
      solde: { total: student?.soldeTickets || 0, blocked: student?.blockedTickets || 0 }
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// 🔹 GET admin connecté
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

// 🔹 UPDATE admin connecté
exports.updateMe = async (req, res) => {
  try {
    const { fullName, email, phone, address, bio } = req.body;

    const admin = await Admin.findById(req.adminId);
    if (!admin) return res.status(404).json({ message: "Admin introuvable" });

    // Mise à jour des champs
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

// 🔹 LOGOUT
exports.logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Token manquant" });

    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token manquant après Bearer" });

    const decoded = jwt.decode(token);
    if (!decoded) return res.status(400).json({ message: "Token invalide" });

    const expiresAt = new Date(decoded.exp * 1000);
    await BlacklistedToken.create({ token, expiresAt });

    res.json({ message: "Déconnexion réussie" });
  } catch (error) {
    console.error("Erreur logout :", error);
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 🔹 LIST reservations (admin)
exports.listReservations = async (req, res) => {
  try {
    // Cette route alimente surtout les ecrans admin de suivi.
    await Reservation.updateMany({ status: "PENDING" }, { $set: { status: "ACTIVE" } });

    const {
      q,
      dateISO,
      dateFrom,
      dateTo,
      repas,
      status,
      typeRepas,
      page = 1,
      limit = 25,
      sort = "-createdAt",
    } = req.query || {};

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));

    const match = {};
    if (dateISO) match.dateISO = String(dateISO);
    if (dateFrom || dateTo) {
      match.dateISO = match.dateISO || {};
      if (dateFrom) match.dateISO.$gte = String(dateFrom);
      if (dateTo) match.dateISO.$lte = String(dateTo);
    }
    if (repas) match.repas = String(repas);
    if (status) match.status = String(status);
    if (typeRepas) match.typeRepas = String(typeRepas);

    // Ce filtre texte permet de chercher un etudiant par nom, mail ou numero.
    const studentMatch = q
      ? {
          $or: [
            { firstName: { $regex: escapeRegExp(q), $options: "i" } },
            { lastName: { $regex: escapeRegExp(q), $options: "i" } },
            { email: { $regex: escapeRegExp(q), $options: "i" } },
            { studentNumber: { $regex: escapeRegExp(q), $options: "i" } },
          ],
        }
      : null;

    const sortObj = {};
    for (const part of String(sort).split(",")) {
      const key = part.trim();
      if (!key) continue;
      if (key.startsWith("-")) sortObj[key.slice(1)] = -1;
      else sortObj[key] = 1;
    }

    const baseQuery = Reservation.find(match)
      .populate({
        path: "student",
        select: "firstName lastName email studentNumber",
        match: studentMatch || undefined,
      })
      .sort(Object.keys(sortObj).length ? sortObj : { createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    const [itemsRaw, total, stats] = await Promise.all([
      baseQuery,
      Reservation.countDocuments(match),
      Reservation.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Si la recherche texte a exclu l'etudiant, on retire la ligne.
    const items = itemsRaw.filter((r) => !!r.student);

    const statsByStatus = {};
    for (const row of stats) statsByStatus[row._id] = row.count;

    res.json({
      page: pageNum,
      limit: limitNum,
      total,
      stats: statsByStatus,
      reservations: items,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message || error });
  }
};

// 🔹 UPDATE reservation status (admin)
exports.updateReservationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const nextStatus = String(status || "").trim();
    const allowed = ["ACTIVE", "CONSUMED", "CANCELLED", "EXPIRED"];
    if (!allowed.includes(nextStatus)) {
      return res.status(400).json({ message: "Status invalide" });
    }

    // Cette route sert aux corrections manuelles cote admin.
    const reservation = await Reservation.findById(id);
    if (!reservation) return res.status(404).json({ message: "Réservation introuvable" });

    const currentStatus = reservation.status;
    if (currentStatus === nextStatus) {
      return res.json({ message: "Statut inchangé", reservation: { id: reservation._id, status: reservation.status } });
    }

    if (["CONSUMED", "CANCELLED", "EXPIRED"].includes(currentStatus)) {
      return res.status(400).json({ message: "Cette réservation ne peut plus changer de statut" });
    }

    if (!["CONSUMED", "CANCELLED", "EXPIRED"].includes(nextStatus)) {
      return res.status(400).json({ message: "Transition de statut non autorisée" });
    }

    const student = await Student.findById(reservation.student);

    if (nextStatus === "CANCELLED" || nextStatus === "EXPIRED") {
      if (student) {
        student.blockedTickets = Math.max(0, (student.blockedTickets || 0) - (reservation.groupSize || 1));
        await student.save();
      }
      setReservationSeatStatus(reservation, "available");
    }

    if (nextStatus === "CONSUMED") {
      if (student) {
        student.blockedTickets = Math.max(0, (student.blockedTickets || 0) - (reservation.groupSize || 1));
        student.soldeTickets = Math.max(0, (student.soldeTickets || 0) - (reservation.groupSize || 1));
        await student.save();
      }
      setReservationSeatStatus(reservation, "occupied");

      await Passage.create({
        reservation: reservation._id,
        student: reservation.student,
        admin: req.adminId || null,
        date: new Date(),
        repas: reservation.repas,
        creneau: reservation.creneau,
        source: "MANUAL"
      });
    }

    reservation.status = nextStatus;
    await reservation.save();

    res.json({
      message: "Statut mis à jour",
      reservation: { id: reservation._id, status: reservation.status },
      solde: student ? { total: student.soldeTickets || 0, blocked: student.blockedTickets || 0 } : null
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message || error });
  }
};

// 🔹 LIST feedbacks (reviews) : admin
exports.listReviews = async (req, res) => {
  try {
    const {
      q,
      rating,
      platId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 25,
      sort = "-createdAt",
    } = req.query || {};

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));

    const match = {};
    if (rating) match.rating = Number(rating);
    if (platId) match.plat = platId;

    if (dateFrom || dateTo) {
      match.createdAt = {};
      if (dateFrom) match.createdAt.$gte = new Date(String(dateFrom));
      if (dateTo) match.createdAt.$lte = new Date(String(dateTo));
    }

    const sortObj = {};
    const sortKey = String(sort || "-createdAt");
    if (sortKey.startsWith("-")) sortObj[sortKey.slice(1)] = -1;
    else sortObj[sortKey] = 1;

    const regex = q && String(q).trim() ? new RegExp(escapeRegExp(String(q).trim()), "i") : null;

    const commonPipeline = [
      { $match: match },
      {
        $lookup: {
          from: "plats",
          localField: "plat",
          foreignField: "_id",
          as: "plat",
        },
      },
      { $unwind: "$plat" },
      {
        $lookup: {
          from: "students",
          localField: "student",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },
    ];

    if (regex) {
      commonPipeline.push({
        $match: {
          $or: [
            { "student.firstName": { $regex: regex } },
            { "student.lastName": { $regex: regex } },
            { "student.email": { $regex: regex } },
            { "student.studentNumber": { $regex: regex } },
            { "plat.nom": { $regex: regex } },
          ],
        },
      });
    }

    const listPipeline = [
      ...commonPipeline,
      { $sort: sortObj },
      { $skip: (pageNum - 1) * limitNum },
      { $limit: limitNum },
      {
        $project: {
          _id: 1,
          rating: 1,
          text: 1,
          createdAt: 1,
          plat: { _id: "$plat._id", nom: "$plat.nom", photo: "$plat.photo" },
          student: {
            _id: "$student._id",
            firstName: "$student.firstName",
            lastName: "$student.lastName",
            email: "$student.email",
            studentNumber: "$student.studentNumber",
          },
        },
      },
    ];

    const countPipeline = [
      ...commonPipeline,
      { $count: "total" },
    ];

    const statsByRatingPipeline = [
      ...commonPipeline,
      { $group: { _id: "$rating", count: { $sum: 1 } } },
    ];

    const avgPipeline = [
      ...commonPipeline,
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          total: { $sum: 1 },
        },
      },
    ];

    const [rows, countRows, statsByRatingRows, avgRows] = await Promise.all([
      Review.aggregate(listPipeline),
      Review.aggregate(countPipeline),
      Review.aggregate(statsByRatingPipeline),
      Review.aggregate(avgPipeline),
    ]);

    const total = countRows?.[0]?.total || 0;
    const statsByRating = {};
    for (const row of statsByRatingRows) statsByRating[row._id] = row.count;
    const avgRating = avgRows?.[0]?.avgRating ? Number(avgRows[0].avgRating) : 0;

    const reviews = rows.map((r) => ({
      id: r._id,
      rating: r.rating,
      text: r.text || "",
      createdAt: r.createdAt,
      plat: { id: r.plat?._id, nom: r.plat?.nom, photo: r.plat?.photo },
      student: {
        id: r.student?._id,
        firstName: r.student?.firstName,
        lastName: r.student?.lastName,
        email: r.student?.email,
        studentNumber: r.student?.studentNumber,
      },
    }));

    res.json({
      page: pageNum,
      limit: limitNum,
      total,
      avgRating,
      statsByRating,
      reviews,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message || error });
  }
};

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
      const quantity = Number(passage.reservation?.groupSize || 1);
      return {
        id: `passage-${passage._id}`,
        type: "Consommation",
        user: `${passage.student?.firstName || ""} ${passage.student?.lastName || ""}`.trim() || "Etudiant",
        detail: `${passage.repas || "Repas"}${passage.creneau ? ` • ${passage.creneau}` : ""}`,
        date: passage.date || passage.createdAt,
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

// 🔹 LIST reservation feedbacks (service feedbacks) : admin
exports.listReservationFeedbacks = async (req, res) => {
  try {
    const {
      q,
      dateFrom,
      dateTo,
      serviceRating,
      page = 1,
      limit = 25,
      sort = "-createdAt",
    } = req.query || {};

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));

    const match = {};
    if (serviceRating) match.serviceRating = Number(serviceRating);

    if (dateFrom || dateTo) {
      match.createdAt = {};
      if (dateFrom) match.createdAt.$gte = new Date(String(dateFrom));
      if (dateTo) match.createdAt.$lte = new Date(String(dateTo));
    }

    const sortObj = {};
    const sortKey = String(sort || "-createdAt");
    if (sortKey.startsWith("-")) sortObj[sortKey.slice(1)] = -1;
    else sortObj[sortKey] = 1;

    const regex = q && String(q).trim() ? new RegExp(escapeRegExp(String(q).trim()), "i") : null;

    const commonPipeline = [
      { $match: match },
      {
        $lookup: {
          from: "students",
          localField: "student",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },
      {
        $lookup: {
          from: "reservations",
          localField: "reservation",
          foreignField: "_id",
          as: "reservation",
        },
      },
      { $unwind: "$reservation" },
    ];

    if (regex) {
      commonPipeline.push({
        $match: {
          $or: [
            { "student.firstName": { $regex: regex } },
            { "student.lastName": { $regex: regex } },
            { "student.email": { $regex: regex } },
            { "student.studentNumber": { $regex: regex } },
            { "reservation.repas": { $regex: regex } },
            { "reservation.creneau": { $regex: regex } },
            { "reservation.dateISO": { $regex: regex } },
          ],
        },
      });
    }

    const listPipeline = [
      ...commonPipeline,
      { $sort: sortObj },
      { $skip: (pageNum - 1) * limitNum },
      { $limit: limitNum },
      {
        $project: {
          _id: 1,
          serviceRating: 1,
          mealRating: 1,
          ambianceRating: 1,
          comment: 1,
          createdAt: 1,
          student: {
            _id: "$student._id",
            firstName: "$student.firstName",
            lastName: "$student.lastName",
            email: "$student.email",
            studentNumber: "$student.studentNumber",
          },
          reservation: {
            _id: "$reservation._id",
            dateISO: "$reservation.dateISO",
            repas: "$reservation.repas",
            creneau: "$reservation.creneau",
            typeRepas: "$reservation.typeRepas",
            status: "$reservation.status",
            groupSize: "$reservation.groupSize",
          },
        },
      },
    ];

    const countPipeline = [...commonPipeline, { $count: "total" }];
    const avgPipeline = [
      ...commonPipeline,
      {
        $group: {
          _id: null,
          avgServiceRating: { $avg: "$serviceRating" },
          avgMealRating: { $avg: "$mealRating" },
          avgAmbianceRating: { $avg: "$ambianceRating" },
          total: { $sum: 1 },
        },
      },
    ];

    const [rows, countRows, avgRows] = await Promise.all([
      ServiceFeedback.aggregate(listPipeline),
      ServiceFeedback.aggregate(countPipeline),
      ServiceFeedback.aggregate(avgPipeline),
    ]);

    const total = countRows?.[0]?.total || 0;
    const averages = avgRows?.[0] || {};

    const feedbacks = rows.map((row) => ({
      id: row._id,
      serviceRating: row.serviceRating,
      mealRating: row.mealRating,
      ambianceRating: row.ambianceRating,
      comment: row.comment || "",
      createdAt: row.createdAt,
      student: {
        id: row.student?._id,
        firstName: row.student?.firstName,
        lastName: row.student?.lastName,
        email: row.student?.email,
        studentNumber: row.student?.studentNumber,
      },
      reservation: {
        id: row.reservation?._id,
        dateISO: row.reservation?.dateISO,
        repas: row.reservation?.repas,
        creneau: row.reservation?.creneau,
        typeRepas: row.reservation?.typeRepas,
        status: row.reservation?.status,
        groupSize: row.reservation?.groupSize,
      },
    }));

    res.json({
      page: pageNum,
      limit: limitNum,
      total,
      averages: {
        service: averages.avgServiceRating ? Number(averages.avgServiceRating) : 0,
        meal: averages.avgMealRating ? Number(averages.avgMealRating) : 0,
        ambiance: averages.avgAmbianceRating ? Number(averages.avgAmbianceRating) : 0,
      },
      feedbacks,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message || error });
  }
};

// 🔹 DELETE feedback (review) : admin
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Review.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Feedback introuvable" });
    res.json({ message: "Feedback supprimé" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message || error });
  }
};

// 🔹 LIST Pending students
exports.listPendingStudents = async (req, res) => {
  try {
    // Retourne les comptes en attente de validation par l'administration.
    const students = await Student.find({ status: "PENDING" }).select("-password");
    res.json({ students });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// 🔹 APPROVE student
exports.approveStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ message: "Étudiant introuvable" });
    student.status = "ACCEPTED";
    await student.save();
    try {
      const { previewUrl } = await sendStudentStatusEmail(student.email, "ACCEPTED");
      res.json({ message: "Étudiant accepté", emailPreviewUrl: previewUrl || null });
    } catch (e) {
      res.json({ message: "Étudiant accepté, email non envoyé", error: e?.message });
    }
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// 🔹 REJECT student
exports.rejectStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id);
    if (!student) return res.status(404).json({ message: "Étudiant introuvable" });
    student.status = "REJECTED";
    await student.save();
    try {
      const { previewUrl } = await sendStudentStatusEmail(student.email, "REJECTED");
      res.json({ message: "Étudiant refusé", emailPreviewUrl: previewUrl || null });
    } catch (e) {
      res.json({ message: "Étudiant refusé, email non envoyé", error: e?.message });
    }
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};
