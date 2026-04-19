// Modele reservation.
// C'est la piece centrale entre l'etudiant, le menu, le QR code et les places.

const mongoose = require("mongoose");

const ReservationSchema = new mongoose.Schema({
  // Etudiant proprietaire de la reservation.
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  // Date gardee en texte simple pour faciliter certains filtres cote metier.
  dateISO: { type: String, required: true },
  repas: { type: String, enum: ["dejeuner", "diner", "libre"], required: true },
  creneau: { type: String, required: true },
  // surPlace = place en salle, aEmporter = retrait sans place.
  typeRepas: { type: String, enum: ["surPlace", "aEmporter"], default: "surPlace" },
  groupSize: { type: Number, default: 1, min: 1 },
  selectedSeats: [{
    id: { type: String },
    label: { type: String },
    tableId: { type: String },
    tableLabel: { type: String },
    status: { type: String, enum: ["available", "reserved", "occupied"], default: "available" },
  }],
  // Le statut pilote la vie complete de la reservation.
  status: { type: String, enum: ["ACTIVE", "CONSUMED", "CANCELLED", "EXPIRED"], default: "ACTIVE" },
  leftRestaurantAt: { type: Date, default: null },
  // Le QR embarque les infos utiles au scan admin.
  qrPayload: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model("Reservation", ReservationSchema);
