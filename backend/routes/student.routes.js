// Routes étudiant.
// On retrouve ici l'auth, les réservations, les commandes et les notifications.

const express = require("express");
const router = express.Router();
const studentController = require("../controllers/student.controller");
const reservationController = require("../controllers/reservation.controller");
const stripeController = require("../controllers/stripe.controller");
const studentAuth = require("../middleware/studentAuth");
const upload = require("../middlewares/upload");

// Authentification et profil
router.post("/signup", upload.fields([{ name: "card", maxCount: 1 }]), studentController.signup);
router.post("/login", studentController.login);
router.post("/logout", studentAuth, studentController.logout);
router.get("/me", studentAuth, studentController.getMe);

// Historique et notifications
router.get("/orders", studentAuth, studentController.getMyOrders);
router.get("/notifications", studentAuth, studentController.getMyNotifications);
router.post("/notifications/read", studentAuth, studentController.markNotificationsRead);
router.delete("/notifications/:id", studentAuth, studentController.dismissNotification);
router.post("/orders/:id/confirm-receipt", studentAuth, studentController.confirmOrderReceipt);
router.post("/wallet/credit", studentAuth, studentController.creditWallet);

// Paiements (Stripe)
router.post("/pack-payments/prepare", studentAuth, stripeController.createPackPaymentIntent);
router.post("/pack-payments/finalize", studentAuth, stripeController.finalizePackPaymentIntent);
router.get("/pack-payments", studentAuth, stripeController.listMyPackPurchases);
router.get("/pack-payments/:purchaseId", studentAuth, stripeController.getPackPurchaseById);

// Réservations
router.post("/reservations", studentAuth, reservationController.createReservation);
router.get("/reservations", studentAuth, reservationController.getReservations);
router.get("/reservations/seat-map", studentAuth, reservationController.getSeatMap);
router.get("/reservations/:id", studentAuth, reservationController.getReservationById);
router.put("/reservations/:id", studentAuth, reservationController.updateReservation);
router.post("/reservations/:id/leave", studentAuth, reservationController.leaveRestaurant);
router.post("/reservations/:id/feedback", studentAuth, reservationController.submitServiceFeedback);
router.delete("/reservations/:id", studentAuth, reservationController.cancelReservation);

module.exports = router;
