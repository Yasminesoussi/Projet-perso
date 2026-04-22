// Contrôleur Avis (Review).
// Gère les commentaires et les notes laissés par les étudiants sur les plats qu'ils ont consommés.

const Review = require("../models/Review");
const Student = require("../models/Student");
const { escapeRegExp } = require("../utils/string.utils");

// 🔹 Crée ou met à jour l'avis d'un étudiant sur un plat spécifique
exports.createReview = async (req, res) => {
  try {
    const { rating, text } = req.body;
    const platId = req.params.id || req.body.platId; // Accepte l'id dans l'URL ou le corps
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
    const platId = req.params.id;
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

    const [results, stats] = await Promise.all([
      Review.aggregate([
        ...commonPipeline,
        { $sort: { createdAt: sort.startsWith("-") ? -1 : 1 } },
        { $skip: (pageNum - 1) * limitNum },
        { $limit: limitNum },
      ]),
      Review.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            avgRating: { $avg: "$rating" },
            count1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
            count2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
            count3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
            count4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
            count5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const statData = stats[0] || { total: 0, avgRating: 0 };
    const statsByRating = {
      1: statData.count1 || 0,
      2: statData.count2 || 0,
      3: statData.count3 || 0,
      4: statData.count4 || 0,
      5: statData.count5 || 0,
    };

    res.json({
      reviews: results,
      page: pageNum,
      total: statData.total,
      avgRating: statData.avgRating,
      statsByRating,
    });
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
