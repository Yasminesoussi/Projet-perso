const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/review.controller");
const studentAuth = require("../middleware/studentAuth");

router.get("/plats/:id", reviewController.listByPlat);
router.post("/plats/:id", studentAuth, reviewController.createForPlat);

module.exports = router;
