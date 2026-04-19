// Service d'authentification etudiant.
// Il centralise la connexion, le profil et le portefeuille tickets.

import StudentAuthRepository from '../repositories/StudentAuthRepository';
import AsyncStorage from "@react-native-async-storage/async-storage";

class StudentAuthService {
  async getBalance() {
    // Raccourci pratique pour recuperer seulement le nombre de tickets.
    const me = await this.me();
    return me?.student?.soldeTickets ?? 0;
  }
  async signupForm(formData) {
    // Envoie le formulaire d'inscription avec les fichiers.
    return await StudentAuthRepository.signupForm(formData);
  }

  async login(email, password) {
    if (!email || !password) {
      throw new Error('Email et mot de passe requis');
    }
    // Si la connexion reussit, on memorise le token etudiant.
    const data = await StudentAuthRepository.login(email, password);
    if (data.token) {
      await AsyncStorage.setItem("studentToken", data.token);
    }
    return data;
  }

  async logout() {
    // Supprime juste le token local cote mobile.
    await AsyncStorage.removeItem("studentToken");
  }

  async getProfile(token) {
    return await StudentAuthRepository.getProfile(token);
  }

  async me() {
    // Recupere l'etudiant courant a partir du token deja stocke.
    return await StudentAuthRepository.me();
  }

  async creditWallet(nbTickets) {
    if (nbTickets == null || Number(nbTickets) <= 0) {
      throw new Error('Nombre de tickets invalide');
    }
    // Ajoute des tickets au portefeuille etudiant.
    return await StudentAuthRepository.creditWallet(nbTickets);
  }
}

export default new StudentAuthService();
