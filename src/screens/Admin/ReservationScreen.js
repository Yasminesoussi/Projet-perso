
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import Colors from "../../constants/Colors";
import apiClient from "../../repositories/apiClient";
import BottomTabs from "../../navigation/BottomTabs";

const STATUS_OPTIONS = ["ALL", "ACTIVE", "CONSUMED", "CANCELLED", "EXPIRED"];
const REPAS_OPTIONS = ["ALL", "dejeuner", "diner", "libre"];
const TYPE_OPTIONS = ["ALL", "surPlace", "aEmporter"];

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
  const [y, m, d] = String(iso).split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" });
}

function formatStatus(status) {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "CONSUMED":
      return "Consommee";
    case "CANCELLED":
      return "Annulee";
    case "EXPIRED":
      return "Expiree";
    case "ALL":
      return "Tous";
    default:
      return status || "--";
  }
}

function formatMeal(repas) {
  switch (repas) {
    case "dejeuner":
      return "Dejeuner";
    case "diner":
      return "Diner";
    case "libre":
      return "Libre";
    case "ALL":
      return "Tous";
    default:
      return repas || "--";
  }
}

function formatType(typeRepas) {
  switch (typeRepas) {
    case "surPlace":
      return "Sur place";
    case "aEmporter":
      return "A emporter";
    case "ALL":
      return "Tous";
    default:
      return typeRepas || "--";
  }
}

function chipColor(status) {
  switch (status) {
    case "ACTIVE":
      return { bg: "#E7F7EE", fg: "#0F7A43" };
    case "CONSUMED":
      return { bg: "#E7F1FF", fg: "#1D4ED8" };
    case "CANCELLED":
      return { bg: "#FDE8E8", fg: "#B91C1C" };
    case "EXPIRED":
      return { bg: "#F3F4F6", fg: "#374151" };
    default:
      return { bg: Colors.card, fg: Colors.text };
  }
}

export default function ReservationScreen() {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [reservations, setReservations] = useState([]);
  const [stats, setStats] = useState({});

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [repas, setRepas] = useState("ALL");
  const [typeRepas, setTypeRepas] = useState("ALL");

  const [dateFrom, setDateFrom] = useState(new Date());
  const [dateTo, setDateTo] = useState(new Date());
  const [useDateRange, setUseDateRange] = useState(false);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const [selected, setSelected] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const params = useMemo(() => {
    const p = {};
    if (q.trim()) p.q = q.trim();
    if (status !== "ALL") p.status = status;
    if (repas !== "ALL") p.repas = repas;
    if (typeRepas !== "ALL") p.typeRepas = typeRepas;
    if (useDateRange) {
      p.dateFrom = toISODate(dateFrom);
      p.dateTo = toISODate(dateTo);
    }
    p.limit = 100;
    p.sort = "-createdAt";
    return p;
  }, [q, status, repas, typeRepas, useDateRange, dateFrom, dateTo]);

  const fetchReservations = async (mode) => {
    try {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setErrorMsg("");

      const res = await apiClient.get("/admin/reservations", { params });
      setReservations(Array.isArray(res.data.reservations) ? res.data.reservations : []);
      setStats(res.data.stats || {});
    } catch (e) {
      setErrorMsg(e?.response?.data?.message || e?.message || "Erreur chargement réservations");
      setReservations([]);
      setStats({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateStatus = async (id, nextStatus) => {
    try {
      await apiClient.put(`/admin/reservations/${id}/status`, { status: nextStatus });
      await fetchReservations("refresh");
    } catch (e) {
      setErrorMsg(e?.response?.data?.message || e?.message || "Erreur mise à jour statut");
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

  useFocusEffect(
    React.useCallback(() => {
      fetchReservations();
      return () => {};
    }, [params])
  );

  const total = reservations.length;
  const activeCount = stats.ACTIVE || 0;
  const expiredCount = stats.EXPIRED || 0;
  const consumedCount = stats.CONSUMED || 0;
  const cancelledCount = stats.CANCELLED || 0;
  const filtersApplied = [
    status !== "ALL" ? formatStatus(status) : null,
    repas !== "ALL" ? formatMeal(repas) : null,
    typeRepas !== "ALL" ? formatType(typeRepas) : null,
    useDateRange ? `${toISODate(dateFrom)} -> ${toISODate(dateTo)}` : null,
  ].filter(Boolean);
  const isTodayFilterActive = useDateRange && toISODate(dateFrom) === toISODate(new Date()) && toISODate(dateTo) === toISODate(new Date());

  const renderItem = ({ item }) => {
    const s = item.student || {};
    const name = `${s.firstName || ""} ${s.lastName || ""}`.trim() || "Étudiant";
    const badge = chipColor(item.status);
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
              {name}
            </Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>
              {s.studentNumber ? `#${s.studentNumber}` : "—"} • {s.email || "—"}
            </Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusChipText, { color: badge.fg }]}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.cardRow}>
          <View style={styles.pill}>
            <Ionicons name="calendar-outline" size={14} color={Colors.text} />
            <Text style={styles.pillText}>{formatFRDate(item.dateISO)}</Text>
          </View>
          <View style={styles.pill}>
            <Ionicons name="restaurant-outline" size={14} color={Colors.text} />
            <Text style={styles.pillText}>{String(item.repas || "—").toUpperCase()}</Text>
          </View>
          <View style={styles.pill}>
            <Ionicons name="time-outline" size={14} color={Colors.text} />
            <Text style={styles.pillText} numberOfLines={1}>
              {item.creneau || "—"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchReservations("refresh")} />}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#5f4a43" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Réservations</Text>
          <Text style={styles.headerSubtitle}>Tout voir, filtrer, agir</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={() => setFiltersOpen(true)}>
          <Ionicons name="options-outline" size={22} color="#5f4a43" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color="#6b7280" />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Rechercher (nom, email, matricule)…"
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
          <Text style={styles.statNum}>{total}</Text>
          <Text style={styles.statLabel}>Affichées</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{activeCount}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{expiredCount}</Text>
          <Text style={styles.statLabel}>Expirée</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{consumedCount}</Text>
          <Text style={styles.statLabel}>Consommée</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{cancelledCount}</Text>
          <Text style={styles.statLabel}>Annulée</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => fetchReservations("refresh")}>
          <Ionicons name="refresh-outline" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>Actualiser</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={applyTodayFilter}>
          <Ionicons name={isTodayFilterActive ? "apps-outline" : "today-outline"} size={18} color={Colors.text} />
          <Text style={styles.secondaryBtnText}>{isTodayFilterActive ? "All" : "Aujourd hui"}</Text>
        </TouchableOpacity>
      </View>

      {filtersApplied.length ? (
        <View style={styles.filterChipsRow}>
          {filtersApplied.map((item) => (
            <View key={item} style={styles.filterChip}>
              <Text style={styles.filterChipText}>{item}</Text>
            </View>
          ))}
        </View>
      ) : null}

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
        ) : reservations.length ? (
          reservations.map((item) => <View key={item._id}>{renderItem({ item })}</View>)
        ) : (
          <View style={styles.emptyWrap}>
            <Ionicons name="calendar-clear-outline" size={40} color="#9ca3af" />
            <Text style={styles.emptyTitle}>Aucune réservation</Text>
            <Text style={styles.emptySub}>Essaie d’élargir les filtres.</Text>
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

            <Text style={styles.modalLabel}>Status</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={status} onValueChange={(v) => setStatus(v)} style={styles.picker}>
                {STATUS_OPTIONS.map((s) => (
                  <Picker.Item key={s} label={formatStatus(s)} value={s} />
                ))}
              </Picker>
            </View>

            <Text style={styles.modalLabel}>Repas</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={repas} onValueChange={(v) => setRepas(v)} style={styles.picker}>
                {REPAS_OPTIONS.map((s) => (
                  <Picker.Item key={s} label={formatMeal(s)} value={s} />
                ))}
              </Picker>
            </View>

            <Text style={styles.modalLabel}>Type</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={typeRepas} onValueChange={(v) => setTypeRepas(v)} style={styles.picker}>
                {TYPE_OPTIONS.map((s) => (
                  <Picker.Item key={s} label={formatType(s)} value={s} />
                ))}
              </Picker>
            </View>

            <View style={styles.rangeRow}>
              <TouchableOpacity
                style={[styles.toggle, useDateRange && styles.toggleOn]}
                onPress={() => setUseDateRange((x) => !x)}
              >
                <Ionicons name={useDateRange ? "checkbox-outline" : "square-outline"} size={18} color={Colors.text} />
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
                  setStatus("ALL");
                  setRepas("ALL");
                  setTypeRepas("ALL");
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
              <Text style={styles.modalTitle}>Détails réservation</Text>
              <TouchableOpacity onPress={() => setDetailsOpen(false)} style={styles.headerBtn}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {selected ? (
              <>
                <View style={styles.detailBlock}>
                  <Text style={styles.detailLabel}>Étudiant</Text>
                  <Text style={styles.detailValue}>
                    {`${selected.student?.firstName || ""} ${selected.student?.lastName || ""}`.trim() || "—"}
                  </Text>
                  <Text style={styles.detailSub}>
                    {selected.student?.studentNumber ? `#${selected.student.studentNumber}` : "—"} • {selected.student?.email || "—"}
                  </Text>
                </View>

                <View style={styles.detailGrid}>
                  <View style={styles.detailCell}>
                    <Text style={styles.detailLabel}>Date</Text>
                    <Text style={styles.detailValue}>{selected.dateISO || "—"}</Text>
                  </View>
                  <View style={styles.detailCell}>
                    <Text style={styles.detailLabel}>Repas</Text>
                    <Text style={styles.detailValue}>{selected.repas || "—"}</Text>
                  </View>
                  <View style={styles.detailCell}>
                    <Text style={styles.detailLabel}>Créneau</Text>
                    <Text style={styles.detailValue}>{selected.creneau || "—"}</Text>
                  </View>
                  <View style={styles.detailCell}>
                    <Text style={styles.detailLabel}>Type</Text>
                    <Text style={styles.detailValue}>{selected.typeRepas || "—"}</Text>
                  </View>
                </View>

                {selected.status === "ACTIVE" ? (
                  <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => updateStatus(selected._id, "CANCELLED")}
                    >
                    <Ionicons name="close-circle-outline" size={18} color={Colors.text} />
                    <Text style={styles.secondaryBtnText}>Marquer annulee</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => updateStatus(selected._id, "CONSUMED")}
                  >
                    <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
                    <Text style={styles.primaryBtnText}>Marquer consommee</Text>
                  </TouchableOpacity>
                  </View>
                ) : null}
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
  container: { flex: 1, backgroundColor: "#fcf6f1", paddingTop: 0 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 10,
    backgroundColor: "#dcc8bb",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.55)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
  },
  headerTitle: { fontSize: 26, fontWeight: "900", color: "#5f4a43" },
  headerSubtitle: { fontSize: 13, color: "#7d6860", marginTop: 4, lineHeight: 18 },

  searchWrap: {
    marginHorizontal: 18,
    marginTop: -18,
    backgroundColor: "#fffdfb",
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 54,
    borderWidth: 1,
    borderColor: "#eee0d7",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#b69a89",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: 14, fontWeight: "600" },
  clearBtn: { padding: 6 },

  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 18,
    marginTop: 16,
  },
  statCard: {
    width: "31%",
    backgroundColor: "#fffaf7",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee0d7",
  },
  statNum: { fontSize: 22, fontWeight: "900", color: "#5e4b43" },
  statLabel: { fontSize: 11, color: "#9b887f", marginTop: 4, fontWeight: "700" },

  actionsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
    marginTop: 12,
  },
  filterChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 18,
    marginTop: 10,
  },
  filterChip: {
    backgroundColor: "#f3e9e2",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterChipText: { color: "#816b62", fontSize: 12, fontWeight: "700" },
  primaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#cdb3a4",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800" },
  secondaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#fffaf7",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: "#eee0d7",
  },
  secondaryBtnText: { color: Colors.text, fontWeight: "800" },

  errorBox: {
    marginHorizontal: 18,
    marginTop: 12,
    backgroundColor: "#fff1f1",
    borderColor: "#f2d5d7",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: { color: "#7F1D1D", fontWeight: "700", flex: 1 },

  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 40 },
  loadingText: { marginTop: 10, color: Colors.text, opacity: 0.75, fontWeight: "700" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eee0d7",
    marginBottom: 12,
    shadowColor: "#b69a89",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "space-between" },
  cardIdentity: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontWeight: "900" },
  cardTitle: { fontSize: 17, fontWeight: "900", color: "#5d4942" },
  cardSubtitle: { fontSize: 12, color: "#9a877f", marginTop: 3, fontWeight: "700" },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  statusDot: { width: 7, height: 7, borderRadius: 8 },
  statusChipText: { fontSize: 11, fontWeight: "900" },
  emailRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fdf9f6",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  emailText: { flex: 1, color: "#8d7b72", fontSize: 13, fontWeight: "600" },
  cardRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  infoPill: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#fffaf7",
    borderWidth: 1,
    borderColor: "#eee0d7",
  },
  infoPillWide: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#fffaf7",
    borderWidth: 1,
    borderColor: "#eee0d7",
  },
  pill: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#fffaf7",
    borderWidth: 1,
    borderColor: "#eee0d7",
  },
  pillText: { color: Colors.text, fontWeight: "700", fontSize: 12, flexShrink: 1 },
  cardFooter: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: { color: "#a08a81", fontSize: 12, fontWeight: "700" },

  emptyWrap: {
    padding: 40,
    alignItems: "center",
    marginTop: 20,
    backgroundColor: "#fffaf7",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#eee0d7",
  },
  emptyTitle: { marginTop: 12, fontSize: 18, fontWeight: "900", color: Colors.text },
  emptySub: { marginTop: 6, fontSize: 12, color: Colors.text, opacity: 0.7, textAlign: "center" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(44,30,20,0.35)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: "#fcf6f1",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
    borderTopWidth: 1,
    borderColor: "#eee0d7",
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  modalTitle: { fontSize: 20, fontWeight: "900", color: Colors.text },
  modalLabel: { marginTop: 10, marginBottom: 6, fontWeight: "800", color: Colors.text, opacity: 0.85 },
  pickerWrap: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eee0d7",
    overflow: "hidden",
  },
  picker: { height: 48, color: Colors.text },
  rangeRow: { marginTop: 12 },
  toggle: {
    backgroundColor: "#fffaf7",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#eee0d7",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  toggleOn: { backgroundColor: "#fff" },
  toggleText: { fontWeight: "800", color: Colors.text },
  dateRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  dateBtn: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee0d7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dateBtnText: { color: Colors.text, fontWeight: "800" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 14 },

  detailBlock: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eee0d7",
  },
  detailLabel: { fontSize: 12, fontWeight: "800", color: Colors.text, opacity: 0.75 },
  detailValue: { fontSize: 16, fontWeight: "900", color: Colors.text, marginTop: 4 },
  detailSub: { marginTop: 2, color: Colors.text, opacity: 0.7, fontWeight: "700" },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  detailCell: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#eadccc",
  },
});


