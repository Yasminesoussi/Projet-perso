import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import Colors from "../../constants/Colors";
import apiClient from "../../repositories/apiClient";
import BottomTabs from "../../navigation/BottomTabs";
import PlatService from "../../services/PlatService";

function toISODate(d) {
  if (!d) return "";
  const dt = new Date(d);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatFRDate(iso) {
  if (!iso) return "—";
  const dt = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });
}

function Stars({ rating }) {
  const r = Number(rating || 0);
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i + 1 <= r;
        return (
          <Ionicons
            key={i}
            name={filled ? "star" : "star-outline"}
            size={16}
            color={filled ? "#F59E0B" : "#C7C7C7"}
          />
        );
      })}
    </View>
  );
}

export default function FeedbacksScreen() {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [reviews, setReviews] = useState([]);
  const [plats, setPlats] = useState([]);
  const [total, setTotal] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [statsByRating, setStatsByRating] = useState({});

  const [q, setQ] = useState("");
  const [rating, setRating] = useState("ALL");
  const [platId, setPlatId] = useState("ALL");

  const [useDateRange, setUseDateRange] = useState(false);
  const [dateFrom, setDateFrom] = useState(new Date());
  const [dateTo, setDateTo] = useState(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const params = useMemo(() => {
    const p = {};
    if (q.trim()) p.q = q.trim();
    if (rating !== "ALL") p.rating = rating;
    if (useDateRange) {
      p.dateFrom = toISODate(dateFrom);
      p.dateTo = toISODate(dateTo);
    }
    p.page = 1;
    p.limit = 100;
    p.sort = "-createdAt";
    return p;
  }, [q, rating, useDateRange, dateFrom, dateTo]);

  const fetchReviews = async (mode) => {
    try {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setErrorMsg("");

      const res = await apiClient.get("/admin/reviews", { params });
      const data = res.data || {};
      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      setTotal(data.total || 0);
      setAvgRating(data.avgRating || 0);
      setStatsByRating(data.statsByRating || {});
    } catch (e) {
      setErrorMsg(e?.response?.data?.message || e?.message || "Erreur chargement feedbacks");
      setReviews([]);
      setTotal(0);
      setAvgRating(0);
      setStatsByRating({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyTodayFilter = () => {
    const todayISO = toISODate(new Date());
    const active = useDateRange && toISODate(dateFrom) === todayISO && toISODate(dateTo) === todayISO;
    if (active) {
      setUseDateRange(false);
      return;
    }
    const today = new Date();
    setDateFrom(today);
    setDateTo(today);
    setUseDateRange(true);
  };

  const deleteReview = (id) => {
    Alert.alert("Supprimer", "Voulez-vous vraiment supprimer ce feedback ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await apiClient.delete(`/admin/reviews/${id}`);
            await fetchReviews("refresh");
          } catch (e) {
            setErrorMsg(e?.response?.data?.message || e?.message || "Erreur suppression");
          }
        },
      },
    ]);
  };

  useFocusEffect(
    React.useCallback(() => {
      PlatService.getAllPlats().then(setPlats).catch(() => setPlats([]));
      fetchReviews();
      return () => {};
    }, [params])
  );

  const visibleReviews =
    platId === "ALL"
      ? reviews
      : reviews.filter((item) => String(item?.plat?.id || item?.plat?._id || "") === String(platId));

  const avgText = avgRating ? avgRating.toFixed(2) : "0.00";

  const renderItem = ({ item }) => {
    const studentName = `${item.student?.firstName || ""} ${item.student?.lastName || ""}`.trim() || "Étudiant";
    const platName = item.plat?.nom || "Plat";
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => {
          setSelected(item);
          setDetailsOpen(true);
        }}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {platName}
            </Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>
              {studentName} • {formatFRDate(item.createdAt)}
            </Text>
          </View>
          <View style={styles.ratingWrap}>
            <Text style={styles.ratingText}>{item.rating}</Text>
            <Ionicons name="star" size={14} color="#F59E0B" />
          </View>
        </View>

        <View style={{ marginTop: 10 }}>
          <Stars rating={item.rating} />
        </View>

        {!!item.text ? (
          <Text style={styles.cardText} numberOfLines={2}>
            {item.text}
          </Text>
        ) : (
          <Text style={styles.cardTextMuted}>Aucun commentaire</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchReviews("refresh")} />}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Feedbacks</Text>
          <Text style={styles.headerSubtitle}>Avis étudiants sur les plats</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={() => setFiltersOpen(true)}>
          <Ionicons name="options-outline" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#6b7280" />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Rechercher (plat, étudiant, email)…"
          placeholderTextColor="#9ca3af"
          style={styles.searchInput}
          autoCapitalize="none"
        />
        {!!q && (
          <TouchableOpacity onPress={() => setQ("")} style={styles.clearBtn}>
            <Ionicons name="close" size={18} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{avgText}</Text>
          <Text style={styles.statLabel}>Note moyenne</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{total}</Text>
          <Text style={styles.statLabel}>Total feedbacks</Text>
        </View>
      </View>

      <View style={styles.ratingBars}>
        {[1, 2, 3, 4, 5].map((n) => {
          const c = statsByRating[n] || 0;
          const pct = total ? Math.round((c / total) * 100) : 0;
          return (
            <View key={n} style={styles.ratingBar}>
              <Text style={styles.ratingBarLabel}>
                {n}★
              </Text>
              <View style={styles.ratingBarTrack}>
                <View style={[styles.ratingBarFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.ratingBarCount}>{c}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => fetchReviews("refresh")}>
          <Ionicons name="refresh-outline" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>Actualiser</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={applyTodayFilter}>
          <Ionicons
            name={useDateRange && toISODate(dateFrom) === toISODate(new Date()) && toISODate(dateTo) === toISODate(new Date()) ? "apps-outline" : "today-outline"}
            size={18}
            color={Colors.text}
          />
          <Text style={styles.secondaryBtnText}>
            {useDateRange && toISODate(dateFrom) === toISODate(new Date()) && toISODate(dateTo) === toISODate(new Date()) ? "All" : "Aujourd hui"}
          </Text>
        </TouchableOpacity>
      </View>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color="#B91C1C" />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

        <View style={{ paddingHorizontal: 16 }}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#6B4EFF" />
            <Text style={styles.loadingText}>Chargement…</Text>
          </View>
        ) : visibleReviews.length ? (
          visibleReviews.map((item) => <View key={String(item.id)}>{renderItem({ item })}</View>)
        ) : (
          <View style={styles.emptyWrap}>
            <Ionicons name="chatbox-ellipses-outline" size={40} color="#9ca3af" />
            <Text style={styles.emptyTitle}>Aucun feedback</Text>
            <Text style={styles.emptySub}>Essaie d’enlever les filtres.</Text>
          </View>
        )}
        </View>
      </ScrollView>

      {/* Filters modal */}
      <Modal visible={filtersOpen} animationType="slide" transparent onRequestClose={() => setFiltersOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtres</Text>
              <TouchableOpacity onPress={() => setFiltersOpen(false)} style={styles.headerBtn}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Note</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={rating} onValueChange={(v) => setRating(v)} style={styles.picker}>
                <Picker.Item label="Toutes" value="ALL" />
                {[1, 2, 3, 4, 5].map((n) => (
                  <Picker.Item key={n} label={`${n}★`} value={String(n)} />
                ))}
              </Picker>
            </View>

            <Text style={styles.modalLabel}>Plat</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={platId} onValueChange={(v) => setPlatId(v)} style={styles.picker}>
                <Picker.Item label="Tous les plats" value="ALL" />
                {plats.map((plat) => (
                  <Picker.Item key={String(plat._id)} label={String(plat.nom || "Plat")} value={String(plat._id)} />
                ))}
              </Picker>
            </View>

            <View style={styles.rangeRow}>
              <TouchableOpacity
                style={[styles.toggle, useDateRange && styles.toggleOn]}
                onPress={() => setUseDateRange((x) => !x)}
              >
                <Ionicons
                  name={useDateRange ? "checkbox-outline" : "square-outline"}
                  size={18}
                  color={Colors.text}
                />
                <Text style={styles.toggleText}>Filtrer par période</Text>
              </TouchableOpacity>
            </View>

            {useDateRange ? (
              <View style={styles.dateRow}>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFromPicker(true)}>
                  <Ionicons name="calendar-outline" size={18} color={Colors.text} />
                  <Text style={styles.dateBtnText}>Du: {toISODate(dateFrom)}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dateBtn} onPress={() => setShowToPicker(true)}>
                  <Ionicons name="calendar-outline" size={18} color={Colors.text} />
                  <Text style={styles.dateBtnText}>Au: {toISODate(dateTo)}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {showFromPicker ? (
              <DateTimePicker
                value={dateFrom}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_, selectedDate) => {
                  setShowFromPicker(false);
                  if (selectedDate) setDateFrom(selectedDate);
                }}
              />
            ) : null}
            {showToPicker ? (
              <DateTimePicker
                value={dateTo}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_, selectedDate) => {
                  setShowToPicker(false);
                  if (selectedDate) setDateTo(selectedDate);
                }}
              />
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => {
                  setQ("");
                  setRating("ALL");
                  setPlatId("ALL");
                  setUseDateRange(false);
                  setFiltersOpen(false);
                }}
              >
                <Ionicons name="trash-outline" size={18} color={Colors.text} />
                <Text style={styles.secondaryBtnText}>Réinitialiser</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setFiltersOpen(false)}>
                <Ionicons name="checkmark-outline" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Appliquer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Details modal */}
      <Modal visible={detailsOpen} animationType="slide" transparent onRequestClose={() => setDetailsOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Détails feedback</Text>
              <TouchableOpacity onPress={() => setDetailsOpen(false)} style={styles.headerBtn}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {selected ? (
              <>
                <View style={styles.detailBlock}>
                  <Text style={styles.detailLabel}>Plat</Text>
                  <TouchableOpacity
                    onPress={() => {
                      const selectedPlatId = String(selected?.plat?.id || selected?.plat?._id || "");
                      const fullPlat = plats.find((p) => String(p._id) === selectedPlatId) || selected?.plat;
                      const platReviews = reviews.filter((r) => String(r?.plat?.id || r?.plat?._id || "") === selectedPlatId);
                      setDetailsOpen(false);
                      navigation.navigate("PlatDetail", { plat: fullPlat, reviews: platReviews });
                    }}
                  >
                    <Text style={[styles.detailValue, styles.linkText]}>{selected.plat?.nom || "—"}</Text>
                  </TouchableOpacity>
                  <View style={{ marginTop: 10 }}>
                    <Stars rating={selected.rating} />
                  </View>
                  <Text style={styles.detailSub}>
                    {formatFRDate(selected.createdAt)} • {selected.rating}★
                  </Text>
                </View>

                <View style={styles.detailBlock}>
                  <Text style={styles.detailLabel}>Étudiant</Text>
                  <Text style={styles.detailValue}>
                    {`${selected.student?.firstName || ""} ${selected.student?.lastName || ""}`.trim() || "—"}
                  </Text>
                  <Text style={styles.detailSub}>
                    {selected.student?.studentNumber ? `#${selected.student.studentNumber}` : "—"} •{" "}
                    {selected.student?.email || "—"}
                  </Text>
                </View>

                <View style={styles.detailBlock}>
                  <Text style={styles.detailLabel}>Commentaire</Text>
                  <Text style={styles.detailText}>{selected.text || "—"}</Text>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => deleteReview(selected.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color={Colors.text} />
                    <Text style={styles.secondaryBtnText}>Supprimer</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => setDetailsOpen(false)}
                  >
                    <Ionicons name="checkmark-outline" size={18} color="#fff" />
                    <Text style={styles.primaryBtnText}>OK</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <BottomTabs />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary, paddingTop: 14 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerTitle: { fontSize: 20, fontWeight: "900", color: Colors.text },
  headerSubtitle: { fontSize: 12, color: Colors.text, opacity: 0.7, marginTop: 2 },

  searchWrap: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: 14 },
  clearBtn: { padding: 6 },

  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginTop: 12 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statNum: { fontSize: 18, fontWeight: "900", color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.text, opacity: 0.7, marginTop: 2 },

  actionsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginTop: 10 },
  primaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#6B4EFF",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800" },
  secondaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.card,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryBtnText: { color: Colors.text, fontWeight: "800" },

  errorBox: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: "#FDE8E8",
    borderColor: "#FCA5A5",
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: { color: "#7F1D1D", fontWeight: "700", flex: 1 },

  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, color: Colors.text, opacity: 0.75, fontWeight: "700" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: "900", color: Colors.text },
  cardSubtitle: { fontSize: 12, color: Colors.text, opacity: 0.7, marginTop: 2 },
  cardText: { marginTop: 10, fontSize: 13, color: Colors.text, opacity: 0.85, fontWeight: "700" },
  cardTextMuted: { marginTop: 10, fontSize: 13, color: Colors.text, opacity: 0.45, fontWeight: "700" },

  ratingWrap: { flexDirection: "row", alignItems: "center", gap: 4, padding: 10, borderRadius: 14, backgroundColor: "#FFF7E6", borderWidth: 1, borderColor: "#FDE68A" },
  ratingText: { fontSize: 14, fontWeight: "900", color: Colors.text },

  emptyWrap: { padding: 40, alignItems: "center" },
  emptyTitle: { marginTop: 10, fontSize: 16, fontWeight: "900", color: Colors.text },
  emptySub: { marginTop: 4, fontSize: 12, color: Colors.text, opacity: 0.7 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 16,
    borderTopWidth: 1,
    borderColor: Colors.border,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: "900", color: Colors.text },
  modalLabel: { marginTop: 10, marginBottom: 6, fontWeight: "800", color: Colors.text, opacity: 0.85 },

  pickerWrap: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  picker: { height: 48, color: Colors.text },

  rangeRow: { marginTop: 12 },
  toggle: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  toggleOn: { backgroundColor: "#fff" },
  toggleText: { fontWeight: "800", color: Colors.text },

  dateRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  dateBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dateBtnText: { color: Colors.text, fontWeight: "800", fontSize: 12 },

  modalActions: { flexDirection: "row", gap: 10, marginTop: 14 },

  detailBlock: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  detailLabel: { fontSize: 12, fontWeight: "800", color: Colors.text, opacity: 0.75 },
  detailValue: { fontSize: 16, fontWeight: "900", color: Colors.text, marginTop: 4 },
  linkText: { textDecorationLine: "underline" },
  detailSub: { marginTop: 2, color: Colors.text, opacity: 0.7, fontWeight: "700" },
  detailText: { marginTop: 8, fontSize: 13, color: Colors.text, opacity: 0.85, fontWeight: "700" },

  ratingBars: { marginTop: 10, paddingHorizontal: 16 },
  ratingBar: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  ratingBarLabel: { width: 46, fontWeight: "900", color: Colors.text, opacity: 0.8 },
  ratingBarTrack: { flex: 1, height: 10, backgroundColor: Colors.card, borderRadius: 999, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  ratingBarFill: { height: 10, backgroundColor: "#6B4EFF", borderRadius: 999 },
  ratingBarCount: { width: 28, textAlign: "right", fontWeight: "900", color: Colors.text, opacity: 0.85 },
});


