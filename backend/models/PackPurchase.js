// Achat d'un pack tickets via Stripe.
// On garde ici la trace du paiement et on evite de crediter deux fois le solde.

const mongoose = require("mongoose");

const PackPurchaseSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    pack: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pack",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    amountMinor: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      default: "eur",
    },
    tickets: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "SUCCEEDED", "FAILED", "CANCELED"],
      default: "PENDING",
      index: true,
    },
    paymentStatus: {
      type: String,
      default: "requires_payment_method",
    },
    stripePaymentIntentId: {
      type: String,
      index: true,
      sparse: true,
    },
    failureMessage: {
      type: String,
      default: null,
    },
    fulfilledAt: {
      type: Date,
      default: null,
    },
    creditedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PackPurchase", PackPurchaseSchema);
