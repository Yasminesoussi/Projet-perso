// Client HTTP dedie a l'espace etudiant.
// Il ajoute le token etudiant avant les appels vers le backend.

import axios from 'axios';
import { getApiBaseUrl } from '../utils/apiBaseUrl';
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = getApiBaseUrl();

const studentApiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Cet interceptor s'execute avant chaque requete.
studentApiClient.interceptors.request.use(async (config) => {
  try {
    // On recupere le token etudiant stocke localement.
    const token = await AsyncStorage.getItem("studentToken");
    if (token) {
      // Si le token existe, on l'ajoute au header Authorization.
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error("Error fetching student token", error);
  }
  return config;
});

export default studentApiClient;
