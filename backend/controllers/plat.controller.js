// Contrôleur Plat.
// Gère le catalogue des plats disponibles (création avec image Cloudinary, modification et liste).

const Plat = require("../models/Plat");
const Review = require("../models/Review");


exports.createPlat = async (req, res) => {
  try {
    console.log("REQ.FILE:", req.file); // debug pour vérifier multer
    const plat = new Plat({
      nom: req.body.nom,
      photo: req.file ? req.file.path : null, // Cloudinary URL
      ingredients: req.body.ingredients
        ? req.body.ingredients.split(",").map(i => i.trim())
        : [],
      allergenes: req.body.allergenes
        ? req.body.allergenes.split(",").map(a => a.trim())
        : [],
      calories: req.body.calories || 0,
      typePlat: req.body.typePlat || "plat",
      typeAlimentaire: req.body.typeAlimentaire || "equilibre" // ✅ juste la string
    });

    await plat.save();
    res.status(201).json(plat);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
};

exports.getAllPlats = async (req, res) => {
  try {
    const plats = await Plat.find();
    res.json(plats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getPlatById = async (req, res) => {
  try {
    const plat = await Plat.findById(req.params.id);
    if (!plat) {
      return res.status(404).json({ message: "Plat introuvable" });
    }
    
    // Récupérer les avis associés à ce plat
    const reviews = await Review.find({ plat: req.params.id })
      .populate("student", "firstName lastName fullName")
      .sort({ createdAt: -1 });
      
    res.json({ plat, reviews });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updatePlat = async (req, res) => {
  try {
    const updateData = {};
    
    if (req.body.nom) updateData.nom = req.body.nom;
    if (req.body.calories) updateData.calories = Number(req.body.calories);
    if (req.body.typePlat) updateData.typePlat = req.body.typePlat;
    if (req.body.typeAlimentaire) updateData.typeAlimentaire = req.body.typeAlimentaire;
    
    if (req.body.ingredients !== undefined) {
      updateData.ingredients = req.body.ingredients
        ? req.body.ingredients.split(",").map(i => i.trim())
        : [];
    }
    
    if (req.body.allergenes !== undefined) {
      updateData.allergenes = req.body.allergenes
        ? req.body.allergenes.split(",").map(a => a.trim())
        : [];
    }

    if (req.file) updateData.photo = req.file.path; // Cloudinary URL

    const plat = await Plat.findByIdAndUpdate(req.params.id, updateData, {
      new: true
    });
    
    if (!plat) {
      return res.status(404).json({ message: "Plat introuvable" });
    }
    
    res.json(plat);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
};

exports.deletePlat = async (req, res) => {
  try {
    await Plat.findByIdAndDelete(req.params.id);
    res.json({ message: "Plat supprimé avec succès" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
