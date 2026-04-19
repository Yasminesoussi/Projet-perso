// Gere la connexion MongoDB avec une logique simple de retry.

const mongoose = require("mongoose");

let isConnecting = false;
let attempt = 0;

// Evite que Mongoose buffer trop longtemps quand MongoDB n'est pas encore pret.
// Sinon le frontend peut attendre trop longtemps avant d'avoir une vraie erreur.
mongoose.set("bufferTimeoutMS", 4000);

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("❌ Erreur MongoDB: MONGO_URI manquant dans .env");
    return;
  }

  if (mongoose.connection.readyState === 1 || isConnecting) return;
  isConnecting = true;
  attempt += 1;

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 6_000,
      connectTimeoutMS: 6_000,
      socketTimeoutMS: 30_000,
      family: 4,
    });
    console.log("✅ MongoDB connecté");
    attempt = 0;
  } catch (error) {
    const message = error?.message || String(error);
    console.error(`❌ Erreur MongoDB (tentative ${attempt})`, message);

    // Plus les echecs s'enchainent, plus on espace les nouvelles tentatives.
    const delayMs = Math.min(30_000, 1_000 * 2 ** Math.min(attempt, 5));
    setTimeout(() => {
      isConnecting = false;
      connectDB().catch(() => {});
    }, delayMs);
    return;
  } finally {
    isConnecting = false;
  }
};

module.exports = connectDB;
