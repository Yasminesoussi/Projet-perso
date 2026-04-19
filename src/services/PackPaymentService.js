// Service paiement pack.
// Il prepare le paiement Stripe puis aide a suivre son statut final.

import PackPaymentRepository from "../repositories/PackPaymentRepository";

const TERMINAL_STATUSES = new Set(["SUCCEEDED", "FAILED", "CANCELED"]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class PackPaymentService {
  async preparePayment(packId) {
    if (!packId) {
      throw new Error("Pack requis pour lancer le paiement");
    }
    return PackPaymentRepository.prepare(packId);
  }

  async getHistory() {
    const data = await PackPaymentRepository.getAll();
    return Array.isArray(data?.purchases) ? data.purchases : [];
  }

  async finalizePayment(paymentIntentId) {
    if (!paymentIntentId) {
      throw new Error("PaymentIntent introuvable");
    }
    const data = await PackPaymentRepository.finalize(paymentIntentId);
    return data?.purchase || null;
  }

  async getPurchase(purchaseId) {
    if (!purchaseId) {
      throw new Error("Paiement introuvable");
    }
    const data = await PackPaymentRepository.getById(purchaseId);
    return data?.purchase || null;
  }

  async waitForFinalStatus(purchaseId, options = {}) {
    const attempts = Number(options.attempts || 6);
    const delayMs = Number(options.delayMs || 1500);
    let currentPurchase = null;

    for (let index = 0; index < attempts; index += 1) {
      currentPurchase = await this.getPurchase(purchaseId);
      if (TERMINAL_STATUSES.has(currentPurchase?.status)) {
        return currentPurchase;
      }

      if (index < attempts - 1) {
        await sleep(delayMs);
      }
    }

    return currentPurchase;
  }
}

export default new PackPaymentService();
