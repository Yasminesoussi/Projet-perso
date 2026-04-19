// Point d'entree du backend Express.
// Ce fichier charge la config, connecte MongoDB puis branche toutes les routes API.

require("dns").setServers(["8.8.8.8", "1.1.1.1"]); // Evite certains problemes DNS sur quelques reseaux.

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

connectDB();

const app = express();

app.use(cors());
// Le webhook Stripe doit rester en corps brut avant express.json.
const stripeRoutes = require("./routes/stripe.routes");
app.use("/api/stripe", stripeRoutes);
app.use(express.json());
// Rend les images uploadees accessibles depuis le frontend.
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const platRoutes = require("./routes/plat.routes");
const menuRoutes = require("./routes/menu.routes");
const adminRoutes = require("./routes/admin.routes");
const packRoutes = require("./routes/pack.routes");
const studentRoutes = require("./routes/student.routes");
const reviewRoutes = require("./routes/review.routes");

app.use("/api/plats", platRoutes);
app.use("/api/menus", menuRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/packs", packRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/reviews", reviewRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});

process.on("SIGINT", async () => {
  try {
    await require("mongoose").disconnect();
  } catch {}
  process.exit(0);
});
