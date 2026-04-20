const Plat = require("../models/Plat");


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

exports.updatePlat = async (req, res) => {
  try {
    const updateData = {
      nom: req.body.nom,
      calories: req.body.calories,
      typePlat: req.body.typePlat,
      ingredients: req.body.ingredients
        ? req.body.ingredients.split(",").map(i => i.trim())
        : [],
      allergenes: req.body.allergenes
        ? req.body.allergenes.split(",").map(a => a.trim())
        : [],
      typeAlimentaire: req.body.typeAlimentaire || "equilibre" // ✅ juste string
    };

    if (req.file) updateData.photo = req.file.path; // Cloudinary URL

    const plat = await Plat.findByIdAndUpdate(req.params.id, updateData, {
      new: true
    });
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
