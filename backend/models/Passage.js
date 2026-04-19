const mongoose = require("mongoose");

const PassageSchema = new mongoose.Schema({
  reservation: { type: mongoose.Schema.Types.ObjectId, ref: "Reservation", required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: false },
  date: { type: Date, default: Date.now, required: true },
  repas: { type: String, enum: ["dejeuner", "diner", "libre"], required: true },
  creneau: { type: String, required: true }, // plage horaire texte
  source: { type: String, enum: ["QR", "MANUAL"], default: "QR" }
}, { timestamps: true });

module.exports = mongoose.model("Passage", PassageSchema);
