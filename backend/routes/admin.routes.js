// Routes admin.
// Elles couvrent l'authentification, la gestion des reservations et les actions cuisine.

const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const kitchenController = require("../controllers/kitchen.controller");
const authMiddleware = require("../middleware/auth");

// Auth admin
router.post("/login", adminController.login);

// Actions QR et cuisine
router.post("/scan/consume", authMiddleware, adminController.consumeByQR);
router.post("/kitchen/scan-arrival", authMiddleware, kitchenController.scanArrival);
router.post("/kitchen/scan-pickup", authMiddleware, kitchenController.scanPickup);

// Deconnexion admin
router.post("/logout", authMiddleware, adminController.logout);

// Reservation et tableau de bord
router.get("/reservations", authMiddleware, adminController.listReservations);
router.put("/reservations/:id/status", authMiddleware, adminController.updateReservationStatus);
router.get("/tickets/dashboard", authMiddleware, adminController.getTicketsDashboard);
router.get("/kitchen/dashboard", authMiddleware, kitchenController.getDashboard);
router.post("/kitchen/batches/launch", authMiddleware, kitchenController.launchBatch);
router.post("/kitchen/batches/:id/ready", authMiddleware, kitchenController.markBatchReady);
router.post("/kitchen/batches/:id/served", authMiddleware, kitchenController.markBatchServed);

// Avis et feedbacks
router.get("/reviews", authMiddleware, adminController.listReviews);
router.get("/reservation-feedbacks", authMiddleware, adminController.listReservationFeedbacks);
router.delete("/reviews/:id", authMiddleware, adminController.deleteReview);

// Profil admin connecte
router.get("/me", authMiddleware, adminController.getMe);

router.put("/me", authMiddleware, adminController.updateMe);

// Validation des comptes etudiants
router.get("/students/pending", authMiddleware, adminController.listPendingStudents);
router.post("/students/:id/approve", authMiddleware, adminController.approveStudent);
router.post("/students/:id/reject", authMiddleware, adminController.rejectStudent);

module.exports = router;
