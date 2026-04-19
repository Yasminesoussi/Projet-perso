// Service d'authentification admin.
// Il fait le lien entre l'interface mobile et le repository admin.

import AdminAuthRepository from '../repositories/AdminAuthRepository';
import AsyncStorage from "@react-native-async-storage/async-storage";

class AuthService {
    async login(email, password) {
        // On appelle l'API puis on garde le token en local.
        const data = await AdminAuthRepository.login(email, password);
        if (data.token) {
            await AsyncStorage.setItem("token", data.token);
        }
        return data;
    }

    async logout() {
        // La deconnexion mobile consiste surtout a vider le token local.
        await AsyncStorage.removeItem("token");
    }

    async getProfile(token) {
        // Lecture du profil admin connecte.
        return await AdminAuthRepository.getProfile(token);
    }

    async updateProfile(token, data) {
        // Mise a jour du profil admin.
        return await AdminAuthRepository.updateProfile(token, data);
    }
}

export default new AuthService();
