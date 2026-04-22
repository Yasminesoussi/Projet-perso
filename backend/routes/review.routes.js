const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/review.controller");
const studentAuth = require("../middleware/studentAuth");

router.get("/plats/:id", reviewController.getReviewsByPlat);
router.post("/plats/:id", studentAuth, reviewController.createReview);
router.post("/", studentAuth, reviewController.createReview);

module.exports = router;
