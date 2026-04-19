// Controleur etudiant.
// C'est ici qu'on gere l'inscription, la connexion, les tickets, les reservations et les notifications.

﻿// Import des modÃ¨les (MongoDB)
const Student = require("../models/Student"); // modÃ¨le Ã©tudiant
const Reservation = require("../models/Reservation"); // modÃ¨le rÃ©servation
const Menu = require("../models/Menu"); // modÃ¨le menu pour vÃ©rification disponibilitÃ©
const KitchenOrder = require("../models/KitchenOrder");
const ServiceFeedback = require("../models/ServiceFeedback");
const StudentNotification = require("../models/StudentNotification");

// Import des librairies
const jwt = require("jsonwebtoken"); // pour crÃ©er des tokens JWT
const BlacklistedToken = require("../models/BlacklistedToken"); // tokens blacklistÃ©s (logout)
const crypto = require("crypto"); // (pas encore utilisÃ© ici)

// Helpers de reservation
function parseStartEnd(dateISO, creneau) {
  // Transforme "12h00 -> 13h15" en objets Date pour les regles metier.
  try {
    const parts = String(creneau).split(/â†’|-/).map(s => s.trim());
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
function isExpired(dateISO, creneau) {
  // Une reservation expire un peu apres la fin du creneau.
  const { end } = parseStartEnd(dateISO, creneau);
  if (!end) return false;
  const now = new Date();
  const expireAt = new Date(end.getTime() + 35 * 60 * 1000); // 35 minutes aprÃ¨s la fin
  return now >= expireAt;
}
function canActOnReservation(dateISO, creneau) {
  // On autorise modification / annulation seulement avant une certaine limite.
  const { start } = parseStartEnd(dateISO, creneau);
  if (!start) return false;
  const now = new Date();
  const limit = new Date(start.getTime() - 60 * 60 * 1000); // 1h avant
  return now < limit;
}

const SEAT_TABLES = [
  // Configuration simple du plan de salle cote backend.
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

function getReservationSeatStatus(reservation, now = new Date()) {
  // Calcule l'etat logique des places a partir du statut de reservation.
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

function withSeatStatuses(reservation, now = new Date()) {
  return (reservation.selectedSeats || []).map((seat) => ({
    id: seat?.id,
    label: seat?.label,
    tableId: seat?.tableId,
    tableLabel: seat?.tableLabel,
    status: seat?.status || getReservationSeatStatus(reservation, now),
  }));
}

function canLeaveRestaurant(reservation, now = new Date()) {
  if (!reservation || reservation.status !== "CONSUMED" || reservation.leftRestaurantAt) return false;
  const { end } = parseStartEnd(reservation.dateISO, reservation.creneau);
  if (!end) return true;
  return now <= end;
}

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

async function adjustMenuReserve({ dateISO, repas, delta }) {
  if (!dateISO || !repas || !delta) return;
  const menu = await findMenuByDateAndRepas(dateISO, repas);
  if (!menu) return;
  menu.reserve = Math.max(0, (menu.reserve || 0) + delta);
  await menu.save();
}

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

function mapKitchenOrderStatusToNotification(order) {
  const reservationId = order?.reservation?._id || order?.reservation;
  const code = reservationId ? `#${String(reservationId).slice(-6).toUpperCase()}` : `CMD-${String(order?._id || "").slice(-4).toUpperCase()}`;

  switch (order?.status) {
    case "EN_ATTENTE":
      return {
        key: `order:${order._id}:pending`,
        type: "order",
        title: "Votre commande est en attente",
        body: `Votre commande ${code} a bien ete enregistree et attend son passage en cuisine.`,
        icon: "time-outline",
        tint: "#A26A1A",
        bg: "#FFF4DE",
        sourceCreatedAt: order?.createdAt || new Date(),
      };
    case "EN_PREPARATION":
      return {
        key: `order:${order._id}:preparing`,
        type: "order",
        title: "Votre commande est en preparation",
        body: `Le chef prepare actuellement votre commande ${code}.`,
        icon: "flame-outline",
        tint: "#C46B1E",
        bg: "#FFE8D6",
        sourceCreatedAt: order?.preparingAt || order?.updatedAt || new Date(),
      };
    case "PRET":
      return {
        key: `order:${order._id}:ready`,
        type: "order",
        title: "Votre commande est prete",
        body: `Votre commande ${code} est disponible au comptoir. Code retrait: ${code}.`,
        icon: "checkmark-circle-outline",
        tint: "#15965F",
        bg: "#E4F8EC",
        sourceCreatedAt: order?.readyAt || order?.updatedAt || new Date(),
      };
    case "SERVED":
      return {
        key: `order:${order._id}:served`,
        type: "order",
        title: "Commande servie",
        body: `Votre commande ${code} a ete remise avec succes.`,
        icon: "restaurant-outline",
        tint: "#3867D6",
        bg: "#E8EEFF",
        sourceCreatedAt: order?.servedAt || order?.updatedAt || new Date(),
      };
    default:
      return null;
  }
}

async function syncStudentNotifications(studentId) {
  // Reconstruit les notifications utiles a partir des commandes, reservations et menus.
  const notifications = [];
  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const [orders, reservations, menus] = await Promise.all([
    KitchenOrder.find({ student: studentId })
      .sort({ createdAt: -1 })
      .populate("reservation", "_id")
      .lean(),
    Reservation.find({ student: studentId, status: "CONSUMED", typeRepas: "surPlace" }).lean(),
    Menu.find({
      date: {
        $gte: new Date(`${todayISO}T00:00:00.000Z`),
        $lte: new Date(`${todayISO}T23:59:59.999Z`),
      },
    }).lean(),
  ]);

  for (const order of orders) {
    const item = mapKitchenOrderStatusToNotification(order);
    if (item) notifications.push(item);
  }

  for (const reservation of reservations) {
    if (!canLeaveRestaurant(reservation)) continue;
    notifications.push({
      key: `reservation:${reservation._id}:consumed`,
      type: "reservation",
      title: "Votre repas est servi",
      body: "Pensez a quitter le resto une fois votre repas termine.",
      icon: "log-out-outline",
      tint: "#9A6A2F",
      bg: "#FFF1DE",
      actionLabel: "Voir ma reservation",
      actionRoute: "StudentReservations",
      sourceCreatedAt: reservation?.updatedAt || reservation?.createdAt || new Date(),
    });
  }

  if (Array.isArray(menus) && menus.length > 0) {
    const menuDates = menus
      .map((menu) => menu?.updatedAt || menu?.createdAt || null)
      .filter(Boolean)
      .map((value) => new Date(value))
      .filter((value) => !Number.isNaN(value.getTime()));

    notifications.push({
      key: `menu:${todayISO}:${menus.map((menu) => menu?._id || menu?.repas || "").join("-")}`,
      type: "menu",
      title: "Menu du jour disponible",
      body: `Le menu du jour est disponible avec ${menus.length} proposition${menus.length > 1 ? "s" : ""}.`,
      icon: "restaurant-outline",
      tint: "#2A8C60",
      bg: "#E4F5EC",
      sourceCreatedAt: menuDates.length ? new Date(Math.max(...menuDates.map((value) => value.getTime()))) : new Date(`${todayISO}T06:00:00.000Z`),
    });
  }

  for (const item of notifications) {
    await StudentNotification.findOneAndUpdate(
      { student: studentId, key: item.key },
      {
        $set: {
          type: item.type,
          title: item.title,
          body: item.body,
          icon: item.icon,
          tint: item.tint,
          bg: item.bg,
          actionLabel: item.actionLabel || null,
          actionRoute: item.actionRoute || null,
          sourceCreatedAt: item.sourceCreatedAt || new Date(),
        },
        $setOnInsert: {
          read: false,
          dismissed: false,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  return StudentNotification.find({ student: studentId, dismissed: false })
    .sort({ sourceCreatedAt: -1, createdAt: -1 })
    .lean();
}

async function buildSeatMapStatus({ dateISO, repas, creneau }) {
  // Construit la carte des places disponibles pour un creneau donne.
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
// INSCRIPTION Ã‰TUDIANT
// ============================
exports.signup = async (req, res) => {
  try {
    // Cree un compte etudiant en statut PENDING.
    // RÃ©cupÃ©ration des donnÃ©es envoyÃ©es depuis le frontend
    const {
      firstName,
      lastName,
      dateOfBirth,
      email,
      phone,
      university,
      level,
      studentNumber,
      password
    } = req.body;

    // VÃ©rifier si tous les champs sont remplis
    if (!firstName || !lastName || !dateOfBirth || !email || !phone || !university || !level || !studentNumber || !password) {
      return res.status(400).json({ message: "Champs manquants" });
    }

    // VÃ©rification format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Email invalide" });
    }

    // VÃ©rification format numÃ©ro Ã©tudiant (ex: UNI-2024-0001)
    const studentNumberRegex = /^UNI-\d{4}-\d{4}$/;
    if (!studentNumberRegex.test(studentNumber)) {
      return res.status(400).json({ message: "NumÃ©ro Ã©tudiant invalide (format UNI-YYYY-NNNN)" });
    }

    // VÃ©rifier si image carte Ã©tudiant envoyÃ©e
    if (!req.files || !req.files.card || req.files.card.length === 0) {
      return res.status(400).json({ message: "Carte Ã©tudiant obligatoire" });
    }

    // RÃ©cupÃ©rer image uploadÃ©e
    const cardImage = req.files.card[0].filename;

    // Selfie non utilisÃ© pour le moment
    const selfieImage = undefined;

    // VÃ©rifier si email existe dÃ©jÃ 
    const existsEmail = await Student.findOne({ email });
    if (existsEmail) return res.status(409).json({ message: "Email dÃ©jÃ  utilisÃ©" });

    // VÃ©rifier si numÃ©ro Ã©tudiant existe dÃ©jÃ 
    const existsNumber = await Student.findOne({ studentNumber });
    if (existsNumber) return res.status(409).json({ message: "NumÃ©ro Ã©tudiant dÃ©jÃ  utilisÃ©" });

    // CrÃ©ation du nouvel Ã©tudiant
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
      selfieImage,
      password // normalement hashÃ© dans le model
    });

    // Sauvegarde en base
    await student.save();

    // RÃ©ponse succÃ¨s
    res.status(201).json({ message: "Inscription rÃ©ussie, statut EN ATTENTE" });

  } catch (error) {
    // Gestion erreur duplication MongoDB
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({ message: `${field} dÃ©jÃ  utilisÃ©` });
    }

    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// ============================
// LOGIN (CONNEXION)
// ============================
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Connexion possible seulement si le compte a ete accepte par l'admin.
    // Chercher Ã©tudiant par email
    const student = await Student.findOne({ email });
    if (!student) return res.status(401).json({ message: "Identifiants invalides" });

    // VÃ©rifier mot de passe
    const valid = await student.isValidPassword(password);
    if (!valid) return res.status(401).json({ message: "Identifiants invalides" });

    // VÃ©rifier si admin a acceptÃ© le compte
    if (student.status !== "ACCEPTED") {
      return res.status(403).json({ message: "Compte en attente de validation par lâ€™administration" });
    }

    // GÃ©nÃ©rer token JWT
    const token = jwt.sign(
      { id: student._id, email: student.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Envoyer token
    res.json({ message: "Connexion rÃ©ussie", token });

  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// ============================
// GET PROFIL CONNECTÃ‰
// ============================
exports.getMe = async (req, res) => {
  try {
    // rÃ©cupÃ©rer Ã©tudiant sans password
    const student = await Student.findById(req.studentId).select("-password");

    if (!student) return res.status(404).json({ message: "Ã‰tudiant introuvable" });

    res.json({ student });

  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// ============================
// LOGOUT
// ============================
exports.logout = async (req, res) => {
  try {
    // rÃ©cupÃ©rer token depuis header
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Token manquant" });

    const token = authHeader.split(" ")[1];

    // dÃ©coder token
    const decoded = jwt.decode(token);
    if (!decoded) return res.status(400).json({ message: "Token invalide" });

    // rÃ©cupÃ©rer date expiration
    const expiresAt = new Date(decoded.exp * 1000);

    // ajouter token Ã  blacklist
    await BlacklistedToken.create({ token, expiresAt });

    res.json({ message: "DÃ©connexion rÃ©ussie" });

  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// ============================
// RECHARGER WALLET (TICKETS)
// ============================
exports.creditWallet = async (req, res) => {
  try {
    // Ajoute des tickets au portefeuille de l'etudiant.
    const { nbTickets } = req.body;

    // convertir en nombre
    const value = parseInt(nbTickets, 10);

    if (!Number.isFinite(value) || value <= 0) {
      return res.status(400).json({ message: "nbTickets invalide" });
    }

    const student = await Student.findById(req.studentId);
    if (!student) return res.status(404).json({ message: "Ã‰tudiant introuvable" });

    // ajouter tickets
    student.soldeTickets = (student.soldeTickets || 0) + value;

    await student.save();

    res.json({ message: "Solde mis Ã  jour", soldeTickets: student.soldeTickets });

  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// ============================
// COMMANDES CUISINE DE L'ETUDIANT
// ============================
exports.getMyOrders = async (req, res) => {
  try {
    // Retourne l'historique des commandes cuisine de l'etudiant.
    const orders = await KitchenOrder.find({ student: req.studentId })
      .sort({ createdAt: -1 })
      .populate("reservation", "groupSize typeRepas status selectedSeats")
      .lean();

    res.json({ orders });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

exports.confirmOrderReceipt = async (req, res) => {
  try {
    const order = await KitchenOrder.findOne({ _id: req.params.id, student: req.studentId });
    if (!order) return res.status(404).json({ message: "Commande introuvable" });
    if (order.status !== "SERVED") {
      return res.status(400).json({ message: "Seule une commande servie peut etre confirmee" });
    }
    if (order.studentConfirmedAt) {
      return res.json({ message: "Reception de commande deja confirmee", order });
    }

    order.studentConfirmedAt = new Date();
    await order.save();

    res.json({ message: "Reception de commande confirmee", order });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

exports.getMyNotifications = async (req, res) => {
  try {
    // Les notifications sont regenerees a partir des donnees actuelles.
    const notifications = await syncStudentNotifications(req.studentId);
    res.json({
      notifications: notifications.map((item) => ({
        id: item._id,
        type: item.type,
        title: item.title,
        body: item.body,
        icon: item.icon,
        tint: item.tint,
        bg: item.bg,
        actionLabel: item.actionLabel,
        actionRoute: item.actionRoute,
        createdAt: item.sourceCreatedAt || item.createdAt,
        read: !!item.read,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

exports.markNotificationsRead = async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ids.length) return res.json({ message: "Aucune notification a marquer" });

    await StudentNotification.updateMany(
      { _id: { $in: ids }, student: req.studentId },
      { $set: { read: true } }
    );

    res.json({ message: "Notifications marquees comme lues" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

exports.dismissNotification = async (req, res) => {
  try {
    const notification = await StudentNotification.findOneAndUpdate(
      { _id: req.params.id, student: req.studentId },
      { $set: { dismissed: true } },
      { new: true }
    );

    if (!notification) return res.status(404).json({ message: "Notification introuvable" });
    res.json({ message: "Notification supprimee" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// ============================
// CRÃ‰ER UNE RÃ‰SERVATION
// ============================
exports.createReservation = async (req, res) => {
  try {
    // Etapes clefs:
    // 1. valider les donnees
    // 2. verifier tickets et capacite
    // 3. creer le QR payload
    // 4. enregistrer la reservation
    const { dateISO, typeRepas } = req.body;
    const repas = (req.body?.repas || req.body?.creneau || "").toLowerCase(); // choisir d'abord 'repas' (dejeuner|diner)
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
    const creneau = req.body?.horaire || req.body?.creneau; // horaire humain (ex: "12h00 â†’ 13h15")

    // vÃ©rifier paramÃ¨tres
    if (!dateISO || !repas || !creneau) {
      return res.status(400).json({ message: "ParamÃ¨tres manquants" });
    }
    if (!["dejeuner", "diner", "libre"].includes(repas)) {
      return res.status(400).json({ message: "repas invalide" });
    }
    if ((typeRepas || "surPlace") === "surPlace" && selectedSeats.length !== groupSize) {
      return res.status(400).json({ message: "Le nombre de chaises doit correspondre au nombre de personnes" });
    }

    const student = await Student.findById(req.studentId);
    if (!student) return res.status(404).json({ message: "Ã‰tudiant introuvable" });

    // (rollback) Ne pas modifier automatiquement les tickets bloquÃ©s ici

    const dup = await Reservation.findOne({
      student: student._id,
      dateISO,
      repas,
      status: { $in: ["ACTIVE", "EXPIRED", "CONSUMED"] }
    });
    if (dup) {
      return res.status(400).json({ message: "Vous avez deja une reservation pour ce repas a cette date." });
    }

    // vÃ©rifier qu'un menu existe pour ce jour et ce repas (dÃ©jeuner/dÃ®ner/libre)
    // Utilise bornes en UTC pour Ã©viter les dÃ©calages de fuseau
    let existingMenu = await ensureMenuCapacity({ dateISO, repas, additionalSeatsNeeded: groupSize });
    if (!existingMenu) {
      return res.status(400).json({ message: "Pas de menu pour ce repas Ã  cette date" });
    }

    // calcul tickets disponibles
    const blocked = student.blockedTickets || 0;
    const total = student.soldeTickets || 0;
    const available = total - blocked;

    // vÃ©rifier solde
    if (available < groupSize) {
      return res.status(400).json({ message: "Solde insuffisant pour rÃ©server" });
    }

    // bloquer le nombre de tickets correspondant au groupe
    student.blockedTickets = blocked + groupSize;
    await student.save();

    // Le QR code contient les infos minimales pour le scan admin.
    const payload = {
      type: "RESERVATION",
      studentId: student._id.toString(),
      dateISO,
      repas,
      creneau,
      groupSize,
      selectedSeats,
    };

    // encoder en base64
    const qrPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");

    // crÃ©er rÃ©servation
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

    // IncrÃ©menter le compteur de rÃ©servations du menu du jour
    try {
      existingMenu.reserve = (existingMenu.reserve || 0) + groupSize;
      await existingMenu.save();
    } catch (e) {
      // best-effort: ne bloque pas la rÃ©ponse en cas d'Ã©chec
    }

    // rÃ©ponse
    res.status(201).json({
      message: "RÃ©servation crÃ©Ã©e",
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

// ============================
// LISTE DES RÃ‰SERVATIONS
// ============================
exports.getReservations = async (req, res) => {
  try {
    const { scope } = req.query;

    await Reservation.updateMany({ student: req.studentId, status: "PENDING" }, { $set: { status: "ACTIVE" } });

    // Selon le scope, on prepare la liste a venir, historique ou annulee.
    let baseFilter = { student: req.studentId };
    if (scope === "cancelled") {
      baseFilter.status = "CANCELLED";
    } else if (scope === "history") {
      baseFilter.status = { $in: ["CONSUMED", "EXPIRED", "ACTIVE"] };
    } else {
      // upcoming par dÃ©faut
      baseFilter.status = "ACTIVE";
    }

    const rows = await Reservation.find(baseFilter).sort({ createdAt: -1 });

    const mapped = await Promise.all(rows.map(async (r) => {
      const now = new Date();
      const expiredCalc = r.status === "ACTIVE" && isExpired(r.dateISO, r.creneau);
      // Si une reservation a depasse sa fenetre, on la passe en EXPIRED.
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
      const statusLabel = r.status;
      const canEdit = r.status === "ACTIVE" && !expiredCalc && canActOnReservation(r.dateISO, r.creneau);
      const canCancel = canEdit; // mÃªmes rÃ¨gles
      return {
        id: r._id,
        dateISO: r.dateISO,
        repas: r.repas,
        creneau: r.creneau,
        typeRepas: r.typeRepas,
        groupSize: r.groupSize || 1,
        selectedSeats: withSeatStatuses(r, now),
        status: statusLabel,
        qrPayload: r.qrPayload,
        updatedAt: r.updatedAt,
        leftRestaurantAt: r.leftRestaurantAt || null,
        canLeave: canLeaveRestaurant(r, now),
        actions: { canEdit, canCancel }
      };
    }));

    // Filtrer selon scope
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
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

exports.getSeatMap = async (req, res) => {
  try {
    // Fournit au mobile l'etat des places avant une reservation sur place.
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

exports.leaveRestaurant = async (req, res) => {
  try {
    // L'etudiant peut liberer sa table apres avoir termine son repas.
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

exports.submitServiceFeedback = async (req, res) => {
  try {
    // Avis de fin de repas pour la reservation concernee.
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

// ============================
exports.updateReservation = async (req, res) => {
  try {
    // Permet de changer horaire, type de repas, groupe ou places tant que la fenetre est ouverte.
    const { id } = req.params;
    const { typeRepas } = req.body || {};
    const horaireIn = req.body?.horaire || req.body?.creneau; // accepter les deux noms
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
    if (!reservation) return res.status(404).json({ message: "RÃ©servation introuvable" });
    if (String(reservation.student) !== String(req.studentId)) {
      return res.status(403).json({ message: "AccÃ¨s refusÃ©" });
    }
    const student = await Student.findById(req.studentId);
    if (!student) return res.status(404).json({ message: "Ã‰tudiant introuvable" });
    const previousGroupSize = reservation.groupSize || 1;
    // Statut et fenÃªtre d'action
    const expired = reservation.status === "ACTIVE" && isExpired(reservation.dateISO, reservation.creneau);
    if (reservation.status !== "ACTIVE" || expired || !canActOnReservation(reservation.dateISO, reservation.creneau)) {
      return res.status(400).json({ message: "Modification impossible (fenÃªtre dÃ©passÃ©e ou statut invalide)" });
    }
    // Appliquer modifications autorisÃ©es
    if (horaireIn) reservation.creneau = String(horaireIn); // stockÃ© dans champ 'creneau' (horaire)
    if (typeRepas) reservation.typeRepas = String(typeRepas) === "Ã Emporter" ? "aEmporter" : String(typeRepas);
    if (typeof nextGroupSize !== "undefined") reservation.groupSize = nextGroupSize;
    if (typeof nextSelectedSeats !== "undefined") reservation.selectedSeats = nextSelectedSeats;
    if (reservation.typeRepas !== "surPlace") reservation.selectedSeats = [];
    if (reservation.typeRepas === "surPlace" && (reservation.selectedSeats || []).length !== (reservation.groupSize || 1)) {
      return res.status(400).json({ message: "Le nombre de chaises doit correspondre au nombre de personnes" });
    }
    if (reservation.status === "ACTIVE") {
      setReservationSeatStatus(reservation, "reserved");
    } else if (reservation.status === "CONSUMED") {
      setReservationSeatStatus(reservation, reservation.leftRestaurantAt ? "available" : "occupied");
    } else {
      setReservationSeatStatus(reservation, "available");
    }
    const nextEffectiveGroupSize = reservation.groupSize || 1;
    const deltaTickets = nextEffectiveGroupSize - previousGroupSize;
    if (deltaTickets > 0) {
      await ensureMenuCapacity({
        dateISO: reservation.dateISO,
        repas: reservation.repas,
        additionalSeatsNeeded: deltaTickets,
      });
      const availableExtra = (student.soldeTickets || 0) - (student.blockedTickets || 0);
      if (availableExtra < deltaTickets) {
        return res.status(400).json({ message: "Solde insuffisant pour modifier la reservation" });
      }
    }
    if (deltaTickets !== 0) {
      student.blockedTickets = Math.max(0, (student.blockedTickets || 0) + deltaTickets);
      await student.save();
    }
    if (deltaTickets !== 0) {
      try {
        await adjustMenuReserve({ dateISO: reservation.dateISO, repas: reservation.repas, delta: deltaTickets });
      } catch (e) {
        // best-effort
      }
    }
    // On regenere le QR si la reservation change.
    const payload = {
      type: "RESERVATION",
      studentId: reservation.student.toString(),
      dateISO: reservation.dateISO,
      repas: reservation.repas,
      creneau: reservation.creneau,
      groupSize: reservation.groupSize || 1,
      selectedSeats: reservation.selectedSeats || []
    };
    reservation.qrPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
    await reservation.save();
    res.json({
      message: "RÃ©servation modifiÃ©e",
      reservation: {
        id: reservation._id,
        dateISO: reservation.dateISO,
        repas: reservation.repas,
        creneau: reservation.creneau,
        typeRepas: reservation.typeRepas,
        groupSize: reservation.groupSize || 1,
        selectedSeats: withSeatStatuses(reservation),
        canLeave: canLeaveRestaurant(reservation),
        status: "ACTIVE",
        qrPayload: reservation.qrPayload
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// ============================
// ANNULER UNE RÃ‰SERVATION
// ============================
exports.cancelReservation = async (req, res) => {
  try {
    // Annule la reservation et libere les tickets / places associes.
    const { id } = req.params;
    const reservation = await Reservation.findById(id);
    if (!reservation) return res.status(404).json({ message: "RÃ©servation introuvable" });
    if (String(reservation.student) !== String(req.studentId)) {
      return res.status(403).json({ message: "AccÃ¨s refusÃ©" });
    }
    const expired = reservation.status === "ACTIVE" && isExpired(reservation.dateISO, reservation.creneau);
    if (reservation.status !== "ACTIVE" || expired || !canActOnReservation(reservation.dateISO, reservation.creneau)) {
      return res.status(400).json({ message: "Annulation impossible (fenÃªtre dÃ©passÃ©e ou statut invalide)" });
    }
    // Passer en CANCELLED et libÃ©rer le ticket bloquÃ©
    reservation.status = "CANCELLED";
    setReservationSeatStatus(reservation, "available");
    await reservation.save();
    const student = await Student.findById(req.studentId);
    if (student) {
      student.blockedTickets = Math.max(0, (student.blockedTickets || 0) - (reservation.groupSize || 1));
      await student.save();
    }
    try {
      await adjustMenuReserve({
        dateISO: reservation.dateISO,
        repas: reservation.repas,
        delta: -(reservation.groupSize || 1),
      });
    } catch (e) {
      // best-effort
    }
    res.json({
      message: "RÃ©servation annulÃ©e",
      reservation: { id: reservation._id, status: "CANCELLED", selectedSeats: withSeatStatuses(reservation), canLeave: false },
      solde: { total: student?.soldeTickets || 0, blocked: student?.blockedTickets || 0 }
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};
