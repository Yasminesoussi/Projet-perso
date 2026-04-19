// Repository paiement pack etudiant.
// Cette couche parle seulement a l'API backend Stripe / packs.

import studentApiClient from "./studentApiClient";

class PackPaymentRepository {
  async prepare(packId) {
    const response = await studentApiClient.post("/students/pack-payments/prepare", { packId });
    return response.data;
  }

  async finalize(paymentIntentId) {
    const response = await studentApiClient.post("/students/pack-payments/finalize", { paymentIntentId });
    return response.data;
  }

  async getAll() {
    const response = await studentApiClient.get("/students/pack-payments");
    return response.data;
  }

  async getById(purchaseId) {
    const response = await studentApiClient.get(`/students/pack-payments/${purchaseId}`);
    return response.data;
  }
}

export default new PackPaymentRepository();
