const express = require("express");
const router = express.Router();
const platController = require("../controllers/plat.controller");
const multer = require("multer");
const path = require("path");
const auth = require("../middleware/auth");
const fs = require("fs");

// Créer dossier uploads s'il n'existe pas
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Config multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

router.post("/",  upload.single("photo"), platController.createPlat);
router.get("/",  platController.getAllPlats);
router.put("/:id", upload.single("photo"), platController.updatePlat);
router.delete("/:id", platController.deletePlat);

module.exports = router;
