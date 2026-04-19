// Service Packs: ajoute la logique métier (validation, normalisation) puis délègue au repository
import PackRepository from '../repositories/PackRepository';

class PackService {
    async getAllPacks() {
        const data = await PackRepository.getAll();
        return Array.isArray(data) ? data : [];
    }

    async createPack(packData) {
        if (!packData || typeof packData !== 'object') {
            throw new Error('Pack invalide');
        }
        const name = packData.nom ?? packData.name;
        const price = packData.prix ?? packData.price;
        const tickets = packData.nbTickets ?? packData.tickets;
        if (!name || price == null || tickets == null) {
            throw new Error('Champs requis: nom, prix, nbTickets');
        }
        const normalized = {
            nom: String(name).trim(),
            prix: Number(price),
            nbTickets: Number(tickets),
            description: packData.description ? String(packData.description).trim() : undefined,
        };
        return await PackRepository.create(normalized);
    }

    async updatePack(id, packData) {
        if (!id) throw new Error('Identifiant pack requis');
        if (!packData || typeof packData !== 'object') {
            throw new Error('Pack invalide');
        }
        const normalized = { ...packData };
        if (normalized.price != null && normalized.prix == null) normalized.prix = normalized.price;
        if (normalized.tickets != null && normalized.nbTickets == null) normalized.nbTickets = normalized.tickets;
        if (normalized.name != null && normalized.nom == null) normalized.nom = normalized.name;
        if (normalized.prix != null) normalized.prix = Number(normalized.prix);
        if (normalized.nbTickets != null) normalized.nbTickets = Number(normalized.nbTickets);
        if (normalized.nom != null) normalized.nom = String(normalized.nom).trim();
        if (normalized.description != null) normalized.description = String(normalized.description).trim();
        delete normalized.price;
        delete normalized.tickets;
        delete normalized.name;
        return await PackRepository.update(id, normalized);
    }

    async deletePack(id) {
        if (!id) throw new Error('Identifiant pack requis');
        return await PackRepository.delete(id);
    }
}

export default new PackService();
