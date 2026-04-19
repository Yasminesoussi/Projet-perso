// Modele etudiant.
// Il stocke les infos du compte, le statut de validation et le portefeuille tickets.

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const studentSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  university: { type: String, required: true },
  level: { type: String, enum: ["L1", "L2", "L3", "M1", "M2", "Ingenieur"], required: true },
  studentNumber: { type: String, required: true, unique: true },
  cardImage: { type: String, required: true },
  selfieImage: { type: String },
  status: { type: String, enum: ["PENDING", "ACCEPTED", "REJECTED"], default: "PENDING" },
  password: { type: String, required: true },
  role: { type: String, default: "Student" },
  soldeTickets: { type: Number, default: 0 },
  blockedTickets: { type: Number, default: 0 }
}, { timestamps: true });

studentSchema.pre("save", async function () {
  if (this.isModified("password")) {
    // Le mot de passe est hache avant enregistrement en base.
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

studentSchema.methods.isValidPassword = async function (password) {
  // Compare un mot de passe brut avec le hash stocke.
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("Student", studentSchema);
