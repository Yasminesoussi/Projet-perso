// Repository Packs: appels HTTP CRUD, aucune logique métier
import apiClient from '../repositories/apiClient';

class PackRepository {
  async getAll() {
    const response = await apiClient.get('/packs');
    return response.data;
  }
  async create(packData) {
    const response = await apiClient.post('/packs', packData);
    return response.data;
  }
  async update(id, packData) {
    const response = await apiClient.put(`/packs/${id}`, packData);
    return response.data;
  }
  async delete(id) {
    const response = await apiClient.delete(`/packs/${id}`);
    return response.data;
  }
}

export default new PackRepository();
