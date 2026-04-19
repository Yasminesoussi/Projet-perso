import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Image, ScrollView, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import PlatService from "../../services/PlatService";
import { getServerUrl } from "../../utils/image";
import { useNavigation } from "@react-navigation/native";
import ReviewService from "../../services/ReviewService";

export default function StudentPlatDetailScreen({ route }) {
  const navigation = useNavigation();
  const base = getServerUrl();
  const { item } = route.params || {};
  const [plat, setPlat] = useState(null);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviews, setReviews] = useState([
    // chargé depuis la base
  ]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const plats = await PlatService.getAllPlats();
        const match = plats.find(p => String(p.nom).trim().toLowerCase() === String(item?.name || "").trim().toLowerCase());
        setPlat(match || null);
        if (match?._id) {
          const list = await ReviewService.list(match._id);
          setReviews(list);
        } else {
          setReviews([]);
        }
      } catch {
        setPlat(null);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [item?.name]);

  const imageUri = useMemo(() => {
    if (item?.imageUri) return item.imageUri;
    if (plat?.photo) return `${base}${String(plat.photo).replace(/\\/g, "/")}`;
    return null;
  }, [item, plat, base]);

  const submitReview = async () => {
    if (!rating || !reviewText.trim() || !plat?._id) return;
    try {
      await ReviewService.create(plat._id, rating, reviewText.trim());
      const list = await ReviewService.list(plat._id);
      setReviews(list);
      setRating(0);
      setReviewText("");
    } catch (e) {
      // simple feedback
      alert(e?.response?.data?.message || "Impossible d’enregistrer l’avis");
    }
  };

  const Star = ({ index }) => {
    const active = rating >= index;
    return (
      <TouchableOpacity onPress={() => setRating(index)} style={{ padding: 2 }}>
        <Ionicons name={active ? "star" : "star-outline"} size={20} color={active ? "#f5a623" : "#c9c9c9"} />
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>
      {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}

      <Text style={styles.nom}>{item?.name || plat?.nom || "Plat"}</Text>
      <View style={styles.tagsRow}>
        <View style={[styles.tag, { backgroundColor: "#efe9dd" }]}><Text style={styles.tagText}>{item?.label || plat?.typePlat || ""}</Text></View>
        {!!plat?.typeAlimentaire && <View style={[styles.tag, { backgroundColor: "#e8f2ff" }]}><Text style={styles.tagText}>{plat.typeAlimentaire}</Text></View>}
      </View>
      {!!plat?.calories && <Text style={styles.calories}>{plat.calories} kcal</Text>}
      {!!plat?.ingredients?.length && <Text style={styles.textRow}>Ingrédients: {plat.ingredients.join(", ")}</Text>}
      {!!plat?.allergenes?.length && <Text style={styles.textRow}>Allergènes: {plat.allergenes.join(", ")}</Text>}

      <View style={styles.reviewBox}>
        <Text style={styles.reviewTitle}>Votre avis</Text>
        <View style={styles.starsRow}>
          {[1,2,3,4,5].map(i => <Star key={i} index={i} />)}
        </View>
        <TextInput
          style={styles.input}
          placeholder="Partagez votre expérience avec ce plat..."
          multiline
          value={reviewText}
          onChangeText={setReviewText}
        />
        <TouchableOpacity style={styles.submitBtn} onPress={submitReview}>
          <Text style={styles.submitText}>Publier mon avis</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Avis des étudiants</Text>
      <View style={{ gap: 10 }}>
        {reviews.map(r => (
          <View key={r.id} style={styles.reviewItem}>
            <View style={styles.reviewLeft}>
              <View style={styles.avatar}><Ionicons name="person" size={16} color="#777" /></View>
              <View>
                <Text style={styles.reviewAuthor}>{r.author?.fullName || ""}</Text>
                <Text style={styles.reviewDate}>{String(r.date).slice(0,10)}</Text>
              </View>
            </View>
            <View style={styles.reviewRight}>
              <View style={{ flexDirection: "row" }}>
                {[1,2,3,4,5].map(i => (
                  <Ionicons key={i} name={i <= r.rating ? "star" : "star-outline"} size={16} color="#f5a623" />
                ))}
              </View>
              {!!r.text && <Text style={styles.reviewText}>{r.text}</Text>}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF7F3" },
  header: { position: "absolute", top: 10, left: 10, zIndex: 10 },
  backBtn: { backgroundColor: "rgba(255,255,255,0.9)", padding: 8, borderRadius: 16 },
  image: { width: "100%", height: 220 },
  nom: { fontSize: 22, fontWeight: "800", color: Colors.text, paddingHorizontal: 16, marginTop: 12 },
  tagsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginTop: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  tagText: { fontWeight: "700", color: Colors.text },
  calories: { paddingHorizontal: 16, marginTop: 6, color: Colors.text },
  textRow: { paddingHorizontal: 16, marginTop: 6, color: Colors.text },

  reviewBox: { backgroundColor: "#fff", borderRadius: 16, padding: 12, marginHorizontal: 16, marginTop: 16 },
  reviewTitle: { fontWeight: "800", color: Colors.text, marginBottom: 8 },
  starsRow: { flexDirection: "row", marginBottom: 8 },
  input: { backgroundColor: "#f9f6f1", borderRadius: 12, minHeight: 80, padding: 10, textAlignVertical: "top" },
  submitBtn: { backgroundColor: "#b39c86", borderRadius: 12, alignItems: "center", paddingVertical: 12, marginTop: 10 },
  submitText: { color: "#fff", fontWeight: "800" },

  sectionTitle: { fontWeight: "800", color: Colors.text, paddingHorizontal: 16, marginTop: 16 },
  reviewItem: { backgroundColor: "#fff", borderRadius: 16, padding: 12, marginHorizontal: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  reviewLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#eee", justifyContent: "center", alignItems: "center" },
  reviewAuthor: { fontWeight: "700", color: Colors.text },
  reviewDate: { fontSize: 12, color: Colors.text, opacity: 0.7 },
  reviewRight: { flex: 1, marginLeft: 10 },
  reviewText: { color: Colors.text, marginTop: 6 }
});
