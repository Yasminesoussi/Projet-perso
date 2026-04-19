import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ToastAndroid,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "../../constants/Colors";
import { useNavigation, useRoute } from "@react-navigation/native";
import ReservationService from "../../services/ReservationService";

const SEAT_LAYOUT = [
  {
    tableId: "T1",
    label: "Table 1",
    seats: [
      { id: "T1-S1", label: "A1", status: "available" },
      { id: "T1-S2", label: "A2", status: "reserved" },
      { id: "T1-S3", label: "A3", status: "available" },
      { id: "T1-S4", label: "A4", status: "occupied" },
    ],
  },
  {
    tableId: "T2",
    label: "Table 2",
    seats: [
      { id: "T2-S1", label: "B1", status: "available" },
      { id: "T2-S2", label: "B2", status: "available" },
      { id: "T2-S3", label: "B3", status: "reserved" },
      { id: "T2-S4", label: "B4", status: "available" },
    ],
  },
  {
    tableId: "T3",
    label: "Table 3",
    seats: [
      { id: "T3-S1", label: "C1", status: "occupied" },
      { id: "T3-S2", label: "C2", status: "available" },
      { id: "T3-S3", label: "C3", status: "available" },
      { id: "T3-S4", label: "C4", status: "available" },
    ],
  },
];

const PEOPLE_OPTIONS = [1, 2, 3, 4];

function getSeatColors(status, selected) {
  if (selected) {
    return { bg: "#E8D7C5", border: "#9E7B5B", text: "#50392A", icon: "checkmark-circle" };
  }
  if (status === "reserved") {
    return { bg: "#FFF2CC", border: "#E0B33D", text: "#8B6A14", icon: "time-outline" };
  }
  if (status === "occupied") {
    return { bg: "#F6D6D3", border: "#D26A61", text: "#9E302A", icon: "close-circle-outline" };
  }
  return { bg: "#E8F3EA", border: "#67A57A", text: "#2E6A3F", icon: "ellipse" };
}

export default function StudentSeatMapScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const reservationDraft = route.params?.reservationDraft || {};
  const editing = route.params?.editing || false;
  const editingReservation = route.params?.editingReservation;

  const [groupSize, setGroupSize] = useState(route.params?.groupSize || 1);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const availableCount = useMemo(
    () => SEAT_LAYOUT.flatMap((table) => table.seats).filter((seat) => seat.status === "available").length,
    []
  );

  const showToast = (message) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      alert(message);
    }
  };

  const toggleSeat = (seat) => {
    if (seat.status !== "available") return;

    const alreadySelected = selectedSeats.some((item) => item.id === seat.id);
    if (alreadySelected) {
      setSelectedSeats((prev) => prev.filter((item) => item.id !== seat.id));
      return;
    }

    if (selectedSeats.length >= groupSize) {
      showToast(`Vous pouvez choisir seulement ${groupSize} place${groupSize > 1 ? "s" : ""}.`);
      return;
    }

    setSelectedSeats((prev) => [...prev, { id: seat.id, label: seat.label, tableId: seat.tableId }]);
  };

  const selectedSeatLabels = selectedSeats.map((seat) => seat.label).join(", ");
  const canConfirm = selectedSeats.length === groupSize && !submitting;

  const confirmReservation = async () => {
    if (!canConfirm) {
      showToast("Selectionnez toutes les places avant de confirmer.");
      return;
    }

    try {
      setSubmitting(true);

      if (editing && editingReservation?.id) {
        const res = await ReservationService.updateReservation(editingReservation.id, {
          creneau: reservationDraft.creneau,
          typeRepas: reservationDraft.typeRepas,
        });

        navigation.navigate("StudentReservationQR", {
          reservation: { ...res?.reservation },
          solde: undefined,
          selectedSeats,
          groupSize,
        });
        return;
      }

      const res = await ReservationService.createReservation({
        dateISO: reservationDraft.dateISO,
        repas: reservationDraft.repas,
        creneau: reservationDraft.creneau,
        typeRepas: reservationDraft.typeRepas,
      });

      navigation.navigate("StudentReservationQR", {
        reservation: res?.reservation,
        solde: res?.solde,
        selectedSeats,
        groupSize,
      });
    } catch (e) {
      const msg = e?.response?.data?.message || "Erreur de reservation";
      showToast(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#E8D7C6", "#D5BEA7"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Smart Map</Text>
          <View style={{ width: 22 }} />
        </View>
        <Text style={styles.headerSubtitle}>Choisissez vos places avant la confirmation finale</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Sur place</Text>
          <Text style={styles.heroTitle}>Selection des places</Text>
          <Text style={styles.heroText}>
            Votre reservation actuelle reste intacte. Ici, vous choisissez seulement le nombre de personnes et les chaises.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Nombre de personnes</Text>
          <Text style={styles.sectionSub}>Chaque personne correspond a une place et a un repas reserve.</Text>
          <View style={styles.peopleRow}>
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Carte du restaurant</Text>
          <Text style={styles.sectionSub}>
            Selectionnez exactement {groupSize} place{groupSize > 1 ? "s" : ""}. Disponibles: {availableCount}
          </Text>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#E8F3EA", borderColor: "#67A57A" }]} />
              <Text style={styles.legendText}>Disponible</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#FFF2CC", borderColor: "#E0B33D" }]} />
              <Text style={styles.legendText}>Reservee</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#F6D6D3", borderColor: "#D26A61" }]} />
              <Text style={styles.legendText}>Occupee</Text>
            </View>
          </View>

          <View style={styles.mapBox}>
            <View style={styles.stageBadge}>
              <Ionicons name="restaurant-outline" size={16} color="#6F5440" />
              <Text style={styles.stageBadgeText}>Zone service</Text>
            </View>

            {SEAT_LAYOUT.map((table) => (
              <View key={table.tableId} style={styles.tableCard}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableTitle}>{table.label}</Text>
                  <Text style={styles.tableMeta}>{table.seats.length} places</Text>
                </View>

                <View style={styles.seatGrid}>
                  {table.seats.map((seat) => {
                    const selected = selectedSeats.some((item) => item.id === seat.id);
                    const colors = getSeatColors(seat.status, selected);
                    return (
                      <TouchableOpacity
                        key={seat.id}
                        style={[
                          styles.seatChip,
                          { backgroundColor: colors.bg, borderColor: colors.border },
                        ]}
                        onPress={() => toggleSeat({ ...seat, tableId: table.tableId })}
                        activeOpacity={seat.status === "available" ? 0.85 : 1}
                      >
                        <Ionicons name={colors.icon} size={16} color={colors.text} />
                        <Text style={[styles.seatText, { color: colors.text }]}>{seat.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Confirmation finale</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Type</Text>
              <Text style={styles.summaryValue}>Sur place</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Repas</Text>
              <Text style={styles.summaryValue}>{reservationDraft.repasLabel}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Creneau</Text>
              <Text style={styles.summaryValue}>{reservationDraft.creneau}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Date</Text>
              <Text style={styles.summaryValue}>{reservationDraft.todayStr}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Personnes</Text>
              <Text style={styles.summaryValue}>{groupSize}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Places choisies</Text>
              <Text style={styles.summaryValue}>{selectedSeatLabels || "Aucune"}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tickets bloques</Text>
              <Text style={styles.summaryValue}>{groupSize} repas</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
          onPress={confirmReservation}
          disabled={!canConfirm}
        >
          <Text style={styles.confirmText}>
            {submitting ? "Confirmation..." : "Confirmer la reservation"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F1EA" },
  header: {
    paddingTop: 28,
    paddingHorizontal: 18,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 19, fontWeight: "800" },
  headerSubtitle: { color: "#FFF8F2", opacity: 0.92, marginTop: 12, fontSize: 13, lineHeight: 19 },
  content: { padding: 16, paddingBottom: 34 },
  heroCard: {
    backgroundColor: "#FFFDF9",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E8DCCF",
    marginBottom: 16,
  },
  heroEyebrow: {
    color: "#A07C61",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  heroTitle: { color: Colors.text, fontSize: 22, fontWeight: "800", marginTop: 8 },
  heroText: { color: "#6B5A4D", lineHeight: 20, marginTop: 8 },
  section: {
    backgroundColor: "#FFFDF9",
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8DCCF",
    marginBottom: 16,
  },
  sectionTitle: { color: Colors.text, fontSize: 15, fontWeight: "800", marginBottom: 8 },
  sectionSub: { color: "#7B685A", lineHeight: 19, marginBottom: 14 },
  peopleRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  peopleChip: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#F6EEE4",
    borderWidth: 1,
    borderColor: "#E2D3C3",
    justifyContent: "center",
    alignItems: "center",
  },
  peopleChipActive: {
    backgroundColor: "#E7D7C8",
    borderColor: "#B18B6C",
  },
  peopleChipText: { color: "#8D7360", fontSize: 18, fontWeight: "800" },
  peopleChipTextActive: { color: "#5B4030" },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginBottom: 14 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
  legendText: { color: "#6B5A4D", fontSize: 12, fontWeight: "600" },
  mapBox: {
    backgroundColor: "#F7F0E8",
    borderRadius: 22,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E7D8C8",
  },
  stageBadge: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EEDFD0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 12,
  },
  stageBadgeText: { color: "#6F5440", fontWeight: "700", fontSize: 12 },
  tableCard: {
    backgroundColor: "#FFFDF9",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E8DCCF",
    marginBottom: 12,
  },
  tableHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  tableTitle: { color: Colors.text, fontWeight: "800" },
  tableMeta: { color: "#8D7766", fontSize: 12, fontWeight: "600" },
  seatGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  seatChip: {
    width: "47%",
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  seatText: { fontWeight: "800" },
  summaryCard: {
    backgroundColor: "#F7F0E8",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E7D8C8",
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8, gap: 12 },
  summaryLabel: { color: "#7B685A" },
  summaryValue: { color: Colors.text, fontWeight: "800", flexShrink: 1, textAlign: "right" },
  confirmBtn: {
    backgroundColor: "#B69374",
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  confirmBtnDisabled: {
    opacity: 0.45,
  },
  confirmText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
