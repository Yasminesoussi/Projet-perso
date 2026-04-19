const Pack = require("../models/Pack");

// ➕ Create a new Pack
exports.createPack = async (req, res) => {
    try {
        const pack = new Pack(req.body);
        await pack.save();
        res.status(201).json(pack);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// 📄 Get all Packs
exports.getAllPacks = async (req, res) => {
    try {
        const packs = await Pack.find();
        res.json(packs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ✏️ Update a Pack
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

// ❌ Delete a Pack
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
