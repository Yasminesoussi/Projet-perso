// Screen “Mes réservations”: UI + navigation + état local
// Note: appelle aujourd’hui ReservationService directement pour lister,
// peut être déplacé en usecase “student/reservations” si besoin
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, TextInput, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Colors from "../../constants/Colors";
import StudentBottomTabs from "../../navigation/StudentBottomTabs";
import ReservationService from "../../services/ReservationService";
import StudentAuthService from "../../services/StudentAuthService";

export default function StudentReservationsScreen() {
  const navigation = useNavigation();
  const [tab, setTab] = useState("upcoming");
  const [loading, setLoading] = useState(false);
  const [upcoming, setUpcoming] = useState([]);
  const [history, setHistory] = useState([]);
  const [cancelled, setCancelled] = useState([]);
  const [solde, setSolde] = useState({ total: 0, blocked: 0 });
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackReservation, setFeedbackReservation] = useState(null);
  const [serviceRating, setServiceRating] = useState(0);
  const [mealRating, setMealRating] = useState(0);
  const [ambianceRating, setAmbianceRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await ReservationService.getMyReservations("upcoming");
        setUpcoming(res?.reservations || []);
      } catch {
        setUpcoming([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadSolde = async () => {
      try {
        const me = await StudentAuthService.me();
        const total = me?.student?.soldeTickets ?? 0;
        const blocked = me?.student?.blockedTickets ?? 0;
        setSolde({ total, blocked });
      } catch {
        setSolde({ total: 0, blocked: 0 });
      }
    };
    loadSolde();
  }, []);

  const loadScope = async (scope) => {
    try {
      setLoading(true);
      const res = await ReservationService.getMyReservations(scope);
      const items = res?.reservations || [];
      if (scope === "history") {
        setHistory(items);
      } else if (scope === "cancelled") {
        setCancelled(items);
      }
    } catch {
      if (scope === "history") setHistory([]);
      if (scope === "cancelled") setCancelled([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "history" && history.length === 0) {
      loadScope("history");
    } else if (tab === "cancelled" && cancelled.length === 0) {
      loadScope("cancelled");
    }
  }, [tab]);

  const list = tab === "upcoming" ? upcoming : tab === "history" ? history : cancelled;

  const applyReservationPatch = (reservationId, patch) => {
    const updateList = (items) => items.map((item) => (item.id === reservationId ? { ...item, ...patch } : item));
    setUpcoming((items) => updateList(items));
    setHistory((items) => updateList(items));
    setCancelled((items) => updateList(items));
  };

  // Style visuel du statut
  const statusStyle = (s) => {
    const ok = s === "ACTIVE" || s === "Confirmé";
    return {
      container: [styles.statusPill, { backgroundColor: ok ? "#EAF5EE" : s === "CANCELLED" ? "#FDECEC" : "#F3E8FF", borderColor: ok ? "#2e7d32" : s === "CANCELLED" ? "#b85c5c" : "#6b4eff" }],
      text: [styles.statusText, { color: ok ? "#2e7d32" : s === "CANCELLED" ? "#b85c5c" : "#6b4eff" }],
    };
  };

  const iconName = (meal) => (meal === "dejeuner" ? "sunny-outline" : "moon-outline");

  const resetFeedbackModal = () => {
    setFeedbackModalVisible(false);
    setFeedbackReservation(null);
    setServiceRating(0);
    setMealRating(0);
    setAmbianceRating(0);
    setFeedbackComment("");
    setSubmittingFeedback(false);
  };

  const openFeedbackModal = (reservation) => {
    setFeedbackReservation(reservation);
    setServiceRating(0);
    setMealRating(0);
    setAmbianceRating(0);
    setFeedbackComment("");
    setFeedbackModalVisible(true);
  };

  const renderStars = (value, onChange) => (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => onChange(star)} style={styles.starButton} activeOpacity={0.85}>
          <Ionicons name={star <= value ? "star" : "star-outline"} size={24} color={star <= value ? "#F2B94B" : "#C9B8A8"} />
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#d7c9bb", "#b9a892"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.replace("StudentHome")} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mes réservations</Text>
          <View style={{ width: 22 }} />
        </View>
      </LinearGradient>

      <View style={styles.summaryRow}>
        <View style={styles.summaryPill}>
          <Ionicons name="ticket-outline" size={16} color="#2e7d32" />
          <Text style={styles.summaryText}>Solde: {solde.total}</Text>
        </View>
        <View style={[styles.summaryPill, { borderColor: "#b85c5c" }]}>
          <Ionicons name="lock-closed-outline" size={16} color="#b85c5c" />
          <Text style={[styles.summaryText, { color: "#b85c5c" }]}>Bloqués: {solde.blocked}</Text>
        </View>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity onPress={() => setTab("upcoming")} style={[styles.tabChip, tab === "upcoming" && styles.tabChipActive]}>
          <Text style={[styles.tabText, tab === "upcoming" && styles.tabTextActive]}>À venir</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab("history")} style={[styles.tabChip, tab === "history" && styles.tabChipActive]}>
          <Text style={[styles.tabText, tab === "history" && styles.tabTextActive]}>Historique</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab("cancelled")} style={[styles.tabChip, tab === "cancelled" && styles.tabChipActive]}>
          <Text style={[styles.tabText, tab === "cancelled" && styles.tabTextActive]}>Annulées</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading && (
          <View style={{ paddingVertical: 20, alignItems: "center" }}>
            <ActivityIndicator size="large" color={Colors.text} />
            <Text style={{ marginTop: 8, color: Colors.text, opacity: 0.7 }}>Chargement…</Text>
          </View>
        )}
        {list.map((r) => {
          const st = statusStyle(r.status);
          return (
            <View key={r.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <View style={styles.cardIcon}>
                    <Ionicons name={iconName(r.repas)} size={18} color="#d9b99b" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{r.repas === "dejeuner" ? "Déjeuner" : "Dîner"}</Text>
                    <Text style={styles.cardSub}>{r.creneau}</Text>
                  </View>
                </View>
                <View style={st.container}>
                  <Text style={st.text}>{r.status}</Text>
                </View>
              </View>

              <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Type de repas:</Text>
                  <Text style={styles.infoValue}>{r.typeRepas === "aEmporter" ? "À emporter" : "Sur place"}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Date:</Text>
                  <Text style={styles.infoValue}>{r.dateISO}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Personnes:</Text>
                  <Text style={styles.infoValue}>{r.groupSize || 1}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tickets bloques:</Text>
                  <Text style={styles.infoValue}>{r.groupSize || 1}</Text>
                </View>
                {r.selectedSeats?.length ? (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Places:</Text>
                    <Text style={[styles.infoValue, styles.infoValueSeats]}>{r.selectedSeats.map((seat) => seat.label).join(", ")}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.qrBtn]}
                  onPress={() =>
                    navigation.navigate("StudentReservationQR", {
                      reservation: {
                        id: r.id,
                        qrPayload: r.qrPayload,
                        repas: r.repas,
                        creneau: r.creneau,
                        dateISO: r.dateISO,
                        status: r.status,
                        typeRepas: r.typeRepas,
                        groupSize: r.groupSize || 1,
                        selectedSeats: r.selectedSeats || [],
                      },
                    })
                  }
                >
                  <Ionicons name="qr-code-outline" size={18} color="#fff" />
                  <Text style={styles.qrText}>QR Code</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.editBtn, !r?.actions?.canEdit && { opacity: 0.5 }]}
                  disabled={!r?.actions?.canEdit}
                  onPress={() => {
                    navigation.navigate("StudentReserve", {
                      mode: "edit",
                      reservation: { id: r.id, dateISO: r.dateISO, repas: r.repas, creneau: r.creneau, typeRepas: r.typeRepas, groupSize: r.groupSize || 1, selectedSeats: r.selectedSeats || [] }
                    });
                  }}
                >
                  <Text style={styles.editText}>Modifier</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.cancelBtn, !r?.actions?.canCancel && { opacity: 0.5 }]}
                  disabled={!r?.actions?.canCancel}
                  onPress={async () => {
                    try {
                      await ReservationService.cancelReservation(r.id);
                      if (tab === "upcoming") {
                        setUpcoming((list) => list.filter((x) => x.id !== r.id));
                      } else if (tab === "cancelled") {
                        // recharger l'onglet annulées
                        const res = await ReservationService.getMyReservations("cancelled");
                        setCancelled(res?.reservations || []);
                      }
                      // rafraîchir solde/blocked après annulation
                      const me = await StudentAuthService.me();
                      setSolde({
                        total: me?.student?.soldeTickets ?? 0,
                        blocked: me?.student?.blockedTickets ?? 0
                      });
                    } catch {}
                  }}
                >
                  <Ionicons name="close" size={16} color="#b85c5c" />
                </TouchableOpacity>
              </View>

              {r.typeRepas !== "aEmporter" && r.canLeave ? (
                <TouchableOpacity
                  style={styles.leaveBtn}
                  onPress={async () => {
                    try {
                      const res = await ReservationService.leaveRestaurant(r.id);
                      applyReservationPatch(r.id, {
                        canLeave: false,
                        leftRestaurantAt: res?.reservation?.leftRestaurantAt || new Date().toISOString(),
                        selectedSeats: res?.reservation?.selectedSeats || r.selectedSeats || [],
                      });
                      openFeedbackModal(r);
                    } catch {}
                  }}
                >
                  <Ionicons name="log-out-outline" size={16} color="#7A5B44" />
                  <Text style={styles.leaveText}>Je quitte le resto</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })}

        {list.length === 0 && <Text style={{ color: Colors.text, opacity: 0.6, textAlign: "center", marginTop: 20 }}>Aucune réservation.</Text>}
      </ScrollView>

      <Modal
        visible={feedbackModalVisible}
        transparent
        animationType="fade"
        onRequestClose={resetFeedbackModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.feedbackModalCard}>
            <LinearGradient colors={["#F4E8DA", "#E2F1EB"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.feedbackHeader}>
              <View style={styles.feedbackBadge}>
                <Ionicons name="restaurant-outline" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.feedbackTitle}>Votre experience s'est bien passee ?</Text>
              <Text style={styles.feedbackSubtitle}>
                Donnez votre avis sur le service du resto universitaire apres votre repas.
              </Text>
            </LinearGradient>

            <View style={styles.feedbackBody}>
              <View style={styles.feedbackSummary}>
                <Text style={styles.feedbackSummaryMeal}>
                  {feedbackReservation?.repas === "dejeuner" ? "Dejeuner" : "Diner"}
                </Text>
                <Text style={styles.feedbackSummaryMeta}>{feedbackReservation?.dateISO} - {feedbackReservation?.creneau}</Text>
              </View>

              <View style={styles.ratingBlock}>
                <Text style={styles.ratingLabel}>Service</Text>
                {renderStars(serviceRating, setServiceRating)}
              </View>

              <View style={styles.ratingBlock}>
                <Text style={styles.ratingLabel}>Qualite du repas</Text>
                {renderStars(mealRating, setMealRating)}
              </View>

              <View style={styles.ratingBlock}>
                <Text style={styles.ratingLabel}>Cadre et proprete</Text>
                {renderStars(ambianceRating, setAmbianceRating)}
              </View>

              <View style={styles.commentBlock}>
                <Text style={styles.ratingLabel}>Commentaire</Text>
                <TextInput
                  value={feedbackComment}
                  onChangeText={setFeedbackComment}
                  placeholder="Partagez un retour sur l'accueil, le service ou votre repas..."
                  placeholderTextColor="#A08E81"
                  multiline
                  style={styles.commentInput}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.feedbackActions}>
                <TouchableOpacity style={styles.feedbackLaterBtn} onPress={resetFeedbackModal} disabled={submittingFeedback}>
                  <Text style={styles.feedbackLaterText}>Plus tard</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.feedbackSubmitBtn,
                    (submittingFeedback || !serviceRating || !mealRating || !ambianceRating) && styles.feedbackSubmitBtnDisabled,
                  ]}
                  disabled={submittingFeedback || !serviceRating || !mealRating || !ambianceRating}
                  onPress={async () => {
                    try {
                      setSubmittingFeedback(true);
                      await ReservationService.submitServiceFeedback(feedbackReservation?.id, {
                        serviceRating,
                        mealRating,
                        ambianceRating,
                        comment: feedbackComment,
                      });
                      resetFeedbackModal();
                      Alert.alert("Merci", "Votre avis a bien ete envoye.");
                    } catch (error) {
                      setSubmittingFeedback(false);
                      Alert.alert("Erreur", error?.response?.data?.message || "Impossible d'envoyer votre avis.");
                    }
                  }}
                >
                  <Text style={styles.feedbackSubmitText}>{submittingFeedback ? "Envoi..." : "Envoyer mon avis"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
      <StudentBottomTabs />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  header: { height: 110, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingTop: 28, paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { padding: 6 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  summaryRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginTop: 10 },
  summaryPill: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#2e7d32", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14, backgroundColor: "#fff" },
  summaryText: { fontWeight: "800", color: "#2e7d32" },
  tabRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginTop: 12 },
  tabChip: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#e9e1d8", borderRadius: 16 },
  tabChipActive: { backgroundColor: "#fff" },
  tabText: { color: Colors.text, opacity: 0.7, fontWeight: "700" },
  tabTextActive: { opacity: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 124 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 12, elevation: 3, marginTop: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  cardIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#FFE9C9", justifyContent: "center", alignItems: "center" },
  cardTitle: { fontWeight: "800", color: Colors.text },
  cardSub: { fontSize: 12, color: Colors.text, opacity: 0.7 },
  statusPill: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  statusText: { fontWeight: "800", fontSize: 12 },
  infoBox: { backgroundColor: "#fcf9f5", borderRadius: 12, padding: 10, marginTop: 10 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  infoLabel: { color: Colors.text, opacity: 0.6 },
  infoValue: { color: Colors.text, fontWeight: "700" },
  infoValueSeats: { flex: 1, textAlign: "right", marginLeft: 12 },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  actionBtn: { paddingVertical: 10, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  qrBtn: { backgroundColor: "#8b7763", flexDirection: "row", gap: 8, paddingHorizontal: 14 },
  qrText: { color: "#fff", fontWeight: "800" },
  editBtn: { flex: 1, borderWidth: 1, borderColor: "#eadfd2" },
  editText: { color: Colors.text, fontWeight: "800" },
  cancelBtn: { width: 44, borderWidth: 1, borderColor: "#eadfd2" },
  leaveBtn: { marginTop: 10, height: 42, borderRadius: 12, borderWidth: 1, borderColor: "#E7D9CD", backgroundColor: "#F8F2EB", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  leaveText: { color: "#7A5B44", fontWeight: "800" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(30, 24, 20, 0.42)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  feedbackModalCard: {
    backgroundColor: "#FFFDFC",
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  feedbackHeader: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: "center",
  },
  feedbackBadge: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "#6DB8A0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  feedbackTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#2E2420",
    textAlign: "center",
  },
  feedbackSubtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: "#6F625B",
    textAlign: "center",
  },
  feedbackBody: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
  },
  feedbackSummary: {
    backgroundColor: "#FAF5EF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EFE1D3",
    marginBottom: 16,
  },
  feedbackSummaryMeal: {
    fontSize: 16,
    fontWeight: "900",
    color: "#3D302A",
  },
  feedbackSummaryMeta: {
    marginTop: 4,
    color: "#84756B",
    fontWeight: "600",
  },
  ratingBlock: {
    marginBottom: 14,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#483A34",
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: "row",
    gap: 8,
  },
  starButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#FAF5EF",
    borderWidth: 1,
    borderColor: "#EEDFD0",
    alignItems: "center",
    justifyContent: "center",
  },
  commentBlock: {
    marginTop: 2,
  },
  commentInput: {
    minHeight: 96,
    borderRadius: 18,
    backgroundColor: "#FAF5EF",
    borderWidth: 1,
    borderColor: "#EEDFD0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#3D302A",
    fontWeight: "600",
  },
  feedbackActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  feedbackLaterBtn: {
    flex: 1,
    height: 50,
    borderRadius: 18,
    backgroundColor: "#F5EEE7",
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackLaterText: {
    color: "#7A6B61",
    fontWeight: "800",
  },
  feedbackSubmitBtn: {
    flex: 1.25,
    height: 50,
    borderRadius: 18,
    backgroundColor: "#6DB8A0",
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackSubmitBtnDisabled: {
    opacity: 0.55,
  },
  feedbackSubmitText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
});
