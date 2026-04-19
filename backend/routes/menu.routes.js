const express = require("express");
const router = express.Router();
const menuController = require("../controllers/menu.controller");
const auth = require("../middleware/auth");

router.post("/",  menuController.createMenu);
router.get("/",  menuController.getAllMenus);
router.get("/by-date",  menuController.getMenusByDate);

// ✏️ Modifier un menu
router.put("/:id",  menuController.updateMenu);

// ❌ Supprimer un menu
router.delete("/:id",  menuController.deleteMenu);

module.exports = router;