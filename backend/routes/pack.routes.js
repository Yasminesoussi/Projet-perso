const express = require("express");
const router = express.Router();
const packController = require("../controllers/pack.controller");

router.post("/", packController.createPack);
router.get("/", packController.getAllPacks);
router.put("/:id", packController.updatePack);
router.delete("/:id", packController.deletePack);

module.exports = router;
