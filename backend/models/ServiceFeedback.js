const mongoose = require("mongoose");

const ServiceFeedbackSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    reservation: { type: mongoose.Schema.Types.ObjectId, ref: "Reservation", required: true, unique: true },
    serviceRating: { type: Number, min: 1, max: 5, required: true },
    mealRating: { type: Number, min: 1, max: 5, required: true },
    ambianceRating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ServiceFeedback", ServiceFeedbackSchema);
