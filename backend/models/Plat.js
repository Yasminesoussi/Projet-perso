const mongoose = require("mongoose");

const PlatSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  photo: String,
  ingredients: [String],
  allergenes: [String],
  calories: { type: Number, default: 0 },

  typePlat: {
    type: String,
    enum: ["entree", "plat", "dessert"],
    default: "plat"
  },

  typeAlimentaire: {
    type: String,
    enum: ["equilibre", "leger", "energetique"],
    default: "equilibre"
  }

}, { timestamps: true });

module.exports = mongoose.model("Plat", PlatSchema);