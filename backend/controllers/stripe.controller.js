// Controleur Stripe.
// Il cree les intents de paiement pour les packs et traite les confirmations Stripe.

const Pack = require("../models/Pack");
const PackPurchase = require("../models/PackPurchase");
const Student = require("../models/Student");
const {
  getMerchantDisplayName,
  getStripeClient,
  getStripeCurrency,
  isStripeWebhookConfigured,
  toMinorUnits,
} = require("../services/stripe.service");

const PURCHASE_PACK_FIELDS = "nom prix nbTickets description";

// Convertit les unités monétaires mineures (cents) en unités majeures (ex: 1000 cents -> 10 DT)
function minorToMajorUnits(amountMinor, currency) {
  const value = Number(amountMinor || 0);
  const zeroDecimalCurrencies = new Set([
    "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
  ]);

  return zeroDecimalCurrencies.has(String(currency || "").toLowerCase()) ? value : value / 100;
}

// Mappe les statuts de paiement Stripe vers les statuts internes de notre application
function mapPaymentIntentStatus(status) {
  switch (status) {
    case "succeeded": return "SUCCEEDED";
    case "processing": return "PROCESSING";
    case "canceled": return "CANCELED";
    default: return "PENDING";
  }
}

// Prépare un objet d'achat pour l'envoi en réponse JSON au client mobile
function serializePurchase(purchase) {
  if (!purchase) return null;

  const pack = purchase.pack && typeof purchase.pack === "object"
    ? {
        id: purchase.pack._id,
        nom: purchase.pack.nom,
        description: purchase.pack.description || "",
        prix: purchase.pack.prix,
        nbTickets: purchase.pack.nbTickets,
      }
    : null;

  return {
    id: purchase._id,
    status: purchase.status,
    paymentStatus: purchase.paymentStatus || null,
    amount: purchase.amount,
    amountMinor: purchase.amountMinor,
    currency: purchase.currency,
    tickets: purchase.tickets,
    stripePaymentIntentId: purchase.stripePaymentIntentId || null,
    failureMessage: purchase.failureMessage || null,
    createdAt: purchase.createdAt,
    fulfilledAt: purchase.fulfilledAt || null,
    creditedAt: purchase.creditedAt || null,
    pack,
  };
}

// Recherche un enregistrement d'achat lié à un identifiant d'intention de paiement Stripe
async function findPurchaseFromIntent(paymentIntent) {
  if (!paymentIntent?.id) return null;
  return PackPurchase.findOne({ stripePaymentIntentId: paymentIntent.id }).populate("pack", PURCHASE_PACK_FIELDS);
}

// S'assure qu'un enregistrement d'achat existe pour une intention Stripe (le crée si absent)
async function ensurePurchaseFromIntent(paymentIntent) {
  if (!paymentIntent?.id) return null;

  const existing = await findPurchaseFromIntent(paymentIntent);
  if (existing) return existing;

  const metadata = paymentIntent.metadata || {};
  const { studentId, packId } = metadata;
  if (!studentId || !packId) return null;

  const pack = await Pack.findById(packId).select(PURCHASE_PACK_FIELDS);
  if (!pack) return null;

  const purchase = await PackPurchase.create({
    student: studentId,
    pack: pack._id,
    amount: Number(pack.prix ?? minorToMajorUnits(paymentIntent.amount, paymentIntent.currency)),
    amountMinor: Number(paymentIntent.amount || 0),
    currency: String(paymentIntent.currency || getStripeCurrency()).toLowerCase(),
    tickets: Number(pack.nbTickets) || Number(metadata.nbTickets) || 0,
    status: mapPaymentIntentStatus(paymentIntent.status),
    paymentStatus: paymentIntent.status || "requires_payment_method",
    stripePaymentIntentId: paymentIntent.id,
  });

  return PackPurchase.findById(purchase._id).populate("pack", PURCHASE_PACK_FIELDS);
}

// Marque un achat comme réussi et crédite les tickets au solde de l'étudiant
async function markPurchaseSucceeded(purchase, paymentIntent) {
  const now = new Date();

  const freshlyCredited = await PackPurchase.findOneAndUpdate(
    { _id: purchase._id, creditedAt: null },
    {
      $set: {
        status: "SUCCEEDED",
        paymentStatus: paymentIntent?.status || "succeeded",
        stripePaymentIntentId: paymentIntent?.id || purchase.stripePaymentIntentId || null,
        failureMessage: null,
        fulfilledAt: now,
        creditedAt: now,
      },
    },
    { new: true }
  ).populate("pack", PURCHASE_PACK_FIELDS);

  if (freshlyCredited) {
    await Student.findByIdAndUpdate(freshlyCredited.student, {
      $inc: { soldeTickets: freshlyCredited.tickets || 0 },
    });
    return freshlyCredited;
  }

  await PackPurchase.findByIdAndUpdate(purchase._id, {
    $set: {
      status: "SUCCEEDED",
      paymentStatus: paymentIntent?.status || "succeeded",
      stripePaymentIntentId: paymentIntent?.id || purchase.stripePaymentIntentId || null,
      failureMessage: null,
      fulfilledAt: purchase.fulfilledAt || now,
    },
  });

  return PackPurchase.findById(purchase._id).populate("pack", PURCHASE_PACK_FIELDS);
}

// Marque un achat comme ayant échoué et enregistre le message d'erreur de Stripe
async function markPurchaseFailed(purchase, paymentIntent) {
  await PackPurchase.findByIdAndUpdate(purchase._id, {
    $set: {
      status: "FAILED",
      paymentStatus: paymentIntent?.status || "requires_payment_method",
      stripePaymentIntentId: paymentIntent?.id || purchase.stripePaymentIntentId || null,
      failureMessage:
        paymentIntent?.last_payment_error?.message ||
        "Le paiement a ete refuse par Stripe.",
    },
  });

  return PackPurchase.findById(purchase._id).populate("pack", PURCHASE_PACK_FIELDS);
}

// Marque un achat comme annulé par l'utilisateur
async function markPurchaseCanceled(purchase, paymentIntent) {
  await PackPurchase.findByIdAndUpdate(purchase._id, {
    $set: {
      status: "CANCELED",
      paymentStatus: paymentIntent?.status || "canceled",
      stripePaymentIntentId: paymentIntent?.id || purchase.stripePaymentIntentId || null,
    },
  });

  return PackPurchase.findById(purchase._id).populate("pack", PURCHASE_PACK_FIELDS);
}

// Marque un achat comme étant en cours de traitement par les serveurs bancaires
async function markPurchaseProcessing(purchase, paymentIntent) {
  await PackPurchase.findByIdAndUpdate(purchase._id, {
    $set: {
      status: "PROCESSING",
      paymentStatus: paymentIntent?.status || "processing",
      stripePaymentIntentId: paymentIntent?.id || purchase.stripePaymentIntentId || null,
      failureMessage: null,
    },
  });

  return PackPurchase.findById(purchase._id).populate("pack", PURCHASE_PACK_FIELDS);
}

// Synchronise l'état local de l'achat avec l'état réel de l'intention de paiement Stripe
async function syncPurchaseFromIntent(purchase, paymentIntent) {
  if (!purchase || !paymentIntent) return purchase;

  const status = paymentIntent.status;
  if (status === "succeeded") return markPurchaseSucceeded(purchase, paymentIntent);
  if (status === "processing") return markPurchaseProcessing(purchase, paymentIntent);
  if (status === "canceled") return markPurchaseCanceled(purchase, paymentIntent);
  if (status === "requires_payment_method" && paymentIntent.last_payment_error) {
    return markPurchaseFailed(purchase, paymentIntent);
  }

  return purchase;
}

// 🔹 Crée une intention de paiement Stripe (PaymentIntent) pour un pack de tickets
exports.createPackPaymentIntent = async (req, res) => {
  try {
    const { packId } = req.body;
    if (!packId) return res.status(400).json({ message: "packId est requis" });

    const pack = await Pack.findById(packId);
    if (!pack) return res.status(404).json({ message: "Pack introuvable" });

    const student = await Student.findById(req.studentId);
    if (!student) return res.status(404).json({ message: "Etudiant introuvable" });

    const stripe = getStripeClient();
    const amountMinor = toMinorUnits(pack.prix, getStripeCurrency());

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountMinor,
      currency: getStripeCurrency(),
      customer: student.stripeCustomerId || undefined,
      metadata: {
        studentId: student._id.toString(),
        packId: pack._id.toString(),
        nbTickets: pack.nbTickets,
      },
    });

    const purchase = await ensurePurchaseFromIntent(paymentIntent);

    res.json({
      paymentIntentClientSecret: paymentIntent.client_secret,
      ephemeralKey: null,
      customer: student.stripeCustomerId || null,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      purchase: serializePurchase(purchase),
      merchantDisplayName: getMerchantDisplayName(),
    });
  } catch (error) {
    console.error("Stripe Intent Error:", error);
    res.status(500).json({ message: "Erreur lors de la préparation du paiement", error: error.message });
  }
};

// 🔹 Finalise et vérifie le statut d'un paiement Stripe après l'interaction mobile
exports.finalizePackPaymentIntent = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    if (!paymentIntentId) return res.status(400).json({ message: "paymentIntentId est requis" });

    const stripe = getStripeClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    let purchase = await ensurePurchaseFromIntent(paymentIntent);
    if (!purchase) return res.status(404).json({ message: "Achat introuvable" });

    purchase = await syncPurchaseFromIntent(purchase, paymentIntent);

    res.json({
      message: purchase.status === "SUCCEEDED" ? "Paiement réussi" : "Statut du paiement mis à jour",
      purchase: serializePurchase(purchase),
    });
  } catch (error) {
    console.error("Stripe Finalize Error:", error);
    res.status(500).json({ message: "Erreur lors de la finalisation du paiement", error: error.message });
  }
};

// 🔹 Liste tous les achats de packs effectués par l'étudiant connecté
exports.listMyPackPurchases = async (req, res) => {
  try {
    const purchases = await PackPurchase.find({ student: req.studentId })
      .populate("pack", PURCHASE_PACK_FIELDS)
      .sort({ createdAt: -1 });

    res.json({ purchases: purchases.map(serializePurchase) });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// 🔹 Récupère les détails d'un achat de pack spécifique
exports.getPackPurchaseById = async (req, res) => {
  try {
    const purchase = await PackPurchase.findOne({
      _id: req.params.purchaseId,
      student: req.studentId,
    }).populate("pack", PURCHASE_PACK_FIELDS);

    if (!purchase) return res.status(404).json({ message: "Achat introuvable" });

    res.json({ purchase: serializePurchase(purchase) });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};
