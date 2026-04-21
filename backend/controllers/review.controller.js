// Contrôleur Avis (Review).
// Gère les commentaires et les notes laissés par les étudiants sur les plats qu'ils ont consommés.

const Review = require("../models/Review");
const Student = require("../models/Student");

exports.listByPlat = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await Review.find({ plat: id }).sort({ createdAt: -1 }).populate("student", "firstName lastName");
    const out = rows.map(r => ({
      id: r._id,
      rating: r.rating,
      text: r.text || "",
      date: r.createdAt,
      author: { fullName: `${r.student?.firstName || ""} ${r.student?.lastName || ""}`.trim() }
    }));
    res.json({ reviews: out });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

exports.createForPlat = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, text } = req.body || {};
    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({ message: "Note invalide" });
    }
    const student = await Student.findById(req.studentId);
    if (!student) return res.status(404).json({ message: "Étudiant introuvable" });
    const review = await Review.create({
      plat: id,
      student: student._id,
      rating: Number(rating),
      text: String(text || "")
    });
    res.status(201).json({
      id: review._id,
      rating: review.rating,
      text: review.text,
      date: review.createdAt,
      author: { fullName: `${student.firstName} ${student.lastName}` }
    });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};
