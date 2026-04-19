// Client HTTP principal pour l'espace admin.
// Il pointe vers le backend et ajoute automatiquement le token admin.

import axios from 'axios';
import { getApiBaseUrl } from '../utils/apiBaseUrl';
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = getApiBaseUrl();

const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 20000,
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use(async (config) => {
    try {
        // On recupere le token admin sauvegarde localement.
        const token = await AsyncStorage.getItem("token");
        if (token) {
            // Chaque requete protegee part deja avec le header Authorization.
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (error) {
        console.error("Error fetching token", error);
    }
    return config;
});

export default apiClient;
