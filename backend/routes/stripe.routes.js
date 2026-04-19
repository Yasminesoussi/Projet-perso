// Route webhook Stripe.
// Elle doit etre montee avant express.json pour conserver le corps brut.

const express = require("express");
const router = express.Router();
const stripeController = require("../controllers/stripe.controller");

router.post("/webhook", express.raw({ type: "application/json" }), stripeController.handleWebhook);

module.exports = router;
