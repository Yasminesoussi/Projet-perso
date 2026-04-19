// Repository admin.
// Ici on fait des appels HTTP bruts vers les routes /admin.

import apiClient from './apiClient';

class AdminAuthRepository {
  async login(email, password) {
    // Connexion admin.
    const response = await apiClient.post('/admin/login', { email, password });
    return response.data;
  }
  async getProfile(token) {
    // Lecture du profil admin.
    const response = await apiClient.get('/admin/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
  async updateProfile(token, data) {
    // Mise a jour du profil admin.
    const response = await apiClient.put('/admin/me', data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
}

export default new AdminAuthRepository();
