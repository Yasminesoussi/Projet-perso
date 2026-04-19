import KitchenRepository from "../repositories/KitchenRepository";

class KitchenService {
  async getDashboard({ dateISO, repas, creneau }) {
    if (!dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
      throw new Error("dateISO invalide (YYYY-MM-DD)");
    }
    return await KitchenRepository.getDashboard({ dateISO, repas, creneau });
  }

  async launchBatch({ dateISO, repas, creneau, maxMeals = 20 }) {
    if (!dateISO || !repas || !creneau) {
      throw new Error("Contexte cuisine incomplet");
    }
    return await KitchenRepository.launchBatch({ dateISO, repas, creneau, maxMeals });
  }

  async markBatchReady(batchId) {
    if (!batchId) throw new Error("batchId requis");
    return await KitchenRepository.markBatchReady(batchId);
  }

  async markBatchServed(batchId) {
    if (!batchId) throw new Error("batchId requis");
    return await KitchenRepository.markBatchServed(batchId);
  }
}

export default new KitchenService();
