// Contrôleur Pack.
// Gère les différents types de packs de tickets disponibles à l'achat pour les étudiants.

const Pack = require("../models/Pack");

// 🔹 Crée une nouvelle offre de pack de tickets (ex: Pack 10 repas)
exports.createPack = async (req, res) => {
    try {
        const pack = new Pack(req.body);
        await pack.save();
        res.status(201).json(pack);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// 🔹 Récupère la liste de tous les packs disponibles pour les étudiants
exports.getAllPacks = async (req, res) => {
    try {
        const packs = await Pack.find();
        res.json(packs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 🔹 Met à jour les détails d'un pack (prix, nombre de tickets, nom)
exports.updatePack = async (req, res) => {
    try {
        const { id } = req.params;
        const pack = await Pack.findByIdAndUpdate(id, req.body, { new: true });
        if (!pack) return res.status(404).json({ message: "Pack not found" });
        res.json(pack);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// 🔹 Supprime définitivement un pack de l'offre
exports.deletePack = async (req, res) => {
    try {
        const { id } = req.params;
        const pack = await Pack.findByIdAndDelete(id);
        if (!pack) return res.status(404).json({ message: "Pack not found" });
        res.json({ message: "Pack deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
