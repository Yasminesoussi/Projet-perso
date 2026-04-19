const Menu = require("../models/Menu");

function normalizeMenuDateInput(value) {
  if (!value) return value;
  if (value instanceof Date) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return new Date(`${value}T00:00:00.000Z`);
  }
  return new Date(value);
}

function getUTCDateRange(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return null;
  return {
    start: new Date(`${date}T00:00:00.000Z`),
    end: new Date(`${date}T23:59:59.999Z`),
  };
}

// ➕ Créer un menu
module.exports.createMenu = async (req, res) => {
  try {
    // Compat: accepter anciens champs { creneau: 'dejeuner|diner', horaire: '12h00 → 13h15' }
    const body = { ...req.body };
    if (!body.repas && body.creneau && ["dejeuner", "diner", "libre"].includes(String(body.creneau).toLowerCase())) {
      body.repas = String(body.creneau).toLowerCase();
    }
    if (!body.creneau && body.horaire) {
      body.creneau = String(body.horaire);
    }
    delete body.horaire;
    if (body.date) body.date = normalizeMenuDateInput(body.date);
    const menu = new Menu(body);
    await menu.save();
    res.status(201).json(menu);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// 📄 Récupérer tous les menus
module.exports.getAllMenus = async (req, res) => {
  try {
    const menus = await Menu.find().populate("plats");
    res.json(menus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 📄 Récupérer les menus par date et créneau (optionnel)
module.exports.getMenusByDate = async (req, res) => {
  try {
    const { date, creneau, repas } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Date requise" });
    }

    // Crée la plage complète du jour
    const range = getUTCDateRange(date);
    if (!range) {
      return res.status(400).json({ message: "Date invalide" });
    }

    const filter = { date: { $gte: range.start, $lte: range.end } };

    const meal = (repas || creneau || "").toLowerCase();
    if (meal) filter.repas = meal;

    // Récupère tous les menus et population des plats
    const menus = await Menu.find(filter).populate("plats");

    res.json(menus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✏️ Modifier un menu par ID
module.exports.updateMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const body = { ...req.body };
    if (!body.repas && body.creneau && ["dejeuner", "diner", "libre"].includes(String(body.creneau).toLowerCase())) {
      body.repas = String(body.creneau).toLowerCase();
    }
    if (!body.creneau && body.horaire) {
      body.creneau = String(body.horaire);
    }
    delete body.horaire;
    if (body.date) body.date = normalizeMenuDateInput(body.date);
    const updatedMenu = await Menu.findByIdAndUpdate(id, body, { new: true }).populate("plats");
    if (!updatedMenu) return res.status(404).json({ message: "Menu non trouvé" });
    res.json(updatedMenu);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ❌ Supprimer un menu par ID
module.exports.deleteMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedMenu = await Menu.findByIdAndDelete(id);
    if (!deletedMenu) return res.status(404).json({ message: "Menu non trouvé" });
    res.json({ message: "Menu supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
