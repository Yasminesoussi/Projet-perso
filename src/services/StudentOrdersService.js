import StudentOrdersRepository from "../repositories/StudentOrdersRepository";

function formatStepDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString([], {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildMainOrderCode(order) {
  const reservationId = order?.reservation?._id || order?.reservation;
  if (!reservationId) return `CMD-${String(order?._id || "").slice(-4).toUpperCase()}`;
  return `#${String(reservationId).slice(-6).toUpperCase()}`;
}

function mapBackendStatus(status) {
  switch (status) {
    case "EN_ATTENTE":
      return "pending";
    case "EN_PREPARATION":
      return "preparing";
    case "PRET":
      return "ready";
    case "SERVED":
      return "served";
    default:
      return "pending";
  }
}

function formatMealLabel(repas) {
  switch (repas) {
    case "dejeuner":
      return "Dejeuner";
    case "diner":
      return "Diner";
    case "libre":
      return "Libre";
    default:
      return "Repas";
  }
}

function buildLocation(order) {
  const typeRepas = order?.typeRepas || order?.reservation?.typeRepas;
  if (typeRepas === "aEmporter") {
    return "Zone retrait - Resto U";
  }

  const seats = order?.reservation?.selectedSeats || [];
  if (seats.length > 0) {
    const firstSeat = seats[0];
    if (firstSeat?.tableLabel) return `${firstSeat.tableLabel} - Salle resto U`;
  }

  return "Comptoir principal - Resto U";
}

function buildSummary(order) {
  const quantity = order?.quantity || order?.reservation?.groupSize || 1;
  const mode = (order?.typeRepas || order?.reservation?.typeRepas) === "aEmporter" ? "a emporter" : "sur place";
  return `${quantity} plateau${quantity > 1 ? "x" : ""} - ${mode}`;
}

function buildEta(order, status) {
  if (status === "ready") return "Retrait disponible au comptoir";
  if (status === "served") return order?.servedAt ? `Servie a ${new Date(order.servedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Commande servie";
  if (status === "preparing") return "Preparation en cuisine";
  return "En attente de lancement en cuisine";
}

export function mapKitchenOrderToView(order) {
  const status = mapBackendStatus(order?.status);
  const ids = Array.isArray(order?.internalOrderIds) ? order.internalOrderIds : [];
  const mainCode = buildMainOrderCode(order);

  return {
    id: order?._id,
    reservationId: order?.reservation?._id || order?.reservation || null,
    code: mainCode,
    meal: formatMealLabel(order?.repas),
    location: buildLocation(order),
    status,
    summary: buildSummary(order),
    pickupCode: mainCode,
    internalCodes: ids,
    eta: buildEta(order, status),
    dateISO: order?.dateISO,
    creneau: order?.creneau,
    createdAt: order?.createdAt,
    preparingAt: order?.preparingAt,
    readyAt: order?.readyAt,
    servedAt: order?.servedAt,
    studentConfirmedAt: order?.studentConfirmedAt,
    typeRepas: order?.typeRepas || order?.reservation?.typeRepas || "surPlace",
    quantity: order?.quantity || 1,
    stepDates: {
      pending: formatStepDate(order?.createdAt),
      preparing: formatStepDate(order?.preparingAt || order?.updatedAt),
      ready: formatStepDate(order?.readyAt),
      served: formatStepDate(order?.servedAt),
    },
  };
}

class StudentOrdersService {
  async list() {
    const data = await StudentOrdersRepository.list();
    const orders = Array.isArray(data?.orders) ? data.orders : [];
    return orders.map(mapKitchenOrderToView);
  }

  async confirmReceipt(orderId) {
    const data = await StudentOrdersRepository.confirmReceipt(orderId);
    return mapKitchenOrderToView(data?.order || {});
  }
}

export default new StudentOrdersService();
