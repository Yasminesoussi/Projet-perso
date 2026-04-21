// Contrôleur Menu.
// Gère la création, la lecture, la mise à jour et la suppression (CRUD) des menus quotidiens (déjeuner/dîner).

const Menu = require("../models/Menu");
const Student = require("../models/Student");
const StudentNotification = require("../models/StudentNotification");

// Normalise la date reçue en entrée pour assurer un format Date JS valide (UTC)
function normalizeMenuDateInput(value) {
  if (!value) return value;
  if (value instanceof Date) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return new Date(`${value}T00:00:00.000Z`);
  }
  return new Date(value);
}

// Génère une plage de temps couvrant toute la journée spécifiée (du début à la fin en UTC)
function getUTCDateRange(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return null;
  return {
    start: new Date(`${date}T00:00:00.000Z`),
    end: new Date(`${date}T23:59:59.999Z`),
  };
}

// 🔹 Crée un nouveau menu quotidien avec ses plats et son créneau horaire
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

    // 🔔 Notification globale : Nouveau menu publié
    try {
      const students = await Student.find({ status: "ACCEPTED" }).select("_id");
      const dateStr = menu.date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
      const notifications = students.map((student) => ({
        student: student._id,
        key: `new_menu_${menu._id}_${student._id}`,
        type: "menu",
        title: "Nouveau menu disponible ! 🍴",
        body: `Le menu du ${dateStr} (${menu.repas}) est maintenant en ligne.`,
        icon: "restaurant-outline",
        bg: "#F8F9FA",
        tint: "#212529",
        actionRoute: "StudentHome",
      }));
      // Insertion en masse pour être plus performant
      if (notifications.length > 0) {
        await StudentNotification.insertMany(notifications, { ordered: false }).catch(() => {});
      }
    } catch (e) {
      console.error("Erreur notification nouveau menu :", e.message);
    }

    res.status(201).json(menu);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// 🔹 Récupère la liste complète de tous les menus enregistrés en base de données
module.exports.getAllMenus = async (req, res) => {
  try {
    const menus = await Menu.find().populate("plats");
    res.json(menus);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 🔹 Récupère les menus pour une date précise, filtrable par type de repas (déjeuner/dîner)
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

// 🔹 Met à jour les informations d'un menu existant (plats, horaires, capacité)
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

// 🔹 Supprime définitivement un menu de la base de données
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
