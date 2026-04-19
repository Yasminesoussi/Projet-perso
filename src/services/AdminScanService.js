import AdminScanRepository from '../repositories/AdminScanRepository';

class AdminScanService {
  async consume(qrPayload) {
    if (!qrPayload) throw new Error('QR invalide');
    return await AdminScanRepository.consume(qrPayload);
  }

  async scanKitchenArrival(qrPayload) {
    if (!qrPayload) throw new Error('QR invalide');
    return await AdminScanRepository.scanKitchenArrival(qrPayload);
  }
}

export default new AdminScanService();
