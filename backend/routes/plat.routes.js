const express = require("express");
const router = express.Router();
const platController = require("../controllers/plat.controller");
const auth = require("../middleware/auth");
const upload = require("../middlewares/upload");

router.post("/",  upload.single("photo"), platController.createPlat);
router.get("/",  platController.getAllPlats);
router.put("/:id", upload.single("photo"), platController.updatePlat);
router.delete("/:id", platController.deletePlat);

module.exports = router;
