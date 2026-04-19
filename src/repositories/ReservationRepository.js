// Repository des reservations.
// Cette couche parle directement aux routes backend des etudiants.

import studentApiClient from './studentApiClient';

class ReservationRepository {
  async create(body) {
    // Creation d'une reservation.
    const response = await studentApiClient.post('/students/reservations', body);
    return response.data;
  }
  async update(id, body) {
    const response = await studentApiClient.put(`/students/reservations/${id}`, body);
    return response.data;
  }
  async getById(id) {
    const response = await studentApiClient.get(`/students/reservations/${id}`);
    return response.data;
  }
  async getSeatMap(params) {
    // Demande la carte des places pour une date / un repas / un creneau.
    const response = await studentApiClient.get('/students/reservations/seat-map', { params });
    return response.data;
  }
  async leave(id) {
    const response = await studentApiClient.post(`/students/reservations/${id}/leave`);
    return response.data;
  }
  async submitFeedback(id, body) {
    const response = await studentApiClient.post(`/students/reservations/${id}/feedback`, body);
    return response.data;
  }
  async cancel(id) {
    const response = await studentApiClient.delete(`/students/reservations/${id}`);
    return response.data;
  }
  async list(scope) {
    // scope filtre les reservations a venir, passees ou annulees.
    const response = await studentApiClient.get('/students/reservations', {
      params: scope ? { scope } : undefined,
    });
    return response.data;
  }
}

export default new ReservationRepository();
