import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, BackHandler } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/Colors";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import ReservationService from "../../services/ReservationService";

export default function StudentReservationQRScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const [reservation, setReservation] = useState(route.params?.reservation);
  const [leaving, setLeaving] = useState(false);

  const selectedSeats = reservation?.selectedSeats || [];
  const groupSize = reservation?.groupSize || selectedSeats.length || 1;
  const qrPayload = reservation?.qrPayload || "";
  const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrPayload)}`;

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const onBack = () => {
        navigation.replace("StudentReservations");
        return true;
      };

      const loadReservation = async () => {
        try {
          if (route.params?.reservation?.id) {
            const res = await ReservationService.getReservation(route.params.reservation.id);
            if (active) setReservation(res?.reservation || route.params?.reservation);
          }
        } catch {
          if (active) setReservation(route.params?.reservation);
        }
      };

      loadReservation();
      const sub = BackHandler.addEventListener("hardwareBackPress", onBack);

      return () => {
        active = false;
        sub.remove();
      };
    }, [navigation, route.params?.reservation])
  );

  const seatStatusLabel = (status) => {
    if (status === "occupied") return "Occupee";
    if (status === "reserved") return "Reservee";
    return "Disponible";
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#d7c9bb", "#b9a892"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.replace("StudentReservations")} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>QR Reservation</Text>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>QR Code a presenter</Text>
          <View style={styles.qrBox}>
            <Image source={{ uri: qrApi }} style={{ width: 200, height: 200 }} />
          </View>

          <Text style={styles.meta}>
            Repas: {reservation?.repas === "dejeuner" ? "Dejeuner" : reservation?.repas === "libre" ? "Libre" : "Diner"} - {reservation?.creneau}
          </Text>
          <Text style={styles.meta}>Date: {reservation?.dateISO}</Text>
          <Text style={styles.meta}>Type: {reservation?.typeRepas === "aEmporter" ? "A emporter" : "Sur place"}</Text>
          <Text style={styles.meta}>Statut reservation: {reservation?.status}</Text>
          <Text style={styles.meta}>Nombre de personnes: {groupSize}</Text>
          <Text style={styles.meta}>Tickets bloques: {groupSize}</Text>

          {selectedSeats.length ? (
            <>
              <Text style={styles.meta}>Places: {selectedSeats.map((seat) => seat.label).join(", ")}</Text>
              {selectedSeats.map((seat) => (
                <Text key={seat.id || seat.label} style={styles.meta}>
                  {seat.label}: {seatStatusLabel(seat.status)}
                </Text>
              ))}
            </>
          ) : null}

          {reservation?.canLeave ? (
            <TouchableOpacity
              style={[styles.leaveBtn, leaving && { opacity: 0.6 }]}
              disabled={leaving}
              onPress={async () => {
                try {
                  setLeaving(true);
                  const res = await ReservationService.leaveRestaurant(reservation.id);
                  setReservation((prev) => ({
                    ...prev,
                    ...res?.reservation,
                    selectedSeats: res?.reservation?.selectedSeats || prev?.selectedSeats || [],
                    canLeave: false,
                  }));
                } finally {
                  setLeaving(false);
                }
              }}
            >
              <Text style={styles.leaveBtnText}>{leaving ? "Traitement..." : "Je quitte le resto"}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  header: { height: 110, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingTop: 28, paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { padding: 6 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  content: { padding: 16 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 12, elevation: 3 },
  title: { fontWeight: "800", color: Colors.text, marginBottom: 10 },
  qrBox: { alignItems: "center", justifyContent: "center", paddingVertical: 10 },
  meta: { color: Colors.text, marginTop: 4 },
  leaveBtn: { marginTop: 14, backgroundColor: "#B38A67", borderRadius: 14, paddingVertical: 12, alignItems: "center" },
  leaveBtnText: { color: "#fff", fontWeight: "800" },
});
