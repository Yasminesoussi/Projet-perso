// Contrôleur Réservation.
// Gère tout le cycle de vie des réservations (création par l'étudiant, gestion et scan par l'admin).

const Reservation = require("../models/Reservation");
const Student = require("../models/Student");
const Menu = require("../models/Menu");
const Passage = require("../models/Passage");
const ServiceFeedback = require("../models/ServiceFeedback");
const { escapeRegExp } = require("../utils/string.utils");

// ============================
// HELPERS (FONCTIONS D'AIDE)
// ============================

// Analyse les heures de début et fin d'un créneau (ex: "10:30 → 12:00")
function parseStartEnd(dateISO, creneau) {
  try {
    const parts = String(creneau).split(/→|-/).map(s => s.trim());
    const toHM = (t) => {
      const cleaned = String(t).replace(/\s+/g, "");
      const m = cleaned.match(/^(\d{1,2})h?[:]?(\d{2})$/i);
      if (!m) return null;
      return { h: parseInt(m[1], 10), m: parseInt(m[2], 10) };
    };
    const startHM = toHM(parts[0] || "");
    const endHM = toHM(parts[1] || "");
    if (!startHM) return { start: null, end: null };
    const [y, mo, d] = String(dateISO).split("-").map(n => parseInt(n, 10));
    const start = new Date(y, (mo || 1) - 1, d || 1, startHM.h, startHM.m, 0, 0);
    let end = endHM ? new Date(y, (mo || 1) - 1, d || 1, endHM.h, endHM.m, 0, 0) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    if (endHM && end <= start) {
      end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    }
    return { start, end };
  } catch {
    return { start: null, end: null };
  }
}

// Vérifie si une réservation a dépassé son heure de fin
function isExpired(dateISO, creneau) {
  const { end } = parseStartEnd(dateISO, creneau);
  if (!end) return false;
  const now = new Date();
  const expireAt = new Date(end.getTime() + 35 * 60 * 1000);
  return now >= expireAt;
}

// Vérifie si on peut encore modifier/annuler (jusqu'à 1h avant)
function canActOnReservation(dateISO, creneau) {
  const { start } = parseStartEnd(dateISO, creneau);
  if (!start) return false;
  const now = new Date();
  const limit = new Date(start.getTime() - 60 * 60 * 1000);
  return now < limit;
}

// Liste des tables et leur capacité
const SEAT_TABLES = [
  { id: "T1", label: "Table 1", seatCount: 6 },
  { id: "T2", label: "Table 2", seatCount: 6 },
  { id: "T3", label: "Table 3", seatCount: 6 },
  { id: "T4", label: "Table 4", seatCount: 6 },
  { id: "T5", label: "Table 5", seatCount: 6 },
  { id: "T7", label: "Table 7", seatCount: 6 },
  { id: "T8", label: "Table 8", seatCount: 6 },
  { id: "T9", label: "Table 9", seatCount: 6 },
  { id: "T10", label: "Table 10", seatCount: 6 },
  { id: "T15", label: "Table 15", seatCount: 8 },
  { id: "T12", label: "Table 12", seatCount: 6 },
  { id: "T17", label: "Table 17", seatCount: 8 },
];

// Détermine l'état d'une place (libre, réservée, occupée)
function getReservationSeatStatus(reservation, now = new Date()) {
  if (!reservation) return "available";
  if (reservation.status === "ACTIVE") return "reserved";
  if (reservation.status === "CONSUMED") {
    if (reservation.leftRestaurantAt) return "available";
    const { end } = parseStartEnd(reservation.dateISO, reservation.creneau);
    if (!end) return "occupied";
    return now <= end ? "occupied" : "available";
  }
  return "available";
}

// Met à jour le statut de toutes les places d'une réservation
function setReservationSeatStatus(reservation, nextSeatStatus) {
  reservation.selectedSeats = (reservation.selectedSeats || []).map((seat) => ({
    id: seat?.id,
    label: seat?.label,
    tableId: seat?.tableId,
    tableLabel: seat?.tableLabel,
    status: nextSeatStatus,
  }));
  return reservation.selectedSeats;
}

// Synchronise l'état réel des places en base de données
async function syncReservationSeatState(reservation, now = new Date()) {
  if (!reservation) return "available";
  const nextSeatStatus = getReservationSeatStatus(reservation, now);
  const currentStatuses = (reservation.selectedSeats || []).map((seat) => seat?.status || "available");
  const shouldUpdate = currentStatuses.some((status) => status !== nextSeatStatus);

  if (shouldUpdate) {
    setReservationSeatStatus(reservation, nextSeatStatus);
    await reservation.save();
  }
  return nextSeatStatus;
}

// Retourne les places avec leur statut actuel
function withSeatStatuses(reservation, now = new Date()) {
  return (reservation.selectedSeats || []).map((seat) => ({
    id: seat?.id,
    label: seat?.label,
    tableId: seat?.tableId,
    tableLabel: seat?.tableLabel,
    status: seat?.status || getReservationSeatStatus(reservation, now),
  }));
}

// Vérifie si l'étudiant peut marquer sa sortie du restaurant
function canLeaveRestaurant(reservation, now = new Date()) {
  if (!reservation || reservation.status !== "CONSUMED" || reservation.leftRestaurantAt) return false;
  const { end } = parseStartEnd(reservation.dateISO, reservation.creneau);
  if (!end) return true;
  return now <= end;
}

// Trouve le menu correspondant à une date et un repas précis
async function findMenuByDateAndRepas(dateISO, repas) {
  const startUTC = new Date(`${dateISO}T00:00:00.000Z`);
  const endUTC = new Date(`${dateISO}T23:59:59.999Z`);
  let menu = await Menu.findOne({ date: { $gte: startUTC, $lte: endUTC }, repas });
  if (menu) return menu;

  const startLocal = new Date(dateISO);
  startLocal.setHours(0, 0, 0, 0);
  const endLocal = new Date(dateISO);
  endLocal.setHours(23, 59, 59, 999);
  return Menu.findOne({ date: { $gte: startLocal, $lte: endLocal }, repas });
}

// Vérifie s'il reste de la place dans le menu pour de nouvelles réservations
async function ensureMenuCapacity({ dateISO, repas, additionalSeatsNeeded }) {
  const needed = Number(additionalSeatsNeeded || 0);
  const menu = await findMenuByDateAndRepas(dateISO, repas);
  if (!menu || needed <= 0) return menu;

  const remainingCapacity = Math.max(0, (menu.capacite || 0) - (menu.reserve || 0));
  if (remainingCapacity < needed) {
    const error = new Error("La capacite du menu est saturee");
    error.statusCode = 400;
    throw error;
  }
  return menu;
}

// Construit la carte des places (plan de salle) avec les disponibilités réelles
async function buildSeatMapStatus({ dateISO, repas, creneau }) {
  const rows = await Reservation.find({ dateISO, repas, creneau });
  const statusBySeatId = {};
  const now = new Date();

  for (const row of rows) {
    const status = await syncReservationSeatState(row, now);
    if (status === "available") continue;
    for (const seat of row.selectedSeats || []) {
      if (!seat?.id) continue;
      if (status === "occupied" || !statusBySeatId[seat.id]) {
        statusBySeatId[seat.id] = status;
      }
    }
  }

  return SEAT_TABLES.map((table) => ({
    id: table.id,
    label: table.label,
    seats: Array.from({ length: table.seatCount }).map((_, index) => {
      const seatId = `${table.id}-S${index + 1}`;
      return {
        id: seatId,
        label: `${table.id.replace("T", "")}-${index + 1}`,
        tableId: table.id,
        tableLabel: table.label,
        status: statusBySeatId[seatId] || "available",
      };
    }),
  }));
}

// ============================
// ACTIONS ÉTUDIANT
// ============================

// Permet à un étudiant de créer une nouvelle réservation
exports.createReservation = async (req, res) => {
  try {
    const { dateISO, typeRepas } = req.body;
    const repas = (req.body?.repas || req.body?.creneau || "").toLowerCase();
    const requestedGroupSize = parseInt(req.body?.groupSize, 10);
    const groupSize = Number.isFinite(requestedGroupSize) && requestedGroupSize > 0 ? requestedGroupSize : 1;
    const selectedSeats = Array.isArray(req.body?.selectedSeats)
      ? req.body.selectedSeats.map((seat) => ({
          id: seat?.id ? String(seat.id) : undefined,
          label: seat?.label ? String(seat.label) : undefined,
          tableId: seat?.tableId ? String(seat.tableId) : undefined,
          tableLabel: seat?.tableLabel ? String(seat.tableLabel) : undefined,
          status: "reserved",
        }))
      : [];
    const creneau = req.body?.horaire || req.body?.creneau;

    if (!dateISO || !repas || !creneau) {
      return res.status(400).json({ message: "Paramètres manquants" });
    }
    if (!["dejeuner", "diner", "libre"].includes(repas)) {
      return res.status(400).json({ message: "repas invalide" });
    }
    if ((typeRepas || "surPlace") === "surPlace" && selectedSeats.length !== groupSize) {
      return res.status(400).json({ message: "Le nombre de chaises doit correspondre au nombre de personnes" });
    }

    const student = await Student.findById(req.studentId);
    if (!student) return res.status(404).json({ message: "Étudiant introuvable" });

    const dup = await Reservation.findOne({
      student: student._id,
      dateISO,
      repas,
      status: { $in: ["ACTIVE", "EXPIRED", "CONSUMED"] }
    });
    if (dup) {
      return res.status(400).json({ message: "Vous avez deja une reservation pour ce repas a cette date." });
    }

    let existingMenu = await ensureMenuCapacity({ dateISO, repas, additionalSeatsNeeded: groupSize });
    if (!existingMenu) {
      return res.status(400).json({ message: "Pas de menu pour ce repas à cette date" });
    }

    const blocked = student.blockedTickets || 0;
    const total = student.soldeTickets || 0;
    const available = total - blocked;

    if (available < groupSize) {
      return res.status(400).json({ message: "Solde insuffisant pour réserver" });
    }

    student.blockedTickets = blocked + groupSize;
    await student.save();

    const payload = {
      type: "RESERVATION",
      studentId: student._id.toString(),
      dateISO,
      repas,
      creneau,
      groupSize,
      selectedSeats,
    };
    const qrPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");

    const reservation = await Reservation.create({
      student: student._id,
      dateISO,
      repas,
      creneau,
      typeRepas: typeRepas || "surPlace",
      groupSize,
      selectedSeats: (typeRepas || "surPlace") === "surPlace" ? selectedSeats : [],
      status: "ACTIVE",
      qrPayload
    });

    try {
      existingMenu.reserve = (existingMenu.reserve || 0) + groupSize;
      await existingMenu.save();
    } catch (e) {}

    res.status(201).json({
      message: "Réservation créée",
      reservation: {
        id: reservation._id,
        status: "ACTIVE",
        dateISO: reservation.dateISO,
        repas: reservation.repas,
        creneau: reservation.creneau,
        typeRepas: reservation.typeRepas,
        groupSize: reservation.groupSize,
        selectedSeats: withSeatStatuses(reservation),
        canLeave: false,
        qrPayload: reservation.qrPayload
      },
      solde: { total: student.soldeTickets, blocked: student.blockedTickets }
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// Liste les réservations de l'étudiant (A venir, Historique, Annulées)
exports.getReservations = async (req, res) => {
  try {
    const { scope } = req.query;
    await Reservation.updateMany({ student: req.studentId, status: "PENDING" }, { $set: { status: "ACTIVE" } });

    let baseFilter = { student: req.studentId };
    if (scope === "cancelled") {
      baseFilter.status = "CANCELLED";
    } else if (scope === "history") {
      baseFilter.status = { $in: ["CONSUMED", "EXPIRED", "ACTIVE"] };
    } else {
      baseFilter.status = "ACTIVE";
    }

    const rows = await Reservation.find(baseFilter).sort({ createdAt: -1 });

    const mapped = await Promise.all(rows.map(async (r) => {
      const now = new Date();
      const expiredCalc = r.status === "ACTIVE" && isExpired(r.dateISO, r.creneau);
      if (expiredCalc && r.status !== "EXPIRED" && r.status !== "CONSUMED" && r.status !== "CANCELLED") {
        r.status = "EXPIRED";
        setReservationSeatStatus(r, "available");
        await r.save();
        const student = await Student.findById(req.studentId);
        if (student) {
          student.blockedTickets = Math.max(0, (student.blockedTickets || 0) - (r.groupSize || 1));
          await student.save();
        }
      }
      await syncReservationSeatState(r, now);
      const canEdit = r.status === "ACTIVE" && !expiredCalc && canActOnReservation(r.dateISO, r.creneau);
      return {
        id: r._id,
        dateISO: r.dateISO,
        repas: r.repas,
        creneau: r.creneau,
        typeRepas: r.typeRepas,
        groupSize: r.groupSize || 1,
        selectedSeats: withSeatStatuses(r, now),
        status: r.status,
        qrPayload: r.qrPayload,
        updatedAt: r.updatedAt,
        leftRestaurantAt: r.leftRestaurantAt || null,
        canLeave: canLeaveRestaurant(r, now),
        actions: { canEdit, canCancel: canEdit }
      };
    }));

    let out;
    if (scope === "cancelled") {
      out = mapped.filter((m) => m.status === "CANCELLED");
    } else if (scope === "history") {
      out = mapped.filter((m) => m.status === "CONSUMED" || m.status === "EXPIRED");
    } else {
      out = mapped.filter((m) => m.status === "ACTIVE");
    }
    res.json({ reservations: out });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// Récupère les détails d'une réservation spécifique
exports.getReservationById = async (req, res) => {
  try {
    const { id } = req.params;
    const reservation = await Reservation.findById(id);
    if (!reservation) return res.status(404).json({ message: "Réservation introuvable" });
    if (String(reservation.student) !== String(req.studentId)) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const expiredCalc = reservation.status === "ACTIVE" && isExpired(reservation.dateISO, reservation.creneau);
    if (expiredCalc && reservation.status !== "EXPIRED" && reservation.status !== "CONSUMED" && reservation.status !== "CANCELLED") {
      reservation.status = "EXPIRED";
      setReservationSeatStatus(reservation, "available");
      await reservation.save();
      const student = await Student.findById(req.studentId);
      if (student) {
        student.blockedTickets = Math.max(0, (student.blockedTickets || 0) - (reservation.groupSize || 1));
        await student.save();
      }
    }

    const now = new Date();
    await syncReservationSeatState(reservation, now);
    res.json({
      reservation: {
        id: reservation._id,
        dateISO: reservation.dateISO,
        repas: reservation.repas,
        creneau: reservation.creneau,
        typeRepas: reservation.typeRepas,
        status: reservation.status,
        qrPayload: reservation.qrPayload,
        groupSize: reservation.groupSize || 1,
        selectedSeats: withSeatStatuses(reservation, now),
        canLeave: canLeaveRestaurant(reservation, now),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// Récupère le plan des tables pour un créneau donné
exports.getSeatMap = async (req, res) => {
  try {
    const { dateISO, repas, creneau } = req.query || {};
    if (!dateISO || !repas || !creneau) {
      return res.status(400).json({ message: "Paramètres manquants" });
    }
    const tables = await buildSeatMapStatus({ dateISO: String(dateISO), repas: String(repas), creneau: String(creneau) });
    res.json({ tables });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// Enregistre l'heure à laquelle l'étudiant quitte le restaurant (libère la table)
exports.leaveRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    const reservation = await Reservation.findById(id);
    if (!reservation) return res.status(404).json({ message: "Réservation introuvable" });
    if (String(reservation.student) !== String(req.studentId)) {
      return res.status(403).json({ message: "Accès refusé" });
    }
    if (!canLeaveRestaurant(reservation)) {
      return res.status(400).json({ message: "Action impossible pour cette réservation" });
    }

    reservation.leftRestaurantAt = new Date();
    setReservationSeatStatus(reservation, "available");
    await reservation.save();

    res.json({
      message: "Sortie enregistrée",
      reservation: {
        id: reservation._id,
        status: reservation.status,
        leftRestaurantAt: reservation.leftRestaurantAt,
        selectedSeats: withSeatStatuses(reservation),
        canLeave: false,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// Permet à l'étudiant d'envoyer un avis sur la qualité du service après son repas
exports.submitServiceFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { serviceRating, mealRating, ambianceRating, comment } = req.body || {};

    const reservation = await Reservation.findById(id);
    if (!reservation) return res.status(404).json({ message: "Réservation introuvable" });
    if (String(reservation.student) !== String(req.studentId)) {
      return res.status(403).json({ message: "Accès refusé" });
    }
    if (reservation.typeRepas !== "surPlace" && reservation.typeRepas !== "aEmporter") {
      return res.status(400).json({ message: "Avis indisponible pour ce type de repas" });
    }
    if (reservation.typeRepas === "surPlace" && !reservation.leftRestaurantAt) {
      return res.status(400).json({ message: "Quittez le resto avant de donner votre avis" });
    }

    const ratings = [serviceRating, mealRating, ambianceRating].map((value) => Number(value));
    if (ratings.some((value) => !Number.isFinite(value) || value < 1 || value > 5)) {
      return res.status(400).json({ message: "Veuillez donner une note de 1 a 5 pour chaque critere" });
    }

    const feedback = await ServiceFeedback.findOneAndUpdate(
      { reservation: reservation._id },
      {
        student: req.studentId,
        reservation: reservation._id,
        serviceRating: ratings[0],
        mealRating: ratings[1],
        ambianceRating: ratings[2],
        comment: String(comment || "").trim(),
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({
      message: "Merci pour votre avis",
      feedback: {
        id: feedback._id,
        serviceRating: feedback.serviceRating,
        mealRating: feedback.mealRating,
        ambianceRating: feedback.ambianceRating,
        comment: feedback.comment,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// Annule une réservation active (libère les tickets bloqués)
exports.cancelReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const reservation = await Reservation.findById(id);
    if (!reservation) return res.status(404).json({ message: "Réservation introuvable" });
    if (String(reservation.student) !== String(req.studentId)) {
      return res.status(403).json({ message: "Accès refusé" });
    }
    if (reservation.status !== "ACTIVE") {
      return res.status(400).json({ message: "Seule une réservation ACTIVE peut être annulée" });
    }
    if (!canActOnReservation(reservation.dateISO, reservation.creneau)) {
      return res.status(400).json({ message: "Délai d'annulation dépassé (1h avant)" });
    }

    reservation.status = "CANCELLED";
    setReservationSeatStatus(reservation, "available");
    await reservation.save();

    const student = await Student.findById(req.studentId);
    if (student) {
      student.blockedTickets = Math.max(0, (student.blockedTickets || 0) - (reservation.groupSize || 1));
      await student.save();
    }

    res.json({
      message: "Réservation annulée avec succès",
      reservation: { id: reservation._id, status: "CANCELLED" },
      solde: student ? { total: student.soldeTickets, blocked: student.blockedTickets } : null
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// ============================
// ACTIONS ADMIN
// ============================

// Valide le passage d'un étudiant en scannant son QR Code de réservation
exports.consumeByQR = async (req, res) => {
  //L'existence
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
    const reservation = await Reservation.findOne({ student: studentId, dateISO, repas, creneau });
    if (!reservation) return res.status(404).json({ message: "Réservation introuvable" });

    //Le statut
    if (reservation.status === "CANCELLED") return res.status(400).json({ message: "Réservation annulée" });
    if (reservation.status === "CONSUMED") return res.status(400).json({ message: "Déjà consommée" });

    //L'heure (Le timing) :
    const { start } = parseStartEnd(reservation.dateISO, reservation.creneau);
    if (start) {
      const now = new Date();
      const graceStart = new Date(start.getTime() - 120 * 60 * 1000);
      if (now < graceStart) return res.status(400).json({ message: "Trop tôt pour scanner" });
    }

    reservation.status = "CONSUMED";
    setReservationSeatStatus(reservation, "occupied");
    await reservation.save();

    //L'identité
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

    res.json({ message: "Passage validé", reservation: { id: reservation._id, status: "CONSUMED" } });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// Liste toutes les réservations (utilisé par le tableau de bord admin)
exports.listReservations = async (req, res) => {
  try {
    const { q, dateISO, dateFrom, dateTo, repas, status, typeRepas, page = 1, limit = 100, sort = "-createdAt" } = req.query || {};
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 100));

    const match = {};
    if (dateISO) match.dateISO = String(dateISO);
    if (dateFrom || dateTo) {
      match.dateISO = match.dateISO || {};
      if (dateFrom) match.dateISO.$gte = String(dateFrom);
      if (dateTo) match.dateISO.$lte = String(dateTo);
    }
    if (repas && repas !== "ALL") match.repas = String(repas);
    if (status && status !== "ALL") match.status = String(status);
    if (typeRepas && typeRepas !== "ALL") match.typeRepas = String(typeRepas);

    const studentMatch = q ? {
      $or: [
        { firstName: { $regex: new RegExp(escapeRegExp(q), "i") } },
        { lastName: { $regex: new RegExp(escapeRegExp(q), "i") } },
        { email: { $regex: new RegExp(escapeRegExp(q), "i") } },
        { studentNumber: { $regex: new RegExp(escapeRegExp(q), "i") } },
      ],
    } : null;

    const [itemsRaw, totalCount, statusStats] = await Promise.all([
      Reservation.find(match)
        .populate({ path: "student", select: "firstName lastName email studentNumber", match: studentMatch || undefined })
        .sort(sort)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Reservation.countDocuments(match),
      Reservation.aggregate([
        { $match: match },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ])
    ]);

    // Filtrer les réservations dont l'étudiant ne correspond pas à la recherche 'q'
    const items = itemsRaw.filter((r) => !studentMatch || !!r.student);
    
    const stats = {};
    statusStats.forEach(s => {
      stats[s._id] = s.count;
    });

    res.json({ 
      reservations: items, 
      page: pageNum, 
      total: totalCount,
      stats
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// Permet à l'admin de forcer le changement de statut d'une réservation (ex: annuler manuellement)
exports.updateReservationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["ACTIVE", "CONSUMED", "CANCELLED", "EXPIRED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Statut invalide" });
    }

    const reservation = await Reservation.findById(id);
    if (!reservation) return res.status(404).json({ message: "Réservation introuvable" });

    const oldStatus = reservation.status;
    reservation.status = status;

    if (status === "CONSUMED") {
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
    } else {
      setReservationSeatStatus(reservation, "available");
    }

    await reservation.save();

    // Si on annule une réservation ACTIVE, on rend les tickets à l'étudiant
    if (oldStatus === "ACTIVE" && status === "CANCELLED") {
      const student = await Student.findById(reservation.student);
      if (student) {
        const count = reservation.groupSize || 1;
        student.blockedTickets = Math.max(0, (student.blockedTickets || 0) - count);
        await student.save();
      }
    }

    // Si on réactive une réservation ANNULEE, on re-bloque les tickets
    if (oldStatus === "CANCELLED" && status === "ACTIVE") {
       const student = await Student.findById(reservation.student);
       if (student) {
         const count = reservation.groupSize || 1;
         student.blockedTickets = (student.blockedTickets || 0) + count;
         await student.save();
       }
    }

    res.json({ message: "Statut mis à jour", reservation });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// Liste les feedbacks de service reçus (pour analyse admin)
exports.listReservationFeedbacks = async (req, res) => {
  try {
    const { q } = req.query || {};
    
    const match = {};
    if (q) {
      const studentMatch = {
        $or: [
          { firstName: { $regex: new RegExp(escapeRegExp(q), "i") } },
          { lastName: { $regex: new RegExp(escapeRegExp(q), "i") } },
          { email: { $regex: new RegExp(escapeRegExp(q), "i") } },
          { studentNumber: { $regex: new RegExp(escapeRegExp(q), "i") } },
        ],
      };
      // On cherche les étudiants correspondants d'abord
      const students = await Student.find(studentMatch).select("_id");
      match.student = { $in: students.map(s => s._id) };
    }

    const [feedbacks, stats] = await Promise.all([
      ServiceFeedback.find(match)
        .populate("student", "firstName lastName email studentNumber")
        .populate("reservation", "dateISO repas creneau typeRepas status")
        .sort({ createdAt: -1 }),
      ServiceFeedback.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            avgService: { $avg: "$serviceRating" },
            avgMeal: { $avg: "$mealRating" },
            avgAmbiance: { $avg: "$ambianceRating" },
          },
        },
      ]),
    ]);

    const statData = stats[0] || { total: 0, avgService: 0, avgMeal: 0, avgAmbiance: 0 };

    res.json({
      feedbacks,
      total: statData.total,
      averages: {
        service: statData.avgService,
        meal: statData.avgMeal,
        ambiance: statData.avgAmbiance,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// Permet à l'étudiant de modifier sa réservation (horaire, places, etc.)
exports.updateReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { typeRepas } = req.body || {};
    const horaireIn = req.body?.horaire || req.body?.creneau;
    const requestedGroupSize = parseInt(req.body?.groupSize, 10);
    const nextGroupSize = Number.isFinite(requestedGroupSize) && requestedGroupSize > 0 ? requestedGroupSize : undefined;
    const nextSelectedSeats = Array.isArray(req.body?.selectedSeats)
      ? req.body.selectedSeats.map((seat) => ({
          id: seat?.id ? String(seat.id) : undefined,
          label: seat?.label ? String(seat.label) : undefined,
          tableId: seat?.tableId ? String(seat.tableId) : undefined,
          tableLabel: seat?.tableLabel ? String(seat.tableLabel) : undefined,
          status: "reserved",
        }))
      : undefined;

    const reservation = await Reservation.findById(id);
    if (!reservation) return res.status(404).json({ message: "Réservation introuvable" });
    if (String(reservation.student) !== String(req.studentId)) return res.status(403).json({ message: "Accès refusé" });

    if (!canActOnReservation(reservation.dateISO, reservation.creneau)) {
      return res.status(400).json({ message: "Délai de modification dépassé (1h avant)" });
    }

    if (horaireIn) reservation.creneau = horaireIn;
    if (typeRepas) reservation.typeRepas = typeRepas;
    if (nextGroupSize) reservation.groupSize = nextGroupSize;
    if (nextSelectedSeats) reservation.selectedSeats = nextSelectedSeats;

    await reservation.save();
    res.json({ message: "Réservation mise à jour", reservation });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};
