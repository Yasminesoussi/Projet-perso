require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Menu = require("../models/Menu");

(async () => {
  try {
    await connectDB();
    const menus = await Menu.find({}).lean();
    let updates = 0;

    for (const m of menus) {
      const id = m._id;
      const oldCreneau = m.creneau; // anciennement 'meal' OU déjà 'creneau' texte
      const oldHoraire = m.horaire; // peut exister sur anciens docs
      const oldRepas = m.repas;     // peut déjà exister

      const isMeal = (val) => ["dejeuner", "diner", "libre"].includes(String(val || "").toLowerCase());

      const repas = oldRepas || (isMeal(oldCreneau) ? oldCreneau : undefined);
      const creneau = !isMeal(oldCreneau) && oldCreneau ? oldCreneau : (oldHoraire || undefined);

      const patch = {};
      if (repas && m.repas !== repas) patch.repas = repas;
      if (creneau && m.creneau !== creneau) patch.creneau = creneau;

      // Nettoyage: supprimer champ obsolète 'horaire' s'il existe
      if (typeof m.horaire !== "undefined") patch.horaire = undefined;

      if (Object.keys(patch).length > 0) {
        await Menu.updateOne({ _id: id }, { $set: patch, $unset: { horaire: "" } });
        updates++;
      }
    }

    console.log(`✅ Migration terminée. Menus mis à jour: ${updates}/${menus.length}`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (e) {
    console.error("❌ Erreur migration:", e);
    process.exit(1);
  }
})();
