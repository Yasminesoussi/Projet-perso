// Service Stripe backend.
// Il centralise la configuration et les helpers utilises par les controllers.

const Stripe = require("stripe");

const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
]);

let stripeClient = null;

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    const error = new Error(
      "Configuration Stripe manquante: ajoute STRIPE_SECRET_KEY dans backend/.env puis redemarre le backend."
    );
    error.statusCode = 500;
    throw error;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}

function getStripeCurrency() {
  return String(process.env.STRIPE_CURRENCY || "eur").trim().toLowerCase();
}

function getMerchantDisplayName() {
  return String(process.env.STRIPE_MERCHANT_DISPLAY_NAME || "Resto Universitaire").trim();
}

function toMinorUnits(amount, currency = getStripeCurrency()) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    const error = new Error("Montant Stripe invalide");
    error.statusCode = 400;
    throw error;
  }

  const code = String(currency || "eur").trim().toLowerCase();
  if (ZERO_DECIMAL_CURRENCIES.has(code)) {
    return Math.round(numericAmount);
  }

  return Math.round(numericAmount * 100);
}

function isStripeWebhookConfigured() {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET);
}

module.exports = {
  getMerchantDisplayName,
  getStripeClient,
  getStripeCurrency,
  isStripeWebhookConfigured,
  toMinorUnits,
};
