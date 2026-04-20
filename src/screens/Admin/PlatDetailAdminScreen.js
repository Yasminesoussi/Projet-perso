import React, { useMemo, useState, useEffect } from "react";
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { getImageUri } from "../../utils/image";
import PlatService from "../../services/PlatService";

function getStudentName(review) {
  const firstName = review?.student?.firstName || review?.author?.firstName || "";
  const lastName = review?.student?.lastName || review?.author?.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || review?.author?.fullName || "Etudiant";
}

function getReviewDate(review) {
  const raw = review?.createdAt || review?.date;
  if (!raw) return "";
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return String(raw).slice(0, 10);
  return dt.toLocaleDateString("fr-FR");
}

export default function PlatDetailAdminScreen({ route }) {
  const { plat: initialPlat } = route.params || {};
  const [plat, setPlat] = useState(initialPlat);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDetails = async () => {
      try {
        const data = await PlatService.getPlatById(initialPlat._id);
        setPlat(data.plat);
        setReviews(data.reviews);
      } catch (err) {
        console.error("Erreur lors de la récupération des avis:", err);
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [initialPlat._id]);

  const imageUri = useMemo(() => getImageUri(plat?.photo), [plat?.photo]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {imageUri ? <Image source={{ uri: imageUri }} style={styles.image} /> : null}

      <Text style={styles.nom}>{plat?.nom || "Plat"}</Text>

      <View style={styles.tagsRow}>
        <TouchableOpacity style={[styles.tag, styles.tagWarm]} activeOpacity={0.9}>
          <Text style={styles.tagText}>{plat?.typePlat || "Type de plat"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tag, styles.tagCool]} activeOpacity={0.9}>
          <Text style={styles.tagText}>{plat?.typeAlimentaire || "Type alimentaire"}</Text>
        </TouchableOpacity>
      </View>

      {!!plat?.calories && <Text style={styles.calories}>{plat.calories} kcal</Text>}
      {!!plat?.ingredients?.length && (
        <Text style={styles.textRow}>Ingredients: {plat.ingredients.join(", ")}</Text>
      )}
      {!!plat?.allergenes?.length && (
        <Text style={styles.allergenes}>Allergenes: {plat.allergenes.join(", ")}</Text>
      )}

      <Text style={styles.sectionTitle}>Avis des etudiants</Text>
      <View style={styles.reviewsList}>
        {reviews.length ? (
          reviews.map((review, index) => (
            <View
              key={String(review?.id || review?._id || `${plat?._id || plat?.id || "plat"}-${index}`)}
              style={styles.reviewItem}
            >
              <View style={styles.reviewLeft}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={16} color="#777" />
                </View>
                <View>
                  <Text style={styles.reviewAuthor}>{getStudentName(review)}</Text>
                  <Text style={styles.reviewDate}>{getReviewDate(review)}</Text>
                </View>
              </View>

              <View style={styles.reviewRight}>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name={star <= Number(review?.rating || 0) ? "star" : "star-outline"}
                      size={16}
                      color="#f5a623"
                    />
                  ))}
                </View>
                <Text style={styles.reviewText}>{review?.text?.trim() || "Aucun commentaire"}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Aucun avis pour ce plat.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF7F3" },
  content: { paddingBottom: 40 },
  image: { width: "100%", height: 220 },
  nom: { fontSize: 22, fontWeight: "800", color: Colors.text, paddingHorizontal: 16, marginTop: 12 },
  tagsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginTop: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  tagWarm: { backgroundColor: "#efe9dd" },
  tagCool: { backgroundColor: "#e8f2ff" },
  tagText: { fontWeight: "700", color: Colors.text },
  calories: { paddingHorizontal: 16, marginTop: 6, color: Colors.text },
  textRow: { paddingHorizontal: 16, marginTop: 6, color: Colors.text },
  allergenes: { paddingHorizontal: 16, marginTop: 6, color: "#B42318", fontWeight: "700" },
  sectionTitle: { fontWeight: "800", color: Colors.text, paddingHorizontal: 16, marginTop: 18 },
  reviewsList: { gap: 10, marginTop: 10 },
  reviewItem: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  reviewLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  reviewAuthor: { fontWeight: "700", color: Colors.text },
  reviewDate: { fontSize: 12, color: Colors.text, opacity: 0.7 },
  reviewRight: { flex: 1, marginLeft: 10 },
  starsRow: { flexDirection: "row" },
  reviewText: { color: Colors.text, marginTop: 6 },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
  },
  emptyText: { color: Colors.text, opacity: 0.7 },
  center: { justifyContent: "center", alignItems: "center" },
});
