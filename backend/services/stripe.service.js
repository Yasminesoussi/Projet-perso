// Service Stripe backend.
// Il centralise la configuration et les fonctions d'aide pour interagir avec l'API Stripe.

const Stripe = require("stripe");

// Liste des devises sans décimales supportées par Stripe
const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);

let stripeClient = null;

// Initialise et retourne le client SDK Stripe en utilisant la clé secrète
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

// Récupère la devise configurée pour les paiements (par défaut: eur)
function getStripeCurrency() {
  return String(process.env.STRIPE_CURRENCY || "eur").trim().toLowerCase();
}

// Récupère le nom du commerçant affiché sur le formulaire de paiement
function getMerchantDisplayName() {
  return String(process.env.STRIPE_MERCHANT_DISPLAY_NAME || "Resto Universitaire").trim();
}

// Convertit un montant classique (ex: 10 DT) en unités mineures Stripe (ex: 1000 cents)
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

// Vérifie si le secret du Webhook Stripe est présent dans la configuration
function isStripeWebhookConfigured() {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET);
}

module.exports = {
  getMerchantDisplayName,
  getStripeClient,
  getStripeCurrency,
  isStripeWebhookConfigured,
  toUnits: toMinorUnits, // Alias pour la compatibilité
  toMinorUnits,
};
