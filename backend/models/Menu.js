// Modele menu.
// Un menu correspond a un repas donne pour une date et un creneau.

const mongoose = require("mongoose");

const MenuSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  // repas = dejeuner | diner | libre
  repas: {
    type: String,
    enum: ["dejeuner", "diner", "libre"],
    required: true
  },
  // creneau = plage horaire texte, ex: "12h00 → 13h15"
  creneau: {
    type: String,
    required: true 
  },
  plats: [{
    // Liste des plats proposes dans ce menu.
    type: mongoose.Schema.Types.ObjectId,
    ref: "Plat"
  }],
  capacite: {
    type: Number,
    required: true
  },
  reserve: {
    // Nombre de places deja reservees sur ce menu.
    type: Number,
    default: 0
  },
  typeMenu: {
    type: String,
    enum: ["normal", "ramadan", "examens", "evenement"],
    default: "normal"
  }
}, { timestamps: true });

module.exports = mongoose.model("Menu", MenuSchema);
