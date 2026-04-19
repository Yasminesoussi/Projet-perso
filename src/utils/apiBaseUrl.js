// Ce helper calcule l'URL de base du backend selon la plateforme et l'environnement Expo.

/**
 * URL DE PRODUCTION (RENDER)
 * -------------------------
 * On utilise l'URL publique de ton backend déployé sur Render.
 * Cela permet à l'application de fonctionner sur n'importe quel téléphone, 
 * n'importe où (4G, Wi-Fi externe, etc.).
 */
const RENDER_API_URL = "https://projet-perso-tdq1.onrender.com/api";

export function getApiBaseUrl() {
  return RENDER_API_URL;
}
