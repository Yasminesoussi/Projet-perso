const mongoose = require("mongoose");

const KitchenOrderSchema = new mongoose.Schema(
  {
    reservation: { type: mongoose.Schema.Types.ObjectId, ref: "Reservation", required: true, unique: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "KitchenBatch", default: null },
    dateISO: { type: String, required: true, index: true },
    repas: { type: String, enum: ["dejeuner", "diner", "libre"], required: true, index: true },
    creneau: { type: String, required: true, index: true },
    typeRepas: { type: String, enum: ["surPlace", "aEmporter"], default: "surPlace" },
    quantity: { type: Number, required: true, min: 1 },
    internalOrderIds: [{ type: String, required: true }],
    pendingQuantity: { type: Number, required: true, default: 0, min: 0 },
    preparingQuantity: { type: Number, required: true, default: 0, min: 0 },
    readyQuantity: { type: Number, required: true, default: 0, min: 0 },
    servedQuantity: { type: Number, required: true, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["EN_ATTENTE", "EN_PREPARATION", "PRET", "SERVED", "CANCELLED"],
      default: "EN_ATTENTE",
      index: true,
    },
    arrivalScannedAt: { type: Date, default: Date.now },
    preparingAt: { type: Date, default: null },
    readyAt: { type: Date, default: null },
    servedAt: { type: Date, default: null },
    studentConfirmedAt: { type: Date, default: null },
    source: { type: String, enum: ["QR", "MANUAL"], default: "QR" },
  },
  { timestamps: true }
);

KitchenOrderSchema.index({ dateISO: 1, repas: 1, creneau: 1, status: 1 });
KitchenOrderSchema.index({ dateISO: 1, repas: 1, creneau: 1, arrivalScannedAt: 1, createdAt: 1 });

module.exports = mongoose.model("KitchenOrder", KitchenOrderSchema);
