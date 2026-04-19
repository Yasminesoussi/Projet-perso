import { Platform } from "react-native";
import { getApiBaseUrl } from "../utils/apiBaseUrl";

// Retourne l’URL du serveur backend selon la plateforme (Android émulateur vs iOS/web)
export function getServerUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/+api\/?$/, "").replace(/\/+$/, "");
  }
  const api = getApiBaseUrl();
  if (api) {
    return api.replace(/\/+api\/?$/, "");
  }
  return Platform.OS === "android" ? "http://10.0.2.2:5000" : "http://localhost:5000";
}

// Construit une URI d’image à partir d’un chemin retourné par l’API
// - Accepte déjà une URL absolue (http/https)
// - Normalise les backslashes Windows en slashes
export function getImageUri(photo) {
  if (!photo) return null;
  if (photo.startsWith("http")) return photo;
  const base = getServerUrl();
  return `${base}${photo.replace(/\\/g, "/")}`;
}
