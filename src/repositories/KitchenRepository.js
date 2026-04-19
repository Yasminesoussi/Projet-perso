import apiClient from "./apiClient";

class KitchenRepository {
  async getDashboard({ dateISO, repas, creneau }) {
    const res = await apiClient.get("/admin/kitchen/dashboard", {
      params: { dateISO, repas, creneau },
    });
    return res.data;
  }

  async launchBatch({ dateISO, repas, creneau, maxMeals }) {
    const res = await apiClient.post("/admin/kitchen/batches/launch", {
      dateISO,
      repas,
      creneau,
      maxMeals,
    });
    return res.data;
  }

  async markBatchReady(batchId) {
    const res = await apiClient.post(`/admin/kitchen/batches/${batchId}/ready`);
    return res.data;
  }

  async markBatchServed(batchId) {
    const res = await apiClient.post(`/admin/kitchen/batches/${batchId}/served`);
    return res.data;
  }
}

export default new KitchenRepository();
