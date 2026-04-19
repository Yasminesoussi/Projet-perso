const mongoose = require("mongoose");

const StudentNotificationSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    key: { type: String, required: true },
    type: { type: String, enum: ["order", "reservation", "menu"], required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    icon: { type: String, required: true },
    tint: { type: String, required: true },
    bg: { type: String, required: true },
    actionLabel: { type: String, default: null },
    actionRoute: { type: String, default: null },
    sourceCreatedAt: { type: Date, default: Date.now },
    read: { type: Boolean, default: false },
    dismissed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

StudentNotificationSchema.index({ student: 1, key: 1 }, { unique: true });

module.exports = mongoose.model("StudentNotification", StudentNotificationSchema);
