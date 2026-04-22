// Routes admin.
// Elles couvrent l'authentification, la gestion des reservations et les actions cuisine.

const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const kitchenController = require("../controllers/kitchen.controller");
const reservationController = require("../controllers/reservation.controller");
const studentController = require("../controllers/student.controller");
const reviewController = require("../controllers/review.controller");
const authMiddleware = require("../middleware/auth");

// Auth admin
router.post("/login", adminController.login);
router.post("/logout", authMiddleware, adminController.logout);

// Profil admin connecté
router.get("/me", authMiddleware, adminController.getMe);
router.put("/me", authMiddleware, adminController.updateMe);

// Tableau de bord global
router.get("/tickets/dashboard", authMiddleware, adminController.getTicketsDashboard);

// Gestion des Réservations et Scan QR
router.post("/scan/consume", authMiddleware, reservationController.consumeByQR);
router.get("/reservations", authMiddleware, reservationController.listReservations);
router.put("/reservations/:id/status", authMiddleware, reservationController.updateReservationStatus);
router.get("/reservation-feedbacks", authMiddleware, reservationController.listReservationFeedbacks);
router.delete("/reservation-feedbacks/:id", authMiddleware, reservationController.deleteReservationFeedback);

// Cuisine
router.get("/kitchen/dashboard", authMiddleware, kitchenController.getDashboard);
router.post("/kitchen/scan-arrival", authMiddleware, kitchenController.scanArrival);
router.post("/kitchen/scan-pickup", authMiddleware, kitchenController.scanPickup);
router.post("/kitchen/batches/launch", authMiddleware, kitchenController.launchBatch);
router.post("/kitchen/batches/:id/ready", authMiddleware, kitchenController.markBatchReady);
router.post("/kitchen/batches/:id/served", authMiddleware, kitchenController.markBatchServed);

// Avis et feedbacks
router.get("/reviews", authMiddleware, reviewController.listReviews);
router.delete("/reviews/:id", authMiddleware, reviewController.deleteReview);

// Validation des comptes étudiants
router.get("/students/pending", authMiddleware, studentController.listPendingStudents);
router.post("/students/:id/approve", authMiddleware, studentController.approveStudent);
router.post("/students/:id/reject", authMiddleware, studentController.rejectStudent);

module.exports = router;
