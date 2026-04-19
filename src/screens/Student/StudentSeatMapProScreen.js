import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useNavigation, useRoute } from "@react-navigation/native";
import Colors from "../../constants/Colors";
import ReservationService from "../../services/ReservationService";

const PEOPLE_OPTIONS = [1, 2, 3, 4];
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const TABLE_LAYOUT = [
  { id: "T1", label: "Table 1", x: 18, y: 18, width: 120, height: 62, seatCount: 6 },
  { id: "T2", label: "Table 2", x: 166, y: 18, width: 120, height: 62, seatCount: 6 },
  { id: "T3", label: "Table 3", x: 18, y: 160, width: 120, height: 62, seatCount: 6 },
  { id: "T4", label: "Table 4", x: 166, y: 160, width: 120, height: 62, seatCount: 6 },
  { id: "T5", label: "Table 5", x: 18, y: 302, width: 120, height: 62, seatCount: 6 },
  { id: "T7", label: "Table 7", x: 166, y: 302, width: 120, height: 68, seatCount: 6 },
  { id: "T8", label: "Table 8", x: 18, y: 458, width: 120, height: 68, seatCount: 6 },
  { id: "T9", label: "Table 9", x: 166, y: 458, width: 120, height: 68, seatCount: 6 },
  { id: "T10", label: "Table 10", x: 18, y: 614, width: 120, height: 68, seatCount: 6 },
  { id: "T15", label: "Table 15", x: 166, y: 614, width: 120, height: 68, seatCount: 8 },
  { id: "T12", label: "Table 12", x: 92, y: 782, width: 130, height: 74, seatCount: 6 },
  { id: "T17", label: "Table 17", x: 92, y: 938, width: 130, height: 74, seatCount: 8 },
];

function showToast(message) {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    alert(message);
  }
}

function buildDefaultSeats(seatCount) {
  return Array.from({ length: seatCount }, () => "available");
}

function mergeTablesWithStatuses(layoutTables, apiTables) {
  const apiMap = new Map((apiTables || []).map((table) => [table.id, table]));

  return layoutTables.map((table) => {
    const apiTable = apiMap.get(table.id);
    const seats =
      apiTable?.seats?.length
        ? apiTable.seats.map((seat) => seat.status || "available")
        : buildDefaultSeats(table.seatCount);

    return { ...table, seats };
  });
}

function buildSeatObjects(table) {
  return table.seats.map((status, index) => ({
    id: `${table.id}-S${index + 1}`,
    label: `${table.id.replace("T", "")}-${index + 1}`,
    tableId: table.id,
    tableLabel: table.label,
    status,
  }));
}

function getStatusStyle(status, selected) {
  if (selected) return { fill: "#C5A07E", border: "#8B6244", text: "#533726" };
  if (status === "reserved") return { fill: "#E35D5D", border: "#C94848", text: "#ffffff" };
  if (status === "occupied") return { fill: "#4D86D9", border: "#356CC0", text: "#ffffff" };
  return { fill: "#1DB96B", border: "#149557", text: "#ffffff" };
}

function SeatPill({ seat, selected, onPress }) {
  const colors = getStatusStyle(seat.status, selected);

  return (
    <TouchableOpacity
      activeOpacity={seat.status === "available" || selected ? 0.85 : 1}
      onPress={() => onPress(seat)}
      style={[styles.seatPill, { backgroundColor: colors.fill, borderColor: colors.border }]}
    >
      <Text style={[styles.seatPillText, { color: colors.text }]}>{selected ? "OK" : ""}</Text>
    </TouchableOpacity>
  );
}

function TableBlock({ table, selectedSeats, onSeatPress }) {
  const seats = buildSeatObjects(table);
  const splitIndex = Math.ceil(seats.length / 2);
  const topSeats = seats.slice(0, splitIndex);
  const bottomSeats = seats.slice(splitIndex);

  return (
    <View style={[styles.tableWrap, { left: table.x, top: table.y, width: table.width, minHeight: table.height + 44 }]}>
      <View style={styles.seatRow}>
        {topSeats.map((seat) => (
          <SeatPill
            key={seat.id}
            seat={seat}
            selected={selectedSeats.some((item) => item.id === seat.id)}
            onPress={onSeatPress}
          />
        ))}
      </View>

      <View style={[styles.tableCard, { height: table.height }]}>
        <Text style={styles.tableLabel}>{table.label}</Text>
        <View style={styles.tableBadge}>
          <Ionicons name="person-outline" size={11} color="#fff" />
        </View>
      </View>

      <View style={styles.seatRow}>
        {bottomSeats.map((seat) => (
          <SeatPill
            key={seat.id}
            seat={seat}
            selected={selectedSeats.some((item) => item.id === seat.id)}
            onPress={onSeatPress}
          />
        ))}
      </View>
    </View>
  );
}

export default function StudentSeatMapProScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const reservationDraft = route.params?.reservationDraft || {};
  const editing = route.params?.editing || false;
  const editingReservation = route.params?.editingReservation;

  const [groupSize, setGroupSize] = useState(route.params?.groupSize || editingReservation?.groupSize || 1);
  const [selectedSeats, setSelectedSeats] = useState(route.params?.selectedSeats || editingReservation?.selectedSeats || []);
  const [submitting, setSubmitting] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const [loadingMap, setLoadingMap] = useState(false);
  const [seatMapTables, setSeatMapTables] = useState(() => mergeTablesWithStatuses(TABLE_LAYOUT));

  const slotDateISO = reservationDraft.dateISO || editingReservation?.dateISO;
  const slotRepas = reservationDraft.repas || editingReservation?.repas;
  const slotCreneau = reservationDraft.creneau || editingReservation?.creneau;

  useEffect(() => {
    let active = true;

    const loadSeatMap = async () => {
      if (!slotDateISO || !slotRepas || !slotCreneau) return;

      try {
        setLoadingMap(true);
        const res = await ReservationService.getSeatMap({
          dateISO: slotDateISO,
          repas: slotRepas,
          creneau: slotCreneau,
        });

        if (active) {
          setSeatMapTables(mergeTablesWithStatuses(TABLE_LAYOUT, res?.tables));
        }
      } catch {
        if (active) {
          setSeatMapTables(mergeTablesWithStatuses(TABLE_LAYOUT));
        }
      } finally {
        if (active) setLoadingMap(false);
      }
    };

    loadSeatMap();

    return () => {
      active = false;
    };
  }, [slotDateISO, slotRepas, slotCreneau, mapVisible]);

  const allSeats = useMemo(
    () => seatMapTables.flatMap((table) => buildSeatObjects(table)),
    [seatMapTables]
  );
  const availableCount = allSeats.filter((seat) => seat.status === "available").length;
  const selectedSeatLabels = selectedSeats.map((seat) => seat.label).join(", ");
  const canConfirm = selectedSeats.length === groupSize && !submitting;

  const toggleSeat = (seat) => {
    const exists = selectedSeats.some((item) => item.id === seat.id);
    if (exists) {
      setSelectedSeats((prev) => prev.filter((item) => item.id !== seat.id));
      return;
    }

    if (seat.status !== "available") return;

    if (selectedSeats.length >= groupSize) {
      showToast(`Vous pouvez choisir seulement ${groupSize} place${groupSize > 1 ? "s" : ""}.`);
      return;
    }

    setSelectedSeats((prev) => [...prev, seat]);
  };

  const confirmReservation = async () => {
    if (!canConfirm) {
      showToast("Choisissez toutes les places avant de confirmer.");
      return;
    }

    try {
      setSubmitting(true);

      if (editing && editingReservation?.id) {
        const res = await ReservationService.updateReservation(editingReservation.id, {
          creneau: reservationDraft.creneau,
          typeRepas: reservationDraft.typeRepas,
          groupSize,
          selectedSeats,
        });

        navigation.navigate("StudentReservationQR", {
          reservation: { ...res?.reservation },
          solde: undefined,
        });
        return;
      }

      const res = await ReservationService.createReservation({
        dateISO: reservationDraft.dateISO,
        repas: reservationDraft.repas,
        creneau: reservationDraft.creneau,
        typeRepas: reservationDraft.typeRepas,
        groupSize,
        selectedSeats,
      });

      navigation.navigate("StudentReservationQR", {
        reservation: res?.reservation,
        solde: res?.solde,
      });
    } catch (e) {
      showToast(e?.response?.data?.message || "Erreur de reservation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#E7D6C6", "#D2B8A0"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Carte du restaurant</Text>
          <View style={{ width: 42 }} />
        </View>
        <Text style={styles.headerSub}>Selectionnez vos places sur la carte puis finalisez la reservation.</Text>
      </LinearGradient>

      <View style={styles.topPanel}>
        <View style={styles.peoplePanel}>
          <Text style={styles.peopleTitle}>Personnes</Text>
          <View style={styles.peopleChips}>
            {PEOPLE_OPTIONS.map((count) => {
              const active = groupSize === count;
              return (
                <TouchableOpacity
                  key={count}
                  style={[styles.peopleChip, active && styles.peopleChipActive]}
                  onPress={() => {
                    setGroupSize(count);
                    setSelectedSeats((prev) => prev.slice(0, count));
                  }}
                >
                  <Text style={[styles.peopleChipText, active && styles.peopleChipTextActive]}>{count}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.legendPanel}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#1DB96B" }]} />
            <Text style={styles.legendText}>Disponible</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#E35D5D" }]} />
            <Text style={styles.legendText}>Reservee</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#4D86D9" }]} />
            <Text style={styles.legendText}>Occupee</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.mapFrame}>
          <View style={styles.mapHeaderRow}>
            <View>
              <Text style={styles.mapTitle}>Partie 2</Text>
              <Text style={styles.mapSubtitle}>
                {availableCount} places libres - Choisir {groupSize} place{groupSize > 1 ? "s" : ""}
              </Text>
            </View>
            <View style={styles.zoneBadge}>
              <Ionicons name="restaurant-outline" size={15} color="#6E5643" />
              <Text style={styles.zoneBadgeText}>Salle principale</Text>
            </View>
          </View>

          <View style={styles.mapLauncherCard}>
            <View style={styles.mapLauncherTextWrap}>
              <Text style={styles.mapLauncherTitle}>Choisir vos chaises</Text>
              <Text style={styles.mapLauncherText}>
                Ouvrez la carte pour voir la salle et selectionner vos places avec les vrais statuts.
              </Text>
              <Text style={styles.mapLauncherMeta}>
                {availableCount} places libres - {selectedSeats.length}/{groupSize} selectionnee{selectedSeats.length > 1 ? "s" : ""}
              </Text>
            </View>
            <TouchableOpacity style={styles.mapLauncherBtn} onPress={() => setMapVisible(true)}>
              <Ionicons name="grid-outline" size={18} color="#fff" />
              <Text style={styles.mapLauncherBtnText}>Ouvrir la Smart Map</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.summaryEyebrow}>Confirmation finale</Text>
              <Text style={styles.summaryTitle}>Recapitulatif sur place</Text>
            </View>
            <View style={styles.selectedBadge}>
              <Text style={styles.selectedBadgeText}>{selectedSeats.length}/{groupSize}</Text>
            </View>
          </View>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Repas</Text>
              <Text style={styles.summaryValue}>{reservationDraft.repasLabel}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Creneau</Text>
              <Text style={styles.summaryValue}>{reservationDraft.creneau}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Date</Text>
              <Text style={styles.summaryValue}>{reservationDraft.todayStr}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Tickets bloques</Text>
              <Text style={styles.summaryValue}>{groupSize}</Text>
            </View>
          </View>

          <View style={styles.selectionBox}>
            <Text style={styles.selectionLabel}>Places choisies</Text>
            <Text style={styles.selectionValue}>{selectedSeatLabels || "Aucune place selectionnee"}</Text>
          </View>
        </View>

        <TouchableOpacity disabled={!canConfirm} onPress={confirmReservation} style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}>
          <Text style={styles.confirmText}>{submitting ? "Confirmation..." : "Confirmer la reservation"}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={mapVisible} transparent animationType="fade" onRequestClose={() => setMapVisible(false)}>
        <View style={styles.modalOverlay}>
          <BlurView intensity={24} tint="light" experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>Smart Map</Text>
                <Text style={styles.modalTitle}>Choisir vos chaises</Text>
              </View>
              <TouchableOpacity style={styles.modalClose} onPress={() => setMapVisible(false)}>
                <Ionicons name="close" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalMapScroll} contentContainerStyle={styles.modalMapScrollContent} showsVerticalScrollIndicator={false}>
              {loadingMap ? (
                <View style={styles.loadingMapBox}>
                  <ActivityIndicator size="large" color="#B38A67" />
                  <Text style={styles.loadingMapText}>Chargement de la carte...</Text>
                </View>
              ) : (
                <View style={styles.mapCanvasVertical}>
                  {seatMapTables.map((table) => (
                    <TableBlock key={table.id} table={table} selectedSeats={selectedSeats} onSeatPress={toggleSeat} />
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <View style={styles.modalSelectionBox}>
                <Text style={styles.modalSelectionLabel}>Places choisies</Text>
                <Text style={styles.modalSelectionValue}>{selectedSeatLabels || "Aucune place selectionnee"}</Text>
              </View>
              <TouchableOpacity style={styles.modalValidateBtn} onPress={() => setMapVisible(false)}>
                <Text style={styles.modalValidateText}>Valider la selection</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4EFE8" },
  header: { paddingTop: 28, paddingHorizontal: 18, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { width: 42, height: 42, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.20)", justifyContent: "center", alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  headerSub: { marginTop: 14, color: "#FFF8F2", fontSize: 13, lineHeight: 19 },
  topPanel: {
    marginHorizontal: 16,
    marginTop: -14,
    backgroundColor: "#FFFDF9",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E7DACC",
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  peoplePanel: { marginBottom: 12 },
  peopleTitle: { color: Colors.text, fontSize: 13, fontWeight: "800", marginBottom: 10 },
  peopleChips: { flexDirection: "row", gap: 10 },
  peopleChip: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#F7F0E8",
    borderWidth: 1,
    borderColor: "#E5D7C7",
    justifyContent: "center",
    alignItems: "center",
  },
  peopleChipActive: { backgroundColor: "#DDC4AA", borderColor: "#A57C5A" },
  peopleChipText: { fontSize: 17, fontWeight: "800", color: "#8D7461" },
  peopleChipTextActive: { color: "#4F3526" },
  legendPanel: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { color: "#6E5B4C", fontSize: 12, fontWeight: "600" },
  scrollContent: { padding: 16, paddingTop: 14, paddingBottom: 32 },
  mapFrame: { backgroundColor: "#FFFDF9", borderRadius: 28, borderWidth: 1, borderColor: "#E7DACC", padding: 14, marginBottom: 16 },
  mapHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10 },
  mapTitle: { color: Colors.text, fontSize: 20, fontWeight: "800" },
  mapSubtitle: { color: "#7A6758", marginTop: 4 },
  mapLauncherCard: { backgroundColor: "#F6EEE5", borderRadius: 22, padding: 16, borderWidth: 1, borderColor: "#E5D6C6" },
  mapLauncherTextWrap: { marginBottom: 14 },
  mapLauncherTitle: { color: Colors.text, fontSize: 17, fontWeight: "800" },
  mapLauncherText: { color: "#766356", marginTop: 6, lineHeight: 20 },
  mapLauncherMeta: { color: "#9A7A61", marginTop: 8, fontWeight: "700", fontSize: 12 },
  mapLauncherBtn: {
    backgroundColor: "#B38A67",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  mapLauncherBtnText: { color: "#fff", fontWeight: "800" },
  zoneBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F1E5D8", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8 },
  zoneBadgeText: { color: "#6E5643", fontWeight: "700", fontSize: 12 },
  tableWrap: { position: "absolute", alignItems: "center" },
  seatRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginVertical: 3 },
  seatPill: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  seatPillText: { fontSize: 9, fontWeight: "900" },
  tableCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    position: "relative",
  },
  tableLabel: { color: "#707070", fontWeight: "700", fontSize: 15 },
  tableBadge: {
    position: "absolute",
    bottom: 8,
    width: 18,
    height: 18,
    borderRadius: 5,
    backgroundColor: "#15ACC1",
    justifyContent: "center",
    alignItems: "center",
  },
  summaryCard: { backgroundColor: "#FFFDF9", borderRadius: 26, borderWidth: 1, borderColor: "#E7DACC", padding: 16, marginBottom: 16 },
  summaryTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  summaryEyebrow: { color: "#9A7A61", fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8 },
  summaryTitle: { color: Colors.text, fontSize: 20, fontWeight: "800", marginTop: 4 },
  selectedBadge: { minWidth: 52, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "#EAD9C9", alignItems: "center" },
  selectedBadgeText: { color: "#624938", fontWeight: "800" },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12, marginBottom: 14 },
  summaryItem: { width: "48%", backgroundColor: "#F8F1E9", borderRadius: 18, padding: 12 },
  summaryLabel: { color: "#8B7462", fontSize: 12, marginBottom: 6 },
  summaryValue: { color: Colors.text, fontWeight: "800" },
  selectionBox: { backgroundColor: "#F2E7DB", borderRadius: 18, padding: 14 },
  selectionLabel: { color: "#8A6F5A", fontWeight: "700", marginBottom: 6 },
  selectionValue: { color: "#4D382A", fontWeight: "800", lineHeight: 20 },
  confirmBtn: {
    backgroundColor: "#B38A67",
    borderRadius: 20,
    paddingVertical: 17,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  confirmBtnDisabled: { opacity: 0.45 },
  confirmText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(35,29,24,0.16)", justifyContent: "center", alignItems: "center", paddingHorizontal: 14 },
  modalCard: {
    width: Math.min(SCREEN_WIDTH - 28, 380),
    maxHeight: SCREEN_HEIGHT - 120,
    backgroundColor: "#FFF9F3",
    borderRadius: 28,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E7DACC",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 10,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  modalEyebrow: { color: "#9A7A61", fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8 },
  modalTitle: { color: Colors.text, fontSize: 22, fontWeight: "800", marginTop: 4 },
  modalClose: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#F2E6DA", justifyContent: "center", alignItems: "center" },
  modalMapScroll: { maxHeight: Math.min(SCREEN_HEIGHT * 0.48, 430) },
  modalMapScrollContent: { paddingBottom: 6 },
  mapCanvasVertical: {
    width: Math.min(SCREEN_WIDTH - 74, 300),
    height: 1090,
    backgroundColor: "#EEF1F5",
    borderRadius: 24,
    position: "relative",
    overflow: "hidden",
    padding: 10,
    alignSelf: "center",
  },
  loadingMapBox: { minHeight: 280, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingMapText: { color: "#6E5643", fontWeight: "700" },
  modalFooter: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14 },
  modalSelectionBox: { flex: 1, backgroundColor: "#F2E7DB", borderRadius: 18, padding: 12 },
  modalSelectionLabel: { color: "#8A6F5A", fontWeight: "700", fontSize: 11, marginBottom: 4 },
  modalSelectionValue: { color: "#4D382A", fontWeight: "800" },
  modalValidateBtn: { minWidth: 110, backgroundColor: "#B38A67", borderRadius: 18, paddingVertical: 15, paddingHorizontal: 16, alignItems: "center" },
  modalValidateText: { color: "#fff", fontWeight: "800" },
});
