const mongoose = require("mongoose");

const KitchenBatchSchema = new mongoose.Schema(
  {
    dateISO: { type: String, required: true, index: true },
    repas: { type: String, enum: ["dejeuner", "diner", "libre"], required: true, index: true },
    creneau: { type: String, required: true, index: true },
    lotNumber: { type: Number, required: true },
    label: { type: String, required: true },
    maxMeals: { type: Number, required: true, default: 5, min: 1 },
    totalMeals: { type: Number, required: true, default: 0, min: 0 },
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "KitchenOrder", required: true }],
    items: [
      {
        order: { type: mongoose.Schema.Types.ObjectId, ref: "KitchenOrder", required: true },
        quantity: { type: Number, required: true, min: 1 },
        internalOrderIds: [{ type: String, required: true }],
      },
    ],
    status: {
      type: String,
      enum: ["EN_PREPARATION", "PRET", "SERVED"],
      default: "EN_PREPARATION",
      index: true,
    },
    launchedAt: { type: Date, default: Date.now },
    readyAt: { type: Date, default: null },
    servedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

KitchenBatchSchema.index({ dateISO: 1, repas: 1, creneau: 1, lotNumber: 1 }, { unique: true });

module.exports = mongoose.model("KitchenBatch", KitchenBatchSchema);
