const Reservation = require("../models/Reservation");
const KitchenOrder = require("../models/KitchenOrder");
const {
  MAX_BATCH_MEALS,
  ensureKitchenOrderFromReservation,
  launchNextBatch,
  markBatchReady,
  markBatchServed,
  getKitchenDashboard,
} = require("../services/kitchen.service");

function decodeReservationQR(qrPayload) {
  const json = Buffer.from(qrPayload, "base64url").toString("utf8");
  return JSON.parse(json);
}

async function findReservationFromQR(qrPayload) {
  const decoded = decodeReservationQR(qrPayload);
  if (decoded?.type !== "RESERVATION") {
    const error = new Error("QR non supporté");
    error.statusCode = 400;
    throw error;
  }

  const { studentId, dateISO, repas, creneau } = decoded;
  if (!studentId || !dateISO || !repas || !creneau) {
    const error = new Error("QR incomplet");
    error.statusCode = 400;
    throw error;
  }

  let reservation = await Reservation.findOne({ student: studentId, dateISO, repas, creneau });
  if (!reservation) reservation = await Reservation.findOne({ student: studentId, dateISO, repas });
  if (!reservation) {
    const error = new Error("Réservation introuvable");
    error.statusCode = 404;
    throw error;
  }
  return reservation;
}

exports.getDashboard = async (req, res) => {
  try {
    const { dateISO, repas, creneau } = req.query || {};
    if (!dateISO) return res.status(400).json({ message: "dateISO est requis" });

    const data = await getKitchenDashboard({
      dateISO: String(dateISO),
      repas: repas ? String(repas) : undefined,
      creneau: creneau ? String(creneau) : undefined,
    });

    res.json(data);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Erreur serveur" });
  }
};

exports.scanArrival = async (req, res) => {
  try {
    const { qrPayload } = req.body || {};
    if (!qrPayload) return res.status(400).json({ message: "QR manquant" });

    const reservation = await findReservationFromQR(qrPayload);
    if (reservation.status === "CANCELLED") return res.status(400).json({ message: "Réservation annulée" });
    if (reservation.status === "CONSUMED") return res.status(400).json({ message: "Réservation déjà servie" });

    const order = await ensureKitchenOrderFromReservation(reservation);
    res.json({ message: "Commande cuisine enregistrée", order });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Erreur serveur" });
  }
};

exports.launchBatch = async (req, res) => {
  try {
    const { dateISO, repas, creneau, maxMeals } = req.body || {};
    if (!dateISO || !repas || !creneau) {
      return res.status(400).json({ message: "dateISO, repas et creneau sont requis" });
    }

    const batch = await launchNextBatch({
      dateISO: String(dateISO),
      repas: String(repas),
      creneau: String(creneau),
      maxMeals: Number(maxMeals) || MAX_BATCH_MEALS,
    });

    res.status(201).json({ message: "Lot lancé", batch });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Erreur serveur" });
  }
};

exports.markBatchReady = async (req, res) => {
  try {
    const batch = await markBatchReady(req.params.id);
    res.json({ message: "Lot prêt", batch });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Erreur serveur" });
  }
};

exports.markBatchServed = async (req, res) => {
  try {
    const batch = await markBatchServed(req.params.id, req.adminId || null);
    res.json({ message: "Lot servi", batch });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Erreur serveur" });
  }
};

exports.scanPickup = async (req, res) => {
  try {
    const { qrPayload } = req.body || {};
    if (!qrPayload) return res.status(400).json({ message: "QR manquant" });

    const reservation = await findReservationFromQR(qrPayload);
    const order = await KitchenOrder.findOne({ reservation: reservation._id });
    if (!order) return res.status(404).json({ message: "Commande cuisine introuvable" });
    if (order.status !== "PRET") return res.status(400).json({ message: "Commande non prête pour distribution" });

    const batch = await markBatchServed(order.batch, req.adminId || null);
    res.json({ message: "Distribution enregistrée", batch });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || "Erreur serveur" });
  }
};
