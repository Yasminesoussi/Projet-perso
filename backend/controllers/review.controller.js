// Contrôleur Avis (Review).
// Gère les commentaires et les notes laissés par les étudiants sur les plats qu'ils ont consommés.

const Review = require("../models/Review");
const Student = require("../models/Student");
const { escapeRegExp } = require("../utils/string.utils");

// 🔹 Crée ou met à jour l'avis d'un étudiant sur un plat spécifique
exports.createReview = async (req, res) => {
  try {
    const { platId, rating, text } = req.body;
    const studentId = req.studentId;

    if (!platId || !rating) {
      return res.status(400).json({ message: "Plat et note obligatoires" });
    }

    const review = await Review.findOneAndUpdate(
      { plat: platId, student: studentId },
      { rating, text, createdAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ message: "Avis enregistré", review });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// 🔹 Liste tous les avis pour un plat donné (visible par tous les étudiants)
exports.getReviewsByPlat = async (req, res) => {
  try {
    const { platId } = req.params;
    const reviews = await Review.find({ plat: platId })
      .populate("student", "firstName lastName")
      .sort({ createdAt: -1 });

    const out = reviews.map(r => ({
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

// 🔹 Liste tous les avis de la plateforme avec recherche et pagination (Admin)
exports.listReviews = async (req, res) => {
  try {
    const { q, rating, platId, page = 1, limit = 25, sort = "-createdAt" } = req.query || {};
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));

    const match = {};
    if (rating) match.rating = Number(rating);
    if (platId) match.plat = platId;

    const regex = q && String(q).trim() ? new RegExp(escapeRegExp(String(q).trim()), "i") : null;

    const commonPipeline = [
      { $match: match },
      { $lookup: { from: "plats", localField: "plat", foreignField: "_id", as: "plat" } },
      { $unwind: "$plat" },
      { $lookup: { from: "students", localField: "student", foreignField: "_id", as: "student" } },
      { $unwind: "$student" },
    ];

    if (regex) {
      commonPipeline.push({
        $match: {
          $or: [
            { "student.firstName": { $regex: regex } },
            { "student.lastName": { $regex: regex } },
            { "plat.nom": { $regex: regex } },
          ],
        },
      });
    }

    const reviews = await Review.aggregate([
      ...commonPipeline,
      { $sort: { createdAt: sort.startsWith("-") ? -1 : 1 } },
      { $skip: (pageNum - 1) * limitNum },
      { $limit: limitNum },
    ]);

    res.json({ reviews, page: pageNum, total: reviews.length });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};

// 🔹 Supprime définitivement un avis (Admin)
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Review.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Feedback introuvable" });
    res.json({ message: "Feedback supprimé" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error });
  }
};
