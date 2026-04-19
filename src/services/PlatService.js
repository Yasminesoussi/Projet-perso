// Service Plats: encapsule les opérations sur les plats via PlatRepository
// - Contient un helper simple de filtrage pour la recherche locale
import PlatRepository from '../repositories/PlatRepository';

class PlatService {
    async getAllPlats() {
        const data = await PlatRepository.getAllPlats();
        return Array.isArray(data) ? data : [];
    }

    async deletePlat(id) {
        if (!id) throw new Error('Identifiant plat requis');
        return await PlatRepository.deletePlat(id);
    }

    async createPlat(formData) {
        if (!formData) throw new Error('FormData requis');
        return await PlatRepository.createPlat(formData);
    }

    async updatePlat(id, formData) {
        if (!id) throw new Error('Identifiant plat requis');
        if (!formData) throw new Error('FormData requis');
        return await PlatRepository.updatePlat(id, formData);
    }

    filterPlats(plats, query) {
        if (!query) return plats;
        return plats.filter((p) =>
            p.nom.toLowerCase().includes(query.toLowerCase())
        );
    }
}

export default new PlatService();
