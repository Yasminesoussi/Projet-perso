import apiClient from './apiClient';

class AdminScanRepository {
  async consume(qrPayload) {
    const res = await apiClient.post('/admin/scan/consume', { qrPayload });
    return res.data;
  }

  async scanKitchenArrival(qrPayload) {
    const res = await apiClient.post('/admin/kitchen/scan-arrival', { qrPayload });
    return res.data;
  }
}

export default new AdminScanRepository();
