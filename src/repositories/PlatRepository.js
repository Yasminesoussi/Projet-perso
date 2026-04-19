// Repository Plats:  les appels HTTP vers le backend  pour gérer les plats
// - Pas de logique métier ici, uniquement CRUD via apiClient
import apiClient from './apiClient';

class PlatRepository {
    async getAllPlats() {
        try {
            const response = await apiClient.get('/plats');
            return response.data;
        } catch (error) {
            console.error('Error fetching plats:', error);
            throw error;
        }
    }

    async deletePlat(id) {
        try {
            const response = await apiClient.delete(`/plats/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting plat:', error);
            throw error;
        }
    }

    async createPlat(formData) {
        try {
            const response = await apiClient.post('/plats', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data;
        } catch (error) {
            console.error('Error creating plat:', error);
            throw error;
        }
    }

    async updatePlat(id, formData) {
        try {
            const response = await apiClient.put(`/plats/${id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            return response.data;
        } catch (error) {
            console.error('Error updating plat:', error);
            throw error;
        }
    }
}

export default new PlatRepository();
