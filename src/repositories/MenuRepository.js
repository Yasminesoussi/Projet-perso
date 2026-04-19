// Repository des menus.
// Il contient les appels HTTP simples pour lire, creer et supprimer un menu.

import apiClient from './apiClient';

class MenuRepository {
    // Recupere les menus d'une date.
    async getMenusByDate(date) {
        try {
            const response = await apiClient.get(`/menus/by-date?date=${date}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching menus:', error);
            throw error;
        }
    }

    // Cree un menu.
    async createMenu(menuData) {
        try {
            const response = await apiClient.post('/menus', menuData);
            return response.data;
        } catch (error) {
            console.error('Error creating menu:', error);
            throw error;
        }
    }

    // Supprime un menu via son identifiant.
    async deleteMenu(menuId) {
        try {
            const response = await apiClient.delete(`/menus/${menuId}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting menu:', error);
            throw error;
        }
    }
}

export default new MenuRepository();
