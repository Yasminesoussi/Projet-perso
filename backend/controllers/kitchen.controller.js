// Contrôleur Cuisine.
// Gère le scan des QR codes (arrivée et retrait), l'affichage du tableau de bord cuisine et la gestion des lots (batches).

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

function parseStartEnd(dateISO, creneau) {
  const times = String(creneau).split(/→|-/).map((s) => s.trim());
  const toHM = (t) => {
    const cleaned = String(t).replace(/\s+/g, "");
    const m = cleaned.match(/^(\d{1,2})h?[:]?(\d{2})$/i);
    if (!m) return null;
    return { h: parseInt(m[1], 10), m: parseInt(m[2], 10) };
  };
  const startHM = toHM(times[0] || "");
  const endHM = toHM(times[1] || "");
  if (!startHM) return { start: null, end: null };
  const [y, mo, d] = String(dateISO).split("-").map((n) => parseInt(n, 10));
  const start = new Date(y, (mo || 1) - 1, d || 1, startHM.h, startHM.m, 0, 0);
  let end = endHM
    ? new Date(y, (mo || 1) - 1, d || 1, endHM.h, endHM.m, 0, 0)
    : new Date(start.getTime() + 2 * 60 * 60 * 1000);
  if (endHM && end <= start) {
    end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  }
  return { start, end };
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

    // Vérification : on autorise le scan jusqu'à 2h avant pour gérer les décalages horaires (UTC)
    const { start } = parseStartEnd(reservation.dateISO, reservation.creneau);
    if (start) {
      const now = new Date();
      // On élargit à 120 minutes (2h) pour compenser le décalage du serveur Render (UTC)
      const graceStart = new Date(start.getTime() - 120 * 60 * 1000); 
      if (now < graceStart) {
        return res.status(400).json({ message: "Trop tôt pour scanner" });
      }
    }

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
