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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Colors from "../../constants/Colors";
import apiClient from "../../repositories/apiClient";
import BottomTabs from "../../navigation/BottomTabs";

function formatDateLabel(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMealLabel(value) {
  switch (value) {
    case "dejeuner":
      return "Dejeuner";
    case "diner":
      return "Diner";
    case "libre":
      return "Libre";
    default:
      return value || "--";
  }
}

function formatTypeLabel(value) {
  switch (value) {
    case "surPlace":
      return "Sur place";
    case "aEmporter":
      return "A emporter";
    default:
      return value || "--";
  }
}

function formatStatusLabel(value) {
  switch (value) {
    case "ACTIVE":
      return "Active";
    case "CONSUMED":
      return "Consommee";
    case "CANCELLED":
      return "Annulee";
    case "EXPIRED":
      return "Expiree";
    default:
      return value || "--";
  }
}

function ratingTone(value) {
  if (value >= 4) return { bg: "#E7F7EE", fg: "#137A4B" };
  if (value >= 3) return { bg: "#FFF4DE", fg: "#A05A00" };
  return { bg: "#FDECEC", fg: "#A61B1B" };
}

function Stars({ value }) {
  return (
    <View style={styles.starsRow}>
      {Array.from({ length: 5 }).map((_, index) => {
        const filled = index + 1 <= Number(value || 0);
        return (
          <Ionicons
            key={`${value}-${index}`}
            name={filled ? "star" : "star-outline"}
            size={14}
            color={filled ? "#F4A300" : "#D4C5B8"}
          />
        );
      })}
    </View>
  );
}

function MetricCard({ label, value, icon }) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIcon}>
        <Ionicons name={icon} size={18} color="#6F4E37" />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export default function ReservationFeedbacksScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [search, setSearch] = useState("");
  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats] = useState({ total: 0, averages: { service: 0, meal: 0, ambiance: 0 } });

  const params = useMemo(() => {
    const next = { limit: 100, sort: "-createdAt" };
    if (search.trim()) next.q = search.trim();
    return next;
  }, [search]);

  const fetchFeedbacks = async (mode) => {
    try {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setErrorMsg("");

      const res = await apiClient.get("/admin/reservation-feedbacks", { params });
      const data = res.data || {};
      setFeedbacks(Array.isArray(data.feedbacks) ? data.feedbacks : []);
      setStats({
        total: data.total || 0,
        averages: {
          service: Number(data?.averages?.service || 0),
          meal: Number(data?.averages?.meal || 0),
          ambiance: Number(data?.averages?.ambiance || 0),
        },
      });
    } catch (error) {
      setErrorMsg(error?.response?.data?.message || error?.message || "Erreur chargement des avis");
      setFeedbacks([]);
      setStats({ total: 0, averages: { service: 0, meal: 0, ambiance: 0 } });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchFeedbacks();
      return () => {};
    }, [params])
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchFeedbacks("refresh")} />}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color="#2F241E" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.navigate("PlusMenu")}>
              <Ionicons name="grid-outline" size={20} color="#2F241E" />
            </TouchableOpacity>
          </View>

          <View style={styles.heroBadge}>
            <Ionicons name="chatbubbles-outline" size={18} color="#7B4B2A" />
            <Text style={styles.heroBadgeText}>{stats.total} Avis etudiants</Text>
          </View>

          <Text style={styles.heroTitle}>Avis etudiants sur reservations</Text>
          <Text style={styles.heroSubtitle}>
            Une consultation simple et premium des retours lies aux reservations, avec les infos utiles en cards.
          </Text>
        </View>

        <View style={styles.searchCard}>
          <Ionicons name="search-outline" size={18} color="#8D7766" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher par etudiant, email, date, repas..."
            placeholderTextColor="#A69182"
            style={styles.searchInput}
            autoCapitalize="none"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color="#8D7766" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard label="Service" value={stats.averages.service.toFixed(1)} icon="sparkles-outline" />
          <MetricCard label="Repas" value={stats.averages.meal.toFixed(1)} icon="restaurant-outline" />
          <MetricCard label="Ambiance" value={stats.averages.ambiance.toFixed(1)} icon="cafe-outline" />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Derniers avis reservation</Text>
          <TouchableOpacity style={styles.refreshAction} onPress={() => fetchFeedbacks("refresh")}>
            <Ionicons name="refresh-outline" size={16} color="#6F4E37" />
            <Text style={styles.refreshActionText}>Actualiser</Text>
          </TouchableOpacity>
        </View>

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color="#A61B1B" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#B97A56" />
            <Text style={styles.loadingText}>Chargement des avis...</Text>
          </View>
        ) : feedbacks.length ? (
          feedbacks.map((item) => {
            const studentName =
              `${item?.student?.firstName || ""} ${item?.student?.lastName || ""}`.trim() || "Etudiant";
            const tone = ratingTone(item?.serviceRating || 0);

            return (
              <View key={String(item.id)} style={styles.feedbackCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.avatarWrap}>
                    <Text style={styles.avatarText}>{studentName.slice(0, 2).toUpperCase()}</Text>
                  </View>

                  <View style={styles.cardHeaderBody}>
                    <Text style={styles.studentName}>{studentName}</Text>
                    <Text style={styles.studentMeta}>
                      {item?.student?.studentNumber ? `#${item.student.studentNumber}` : "--"} • {item?.student?.email || "--"}
                    </Text>
                  </View>

                  <View style={[styles.serviceBadge, { backgroundColor: tone.bg }]}>
                    <Text style={[styles.serviceBadgeText, { color: tone.fg }]}>
                      Service {Number(item?.serviceRating || 0).toFixed(1)}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoGrid}>
                  <View style={styles.infoPill}>
                    <Ionicons name="calendar-outline" size={14} color="#6F4E37" />
                    <Text style={styles.infoText}>{formatDateLabel(item?.reservation?.dateISO)}</Text>
                  </View>
                  <View style={styles.infoPill}>
                    <Ionicons name="time-outline" size={14} color="#6F4E37" />
                    <Text style={styles.infoText}>{item?.reservation?.creneau || "--"}</Text>
                  </View>
                  <View style={styles.infoPill}>
                    <Ionicons name="restaurant-outline" size={14} color="#6F4E37" />
                    <Text style={styles.infoText}>{formatMealLabel(item?.reservation?.repas)}</Text>
                  </View>
                  <View style={styles.infoPill}>
                    <Ionicons name="bag-handle-outline" size={14} color="#6F4E37" />
                    <Text style={styles.infoText}>{formatTypeLabel(item?.reservation?.typeRepas)}</Text>
                  </View>
                </View>

                <View style={styles.statusRow}>
                  <View style={styles.statusChip}>
                    <Ionicons name="checkmark-circle-outline" size={14} color="#6F4E37" />
                    <Text style={styles.statusChipText}>{formatStatusLabel(item?.reservation?.status)}</Text>
                  </View>
                  <Text style={styles.createdAtText}>{formatDateLabel(item?.createdAt)}</Text>
                </View>

                <View style={styles.ratingsPanel}>
                  <View style={styles.ratingItem}>
                    <Text style={styles.ratingLabel}>Service</Text>
                    <Stars value={item?.serviceRating} />
                  </View>
                  <View style={styles.ratingItem}>
                    <Text style={styles.ratingLabel}>Repas</Text>
                    <Stars value={item?.mealRating} />
                  </View>
                  <View style={styles.ratingItem}>
                    <Text style={styles.ratingLabel}>Ambiance</Text>
                    <Stars value={item?.ambianceRating} />
                  </View>
                </View>

                <View style={styles.commentBox}>
                  <Text style={styles.commentLabel}>Commentaire</Text>
                  <Text style={styles.commentText}>
                    {item?.comment?.trim() ? item.comment : "Aucun commentaire laisse par l etudiant."}
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="chatbox-ellipses-outline" size={42} color="#B7A497" />
            <Text style={styles.emptyTitle}>Aucun avis reservation</Text>
            <Text style={styles.emptySubtitle}>Les cards apparaitront ici des que les etudiants laissent un avis.</Text>
          </View>
        )}
      </ScrollView>

      <BottomTabs />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },
  heroCard: {
    backgroundColor: "#FFF8F2",
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E9D8CA",
    marginBottom: 16,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#F2E5D9",
    justifyContent: "center",
    alignItems: "center",
  },
  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FCE9D8",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  heroBadgeText: {
    color: "#7B4B2A",
    fontSize: 12,
    fontWeight: "800",
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#2F241E",
  },
  heroSubtitle: {
    marginTop: 8,
    color: "#7B6759",
    lineHeight: 21,
    fontSize: 14,
  },
  searchCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E9D8CA",
    paddingHorizontal: 14,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: "#2F241E",
    fontSize: 14,
    fontWeight: "600",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  metricCard: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: "#FFFDFB",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E9D8CA",
    padding: 14,
  },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#F5E7DA",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#2F241E",
  },
  metricLabel: {
    marginTop: 4,
    fontSize: 12,
    color: "#8A7465",
    fontWeight: "700",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#2F241E",
  },
  refreshAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F5E7DA",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  refreshActionText: {
    color: "#6F4E37",
    fontWeight: "800",
    fontSize: 12,
  },
  errorBox: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: "#FDECEC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3CACA",
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    color: "#A61B1B",
    fontWeight: "700",
  },
  loadingWrap: {
    paddingVertical: 50,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#7B6759",
    fontWeight: "700",
  },
  feedbackCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E9D8CA",
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrap: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: "#F5E7DA",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#6F4E37",
    fontWeight: "900",
    fontSize: 16,
  },
  cardHeaderBody: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#2F241E",
  },
  studentMeta: {
    marginTop: 3,
    color: "#8B7667",
    fontSize: 12,
    fontWeight: "600",
  },
  serviceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  serviceBadgeText: {
    fontSize: 12,
    fontWeight: "900",
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  infoPill: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF8F2",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEDFD2",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  infoText: {
    flex: 1,
    color: "#5E4A3D",
    fontSize: 12,
    fontWeight: "700",
  },
  statusRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F5E7DA",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusChipText: {
    color: "#6F4E37",
    fontSize: 12,
    fontWeight: "800",
  },
  createdAtText: {
    color: "#8B7667",
    fontSize: 12,
    fontWeight: "600",
  },
  ratingsPanel: {
    marginTop: 14,
    backgroundColor: "#FFF8F2",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EEDFD2",
    padding: 12,
    gap: 10,
  },
  ratingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ratingLabel: {
    color: "#5E4A3D",
    fontWeight: "800",
  },
  starsRow: {
    flexDirection: "row",
    gap: 4,
  },
  commentBox: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EEDFD2",
    padding: 12,
  },
  commentLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#8B7667",
    marginBottom: 6,
  },
  commentText: {
    color: "#3E3028",
    lineHeight: 20,
    fontSize: 14,
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: "#FFF8F2",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E9D8CA",
    paddingVertical: 42,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "900",
    color: "#2F241E",
  },
  emptySubtitle: {
    marginTop: 6,
    color: "#8B7667",
    textAlign: "center",
    lineHeight: 20,
  },
});
