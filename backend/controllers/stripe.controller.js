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

function minorToMajorUnits(amountMinor, currency) {
  const value = Number(amountMinor || 0);
  const zeroDecimalCurrencies = new Set([
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

  return zeroDecimalCurrencies.has(String(currency || "").toLowerCase()) ? value : value / 100;
}

function mapPaymentIntentStatus(status) {
  switch (status) {
    case "succeeded":
      return "SUCCEEDED";
    case "processing":
      return "PROCESSING";
    case "canceled":
      return "CANCELED";
    case "requires_payment_method":
    case "requires_confirmation":
    case "requires_action":
    case "requires_capture":
    default:
      return "PENDING";
  }
}

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

async function findPurchaseFromIntent(paymentIntent) {
  if (!paymentIntent?.id) return null;
  return PackPurchase.findOne({ stripePaymentIntentId: paymentIntent.id }).populate("pack", PURCHASE_PACK_FIELDS);
}

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

async function syncPurchaseFromIntent(purchase, paymentIntent) {
  if (!purchase || !paymentIntent) return purchase;

  switch (paymentIntent.status) {
    case "succeeded":
      return markPurchaseSucceeded(purchase, paymentIntent);
    case "processing":
      return markPurchaseProcessing(purchase, paymentIntent);
    case "canceled":
      return markPurchaseCanceled(purchase, paymentIntent);
    default:
      if (paymentIntent.last_payment_error) {
        return markPurchaseFailed(purchase, paymentIntent);
      }

      await PackPurchase.findByIdAndUpdate(purchase._id, {
        $set: {
          status: mapPaymentIntentStatus(paymentIntent.status),
          paymentStatus: paymentIntent.status,
          stripePaymentIntentId: paymentIntent.id || purchase.stripePaymentIntentId || null,
        },
      });
      return PackPurchase.findById(purchase._id).populate("pack", PURCHASE_PACK_FIELDS);
  }
}

async function syncOrCreatePurchaseFromIntent(paymentIntent) {
  const purchase = await ensurePurchaseFromIntent(paymentIntent);
  if (!purchase) return null;
  return syncPurchaseFromIntent(purchase, paymentIntent);
}

async function refreshPurchaseStatusIfPossible(purchase) {
  if (!purchase || !purchase.stripePaymentIntentId) return purchase;
  if (purchase.status === "SUCCEEDED" || purchase.status === "FAILED" || purchase.status === "CANCELED") {
    return purchase;
  }

  try {
    const stripe = getStripeClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(purchase.stripePaymentIntentId);
    return syncPurchaseFromIntent(purchase, paymentIntent);
  } catch {
    return purchase;
  }
}

exports.createPackPaymentIntent = async (req, res) => {
  try {
    const { packId } = req.body || {};
    if (!packId) {
      return res.status(400).json({ message: "Pack requis" });
    }

    const student = await Student.findById(req.studentId).select("firstName lastName email");
    if (!student) {
      return res.status(404).json({ message: "Etudiant introuvable" });
    }

    const pack = await Pack.findById(packId);
    if (!pack || pack.actif === false) {
      return res.status(404).json({ message: "Pack introuvable" });
    }

    const currency = getStripeCurrency();
    const amountMinor = toMinorUnits(pack.prix, currency);
    const stripe = getStripeClient();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountMinor,
      currency,
      payment_method_types: ["card"],
      receipt_email: student.email || undefined,
      description: `Achat du pack ${pack.nom}`,
      metadata: {
        studentId: String(student._id),
        packId: String(pack._id),
        packName: String(pack.nom || "Pack"),
        nbTickets: String(pack.nbTickets || 0),
      },
    });

    res.status(201).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      currency,
      merchantDisplayName: getMerchantDisplayName(),
      message: "Paiement Stripe prepare",
    });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    res.status(500).json({ message: "Erreur lors de la preparation du paiement", error: error.message });
  }
};

exports.finalizePackPaymentIntent = async (req, res) => {
  try {
    const { paymentIntentId } = req.body || {};
    if (!paymentIntentId) {
      return res.status(400).json({ message: "PaymentIntent requis" });
    }

    const stripe = getStripeClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const metadata = paymentIntent?.metadata || {};

    if (String(metadata.studentId || "") !== String(req.studentId)) {
      return res.status(403).json({ message: "Ce paiement n'appartient pas a cet etudiant" });
    }

    if (paymentIntent.status === "canceled" || paymentIntent.status === "requires_payment_method") {
      return res.status(409).json({ message: "Le paiement n'a pas ete finalise" });
    }

    const purchase = await syncOrCreatePurchaseFromIntent(paymentIntent);
    if (!purchase) {
      return res.status(404).json({ message: "Impossible de retrouver le pack de ce paiement" });
    }

    const student = await Student.findById(req.studentId).select("soldeTickets");

    res.json({
      purchase: serializePurchase(purchase),
      soldeTickets: student?.soldeTickets || 0,
    });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    res.status(500).json({ message: "Erreur lors de la finalisation du paiement", error: error.message });
  }
};

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

exports.getPackPurchaseById = async (req, res) => {
  try {
    const purchase = await PackPurchase.findOne({
      _id: req.params.purchaseId,
      student: req.studentId,
    }).populate("pack", PURCHASE_PACK_FIELDS);

    if (!purchase) {
      return res.status(404).json({ message: "Paiement introuvable" });
    }

    const refreshedPurchase = await refreshPurchaseStatusIfPossible(purchase);
    const student = await Student.findById(req.studentId).select("soldeTickets");

    res.json({
      purchase: serializePurchase(refreshedPurchase),
      soldeTickets: student?.soldeTickets || 0,
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

exports.handleWebhook = async (req, res) => {
  const signature = req.headers["stripe-signature"];

  if (!isStripeWebhookConfigured()) {
    return res.status(500).send("STRIPE_WEBHOOK_SECRET manquant");
  }

  let event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    const paymentIntent = event.data.object;
    let purchase = await findPurchaseFromIntent(paymentIntent);

    if (!purchase && event.type !== "payment_intent.canceled") {
      purchase = await syncOrCreatePurchaseFromIntent(paymentIntent);
    }

    if (!purchase) {
      return res.json({ received: true });
    }

    if (event.type === "payment_intent.canceled") {
      await markPurchaseCanceled(purchase, paymentIntent);
    }

    res.json({ received: true });
  } catch (error) {
    res.status(500).send(`Webhook handling error: ${error.message}`);
  }
};
