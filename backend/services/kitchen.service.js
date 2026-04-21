// Service Cuisine.
// Contient toute la logique métier complexe pour la gestion de la cuisine :
// - Transformation des réservations en commandes cuisine.
// - Gestion des lots (batches) de préparation.
// - Suivi des quantités (en attente, en préparation, prêt, servi).
// - Calcul des résumés de préparation quotidienne.

const Reservation = require("../models/Reservation");
const Passage = require("../models/Passage");
const Student = require("../models/Student");
const KitchenOrder = require("../models/KitchenOrder");
const KitchenBatch = require("../models/KitchenBatch");
const MAX_BATCH_MEALS = 5;

// Génère des identifiants internes pour chaque repas d'une réservation (ex: #ABCDEF-1, #ABCDEF-2)
function buildInternalOrderIds(reservation) {
  const base = `#${String(reservation._id).slice(-6).toUpperCase()}`;
  const quantity = reservation.groupSize || 1;
  return Array.from({ length: quantity }, (_, index) => `${base}-${index + 1}`);
}

// Met à jour l'état visuel des places sur le plan de salle
function setReservationSeatStatus(reservation, nextSeatStatus) {
  reservation.selectedSeats = (reservation.selectedSeats || []).map((seat) => ({
    id: seat?.id,
    label: seat?.label,
    tableId: seat?.tableId,
    tableLabel: seat?.tableLabel,
    status: nextSeatStatus,
  }));
}

// S'assure que les compteurs de quantité d'une commande sont initialisés et cohérents
function normalizeKitchenOrderCounters(order) {
  const hasCounters =
    typeof order.pendingQuantity === "number" &&
    typeof order.preparingQuantity === "number" &&
    typeof order.readyQuantity === "number" &&
    typeof order.servedQuantity === "number";

  if (hasCounters) return false;

  order.pendingQuantity = 0;
  order.preparingQuantity = 0;
  order.readyQuantity = 0;
  order.servedQuantity = 0;

  if (order.status === "SERVED") order.servedQuantity = order.quantity || 0;
  else if (order.status === "PRET") order.readyQuantity = order.quantity || 0;
  else if (order.status === "EN_PREPARATION") order.preparingQuantity = order.quantity || 0;
  else order.pendingQuantity = order.quantity || 0;

  return true;
}

// Synchronise le statut textuel d'une commande en fonction de ses compteurs de quantité
function syncKitchenOrderStatus(order) {
  if ((order.servedQuantity || 0) >= (order.quantity || 0)) {
    order.status = "SERVED";
    return order;
  }
  if ((order.readyQuantity || 0) > 0) {
    order.status = "PRET";
    return order;
  }
  if ((order.preparingQuantity || 0) > 0) {
    order.status = "EN_PREPARATION";
    return order;
  }
  order.status = "EN_ATTENTE";
  return order;
}

// Récupère les prochains IDs de repas à inclure dans un lot de préparation
function getNextInternalIdsForBatch(order, quantityToTake) {
  const alreadyAllocated =
    (order.preparingQuantity || 0) +
    (order.readyQuantity || 0) +
    (order.servedQuantity || 0);
  return (order.internalOrderIds || []).slice(alreadyAllocated, alreadyAllocated + quantityToTake);
}

// Crée ou récupère une commande cuisine à partir d'une réservation scannée
async function ensureKitchenOrderFromReservation(reservation) {
  let order = await KitchenOrder.findOne({ reservation: reservation._id });
  if (order) {
    if (normalizeKitchenOrderCounters(order)) await order.save();
    return order;
  }

  order = await KitchenOrder.create({
    reservation: reservation._id,
    student: reservation.student,
    dateISO: reservation.dateISO,
    repas: reservation.repas,
    creneau: reservation.creneau,
    typeRepas: reservation.typeRepas || "surPlace",
    quantity: reservation.groupSize || 1,
    internalOrderIds: buildInternalOrderIds(reservation),
    pendingQuantity: reservation.groupSize || 1,
    preparingQuantity: 0,
    readyQuantity: 0,
    servedQuantity: 0,
    status: "EN_ATTENTE",
    source: "QR",
  });

  return order;
}

// Calcule le numéro du prochain lot à lancer pour un créneau donné
async function getNextLotNumber({ dateISO, repas, creneau }) {
  const last = await KitchenBatch.findOne({ dateISO, repas, creneau }).sort({ lotNumber: -1 }).lean();
  return (last?.lotNumber || 0) + 1;
}

// Logique principale pour grouper les commandes en attente dans un nouveau lot de préparation (batch)
async function launchNextBatch({ dateISO, repas, creneau, maxMeals = MAX_BATCH_MEALS }) {
  const normalizedMaxMeals = Math.max(1, Math.min(Number(maxMeals) || MAX_BATCH_MEALS, MAX_BATCH_MEALS));
  const activeBatch = await KitchenBatch.findOne({ dateISO, repas, creneau, status: "EN_PREPARATION" });
  if (activeBatch) {
    const error = new Error("Un lot est déjà en préparation pour ce créneau");
    error.statusCode = 409;
    throw error;
  }

  const lastBatch = await KitchenBatch.findOne({ dateISO, repas, creneau }).sort({ lotNumber: -1 });
  if (lastBatch && lastBatch.status !== "PRET" && lastBatch.status !== "SERVED") {
    const error = new Error("Le lot précédent doit être PRET avant de lancer le suivant");
    error.statusCode = 409;
    throw error;
  }

  const waitingOrders = await KitchenOrder.find({
    dateISO,
    repas,
    creneau,
    status: { $in: ["EN_ATTENTE", "EN_PREPARATION", "PRET"] },
    $or: [{ pendingQuantity: { $gt: 0 } }, { pendingQuantity: { $exists: false } }],
  }).sort({ arrivalScannedAt: 1, createdAt: 1 });

  if (!waitingOrders.length) {
    const error = new Error("Aucune commande en attente pour lancer un lot");
    error.statusCode = 404;
    throw error;
  }

  const selectedOrders = [];
  const selectedItems = [];
  let mealCount = 0;

  for (const order of waitingOrders) {
    if (normalizeKitchenOrderCounters(order)) await order.save();

    const remainingCapacity = normalizedMaxMeals - mealCount;
    if (remainingCapacity <= 0) break;

    const availableMeals = order.pendingQuantity || 0;
    if (!availableMeals) continue;
    if (availableMeals > normalizedMaxMeals) {
      const error = new Error(`Une commande de ${availableMeals} repas depasse la limite d'un lot (${normalizedMaxMeals} max)`);
      error.statusCode = 409;
      throw error;
    }
    if (availableMeals > remainingCapacity) continue;

    const quantityToTake = availableMeals;
    const takenInternalIds = getNextInternalIdsForBatch(order, quantityToTake);

    if (!selectedOrders.some((item) => String(item._id) === String(order._id))) {
      selectedOrders.push(order);
    }

    selectedItems.push({
      order: order._id,
      quantity: quantityToTake,
      internalOrderIds: takenInternalIds,
    });

    order.pendingQuantity = Math.max(0, (order.pendingQuantity || 0) - quantityToTake);
    order.preparingQuantity = (order.preparingQuantity || 0) + quantityToTake;
    if (!order.preparingAt) order.preparingAt = new Date();
    syncKitchenOrderStatus(order);
    await order.save();

    mealCount += quantityToTake;
  }

  if (!selectedOrders.length) {
    const error = new Error(`Aucune commande complete ne peut entrer dans un lot de ${normalizedMaxMeals} repas`);
    error.statusCode = 409;
    throw error;
  }

  const lotNumber = await getNextLotNumber({ dateISO, repas, creneau });
  const batch = await KitchenBatch.create({
    dateISO,
    repas,
    creneau,
    lotNumber,
    label: `LOT ${String(lotNumber).padStart(2, "0")}`,
    maxMeals: normalizedMaxMeals,
    totalMeals: mealCount,
    orders: selectedOrders.map((order) => order._id),
    items: selectedItems,
    status: "EN_PREPARATION",
  });

  return KitchenBatch.findById(batch._id)
    .populate({ path: "orders", populate: { path: "reservation", select: "_id" } })
    .populate({ path: "items.order", populate: { path: "reservation", select: "_id" } });
}

// Marque un lot comme "Prêt" et met à jour les quantités des commandes liées
async function markBatchReady(batchId) {
  const batch = await KitchenBatch.findById(batchId).populate("items.order");
  if (!batch) {
    const error = new Error("Lot introuvable");
    error.statusCode = 404;
    throw error;
  }
  if (batch.status !== "EN_PREPARATION") {
    const error = new Error("Seul un lot en préparation peut passer à PRET");
    error.statusCode = 400;
    throw error;
  }

  batch.status = "PRET";
  batch.readyAt = new Date();
  await batch.save();

  const readyAt = new Date();
  for (const item of batch.items || []) {
    const order = item.order;
    if (!order) continue;
    order.preparingQuantity = Math.max(0, (order.preparingQuantity || 0) - (item.quantity || 0));
    order.readyQuantity = (order.readyQuantity || 0) + (item.quantity || 0);
    order.readyAt = readyAt;
    syncKitchenOrderStatus(order);
    await order.save();
  }

  return KitchenBatch.findById(batch._id)
    .populate({ path: "orders", populate: { path: "reservation", select: "_id" } })
    .populate({ path: "items.order", populate: { path: "reservation", select: "_id" } });
}

// Marque un lot comme "Servi", valide les réservations et crée les enregistrements de passage
async function markBatchServed(batchId, adminId = null) {
  const batch = await KitchenBatch.findById(batchId).populate("orders").populate("items.order");
  if (!batch) {
    const error = new Error("Lot introuvable");
    error.statusCode = 404;
    throw error;
  }
  if (batch.status !== "PRET") {
    const error = new Error("Seul un lot PRET peut passer à SERVED");
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();
  batch.status = "SERVED";
  batch.servedAt = now;
  await batch.save();

  const touchedReservationIds = new Set();

  for (const item of batch.items || []) {
    const order = item.order;
    if (!order) continue;
    order.readyQuantity = Math.max(0, (order.readyQuantity || 0) - (item.quantity || 0));
    order.servedQuantity = (order.servedQuantity || 0) + (item.quantity || 0);
    order.servedAt = now;
    syncKitchenOrderStatus(order);
    await order.save();

    if ((order.servedQuantity || 0) < (order.quantity || 0)) continue;
    touchedReservationIds.add(String(order.reservation));
  }

  for (const reservationId of touchedReservationIds) {
    const order = batch.orders.find((row) => String(row.reservation) === reservationId);
    if (!order) continue;
    const reservation = await Reservation.findById(order.reservation);
    if (!reservation || reservation.status === "CONSUMED") continue;

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
      admin: adminId || null,
      date: now,
      repas: reservation.repas,
      creneau: reservation.creneau,
      source: "MANUAL",
    });
  }

  return KitchenBatch.findById(batch._id)
    .populate({ path: "orders", populate: { path: "reservation", select: "_id" } })
    .populate({ path: "items.order", populate: { path: "reservation", select: "_id" } });
}

// Construit un résumé des repas prévus (sur place vs emporter) pour une journée
async function buildPrepSummary(dateISO) {
  const reservations = await Reservation.find({
    dateISO,
    status: { $in: ["ACTIVE", "CONSUMED"] },
  }).lean();

  const grouped = new Map();
  for (const row of reservations) {
    const key = `${row.repas}::${row.creneau}`;
    const current = grouped.get(key) || {
      repas: row.repas,
      creneau: row.creneau,
      totalMeals: 0,
      importedMeals: 0,
      dineInMeals: 0,
    };
    const quantity = row.groupSize || 1;
    current.totalMeals += quantity;
    if (row.typeRepas === "aEmporter") current.importedMeals += quantity;
    else current.dineInMeals += quantity;
    grouped.set(key, current);
  }

  return Array.from(grouped.values()).sort((a, b) => {
    if (a.dateISO !== b.dateISO) return String(a.dateISO || "").localeCompare(String(b.dateISO || ""));
    return String(a.creneau).localeCompare(String(b.creneau));
  });
}

// Récupère toutes les données nécessaires au tableau de bord de la cuisine
async function getKitchenDashboard({ dateISO, repas, creneau }) {
  const orderFilter = { dateISO };
  const batchFilter = { dateISO };
  if (repas) {
    orderFilter.repas = repas;
    batchFilter.repas = repas;
  }
  if (creneau) {
    orderFilter.creneau = creneau;
    batchFilter.creneau = creneau;
  }

  const [prepSummary, orders, batches] = await Promise.all([
    buildPrepSummary(dateISO),
    KitchenOrder.find(orderFilter).sort({ arrivalScannedAt: 1, createdAt: 1 }).populate("reservation", "qrPayload groupSize typeRepas status"),
    KitchenBatch.find(batchFilter)
      .sort({ lotNumber: 1 })
      .populate({ path: "orders", populate: { path: "reservation", select: "_id" } })
      .populate({ path: "items.order", populate: { path: "reservation", select: "_id" } }),
  ]);

  for (const order of orders) {
    if (normalizeKitchenOrderCounters(order)) await order.save();
  }

  return { prepSummary, orders, batches };
}

module.exports = {
  MAX_BATCH_MEALS,
  ensureKitchenOrderFromReservation,
  launchNextBatch,
  markBatchReady,
  markBatchServed,
  getKitchenDashboard,
};
