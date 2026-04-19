// Repository etudiant.
// Cette couche ne fait que les requetes HTTP vers /students.

import studentApiClient from './studentApiClient';

class StudentAuthRepository {
  async signupForm(formData) {
    // Envoi multipart pour formulaire + carte etudiante.
    const response = await studentApiClient.post('/students/signup', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
  async login(email, password) {
    // Connexion etudiant.
    const response = await studentApiClient.post('/students/login', { email, password });
    return response.data;
  }
  async me() {
    // Profil de l'etudiant deja connecte.
    const response = await studentApiClient.get('/students/me');
    return response.data;
  }
  async getProfile(token) {
    const response = await studentApiClient.get('/students/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
  async creditWallet(nbTickets) {
    // Recharge du portefeuille tickets.
    const response = await studentApiClient.post('/students/wallet/credit', { nbTickets });
    return response.data;
  }
}

export default new StudentAuthRepository();
