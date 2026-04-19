const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema({
  plat: { type: mongoose.Schema.Types.ObjectId, ref: "Plat", required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  text: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model("Review", ReviewSchema);
