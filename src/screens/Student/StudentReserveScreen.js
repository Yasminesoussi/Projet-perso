import React, { useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ToastAndroid } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "../../constants/Colors";
import { useNavigation, useRoute } from "@react-navigation/native";
import MenuService from "../../services/MenuService";
import ReservationService from "../../services/ReservationService";
import { formatISODateLocal, getTodayISODateLocal } from "../../utils/dateLocal";
export default function StudentReserveScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const mode = route.params?.mode || "create";
  const editing = mode === "edit";
  const editingReservation = route.params?.reservation;
  const specialTypeHint = String(route.params?.specialTypeHint || "").toLowerCase();
  const repasParam = String(route.params?.repas || "").toLowerCase();
  const initialRepas =
    editing
      ? (editingReservation?.repas || "diner")
      : (repasParam === "dejeuner" || repasParam === "déjeuner"
          ? "dejeuner"
          : repasParam === "diner" || repasParam === "dîner"
            ? "diner"
            : repasParam === "libre"
              ? "libre"
              : "diner");

  const [typeRepas, setTypeRepas] = useState(editing ? (editingReservation?.typeRepas || "surPlace") : "surPlace");
  const [repas, setRepas] = useState(initialRepas);
  const defaultTimes = (r) => r === "dejeuner"
    ? [{ time: "12h00 -> 13h15", status: "Disponible" }, { time: "13h30 -> 14h30", status: "Disponible" }]
    : [{ time: "18h30 -> 20h00", status: "Disponible" }, { time: "20h15 -> 21h30", status: "Disponible" }];
  const [times, setTimes] = useState(defaultTimes(initialRepas));
  const [creneau, setCreneau] = useState(editing ? (editingReservation?.creneau || defaultTimes(initialRepas)[0].time) : defaultTimes(initialRepas)[0].time);
  const [specialType, setSpecialType] = useState(null);

  const todayStr = useMemo(() => {
    const src = editing ? (editingReservation?.dateISO || new Date().toISOString()) : (route.params?.date || new Date().toISOString());
    const d = new Date(src);
    const day = d.toLocaleDateString("fr-FR", { day: "2-digit" });
    const monthShort = d.toLocaleDateString("fr-FR", { month: "short" });
    const todayISO = getTodayISODateLocal();
    const curISO = formatISODateLocal(d);
    const prefix = curISO === todayISO ? "Aujourd'hui" : "Le";
    return `${prefix}, ${day} ${monthShort.charAt(0).toUpperCase() + monthShort.slice(1)}`;
  }, []);
  const [menuPlats, setMenuPlats] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  useEffect(() => {
    const fetchMenu = async () => {
      setLoadingMenu(true);
      try {
        const dateISO = editing
          ? (editingReservation?.dateISO || getTodayISODateLocal())
          : (route.params?.date || getTodayISODateLocal());
        const data = await MenuService.getDailyMenus(dateISO);
        let selected = null;
        if (Array.isArray(data)) {
          selected =
            repas === "libre"
            ? data.find((m) => {
                const type = (m.typeMenu || "").toLowerCase();
                const meal = (m.repas || "").toLowerCase();
                if (specialTypeHint && type === specialTypeHint) return true;
                return type === "evenement" || meal === "libre";
              })
            : data.find((m) => {
              const meal = (m.repas || m.creneau || "").toLowerCase();
              return repas === "dejeuner"
                ? (meal.includes("dejeuner") || meal === "dejeuner")
                : (meal.includes("diner") || meal === "diner");
            })
            || (repas === "diner" ? data.find((m) => (m.typeMenu || "").toLowerCase() === "ramadan") : null)
            || null;
        }
        const plats = selected?.plats || [];
        const order = { entree: 1, plat: 2, dessert: 3, boisson: 4 };
        const sorted = [...plats].sort((a, b) => (order[(a.typePlat || "").toLowerCase()] || 99) - (order[(b.typePlat || "").toLowerCase()] || 99));
        setMenuPlats(sorted);
        const typeM = selected?.typeMenu || null;
        const tnorm = typeM ? String(typeM).toLowerCase() : null;
        setSpecialType(tnorm && ["ramadan", "examens", "evenement"].includes(tnorm) ? tnorm : null);
        const adminCreneau = selected?.creneau || "";
        const formatted = adminCreneau ? adminCreneau.replace("-", " -> ") : "";
        if ((tnorm === "ramadan" || tnorm === "evenement" || tnorm === "examens") && formatted) {
          const one = [{ time: formatted, status: "Disponible" }];
          setTimes(one);
          if (!editing) setCreneau(one[0].time);
        } else {
          const def = defaultTimes(repas);
          setTimes(def);
          if (!editing) setCreneau(def[0].time);
        }
      } catch {
        setMenuPlats([]);
        const def = defaultTimes(repas);
        setTimes(def);
      } finally {
        setLoadingMenu(false);
      }
    };
    fetchMenu();
  }, [repas, route.params?.date, editing, editingReservation?.dateISO]);
  const labelFromType = (typePlat) => {
    const t = (typePlat || "").toLowerCase();
    if (t === "entree") return "Entree";
    if (t === "plat") return "Plat";
    if (t === "dessert") return "Dessert";
    if (t === "boisson") return "Boisson";
    return "Element";
  };

  const showToast = (message) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      alert(message);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#d7c9bb", "#b9a892"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{editing ? "Modifier la reservation" : "Reservation"}</Text>
          <View style={{ width: 22 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choisir le type de repas</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeCard, typeRepas === "surPlace" && styles.typeCardActive]}
              onPress={() => setTypeRepas("surPlace")}
            >
              <Ionicons name="restaurant" size={22} color={typeRepas === "surPlace" ? Colors.text : "#b39c86"} />
              <Text style={[styles.typeTitle, typeRepas === "surPlace" && styles.typeTitleActive]}>Sur place</Text>
              <Text style={styles.typeSub}>Manger au restaurant</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeCard, typeRepas === "aEmporter" && styles.typeCardActive]}
              onPress={() => setTypeRepas("aEmporter")}
            >
              <Ionicons name="cube-outline" size={22} color={typeRepas === "aEmporter" ? Colors.text : "#b39c86"} />
              <Text style={[styles.typeTitle, typeRepas === "aEmporter" && styles.typeTitleActive]}>A emporter</Text>
              <Text style={styles.typeSub}>Box a recuperer</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selectionner le repas</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[
                styles.mealCard,
                repas === "dejeuner" && styles.mealCardActive,
                specialType === "evenement" && styles.mealCardDisabled,
              ]}
              onPress={() => {
                if (specialType === "evenement") return;
                setRepas("dejeuner");
              }}
              disabled={specialType === "evenement"}
            >
              <Ionicons
                name="sunny-outline"
                size={22}
                color={specialType === "evenement" ? "#cbbfb4" : repas === "dejeuner" ? "#e2a74e" : "#b39c86"}
              />
              <Text style={[styles.mealTitle, specialType === "evenement" && styles.mealTitleDisabled]}>Dejeuner</Text>
              <Text style={styles.mealSub}>12h00 - 14h30</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.mealCard,
                repas === "diner" && styles.mealCardActive,
                specialType === "evenement" && styles.mealCardDisabled,
              ]}
              onPress={() => {
                if (specialType === "evenement") return;
                setRepas("diner");
              }}
              disabled={specialType === "evenement"}
            >
              <Ionicons
                name="moon-outline"
                size={22}
                color={specialType === "evenement" ? "#cbbfb4" : repas === "diner" ? "#7e78c9" : "#b39c86"}
              />
              <Text style={[styles.mealTitle, specialType === "evenement" && styles.mealTitleDisabled]}>Diner</Text>
              <Text style={styles.mealSub}>18h30 - 20h30</Text>
            </TouchableOpacity>
          </View>
          {specialType && (() => {
            const icon = specialType === "ramadan" ? "moon" : specialType === "examens" ? "school-outline" : "sparkles-outline";
            const label = specialType === "ramadan" ? "Ramadan" : specialType === "examens" ? "Examens" : "Evenement";
            return (
              <View style={styles.specialBox}>
                <Ionicons name={icon} size={18} color="#e91e63" />
                <Text style={styles.specialText}>Menu special: {label}</Text>
              </View>
            );
          })()}

          <View style={styles.menuIncluded}>
            {loadingMenu ? (
              <View style={styles.menuRow}>
                <Ionicons name="time-outline" size={18} color="#2e7d32" />
                <Text style={styles.menuText}>Chargement du menu...</Text>
              </View>
            ) : menuPlats.length > 0 ? (
              menuPlats.map((p, i) => (
                <View key={i} style={styles.menuRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#2e7d32" />
                  <Text style={styles.menuText}><Text style={styles.menuLabel}>{labelFromType(p.typePlat)}:</Text> {p.nom}</Text>
                </View>
              ))
            ) : (
              <View style={styles.menuRow}>
                <Ionicons name="restaurant-outline" size={18} color="#2e7d32" />
                <Text style={styles.menuText}>Pas de menu pour ce repas {todayStr.includes("Aujourd") ? "aujourd'hui" : todayStr}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choisir le creneau horaire</Text>
          <View style={styles.timesRow}>
            {times.map((t, idx) => {
              const active = creneau === t.time;
              const isDisponible = t.status === "Disponible";
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.timeChip, active && styles.timeChipActive]}
                  onPress={() => setCreneau(t.time)}
                >
                  <Text style={[styles.timeText, active && styles.timeTextActive]}>{t.time}</Text>
                  <Text style={[styles.timeStatus, { color: isDisponible ? "#2e7d32" : "#b85c5c" }]}>{t.status}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recapitulatif</Text>
          <View style={styles.recapBox}>
            <View style={styles.recapRow}>
              <Text style={styles.recapLabel}>Type:</Text>
              <Text style={styles.recapValue}>{typeRepas === "surPlace" ? "Sur place" : "A emporter"}</Text>
            </View>
            <View style={styles.recapRow}>
              <Text style={styles.recapLabel}>Repas:</Text>
              <Text style={styles.recapValue}>
                {specialType === "examens"
                  ? `Examens (${repas === "dejeuner" ? "Dejeuner" : "Diner"})`
                  : specialType === "evenement"
                    ? "Evenement"
                    : specialType === "ramadan"
                      ? "Ramadan"
                      : repas === "dejeuner"
                        ? "Dejeuner"
                        : repas === "libre"
                          ? "Libre"
                          : "Diner"}
              </Text>
            </View>
            <View style={styles.recapRow}>
              <Text style={styles.recapLabel}>Creneau:</Text>
              <Text style={styles.recapValue}>{creneau}</Text>
            </View>
            <View style={styles.recapRow}>
              <Text style={styles.recapLabel}>Date:</Text>
              <Text style={styles.recapValue}>{todayStr}</Text>
            </View>
            <View style={styles.recapRow}>
              <Text style={styles.recapLabel}>Ticket utilise:</Text>
              <Text style={styles.recapValue}>1 menu complet</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          disabled={!loadingMenu && menuPlats.length === 0}
          style={[styles.confirmBtn, (!loadingMenu && menuPlats.length === 0) && { opacity: 0.5 }]}
          onPress={async () => {
            try {
              if (menuPlats.length === 0) {
                showToast("Pas de menu pour ce repas aujourd'hui");
                return;
              }
              const dateISO = route.params?.date || getTodayISODateLocal();
              const repasLabel = specialType === "examens"
                ? `Examens (${repas === "dejeuner" ? "Dejeuner" : "Diner"})`
                : specialType === "evenement"
                  ? "Evenement"
                  : specialType === "ramadan"
                    ? "Ramadan"
                    : repas === "dejeuner"
                      ? "Dejeuner"
                      : repas === "libre"
                        ? "Libre"
                        : "Diner";
              const repasOut = specialType === "ramadan" ? "diner" : specialType === "evenement" ? "libre" : repas;

              if (typeRepas === "surPlace") {
                navigation.navigate("StudentSeatMapPro", {
                  editing,
                  editingReservation,
                  reservationDraft: {
                    dateISO,
                    repas: repasOut,
                    repasLabel,
                    creneau,
                    typeRepas,
                    todayStr,
                  },
                });
                return;
              }

              if (editing && editingReservation?.id) {
                const res = await ReservationService.updateReservation(editingReservation.id, { creneau, typeRepas });
                navigation.navigate("StudentReservationQR", {
                  reservation: { ...res?.reservation },
                  solde: undefined
                });
              } else {
                const res = await ReservationService.createReservation({
                  dateISO,
                  repas: repasOut,
                  creneau,
                  typeRepas
                });
                navigation.navigate("StudentReservationQR", {
                  reservation: res?.reservation,
                  solde: res?.solde
                });
              }
            } catch (e) {
              const msg = e?.response?.data?.message || "Erreur de reservation";
              showToast(msg);
            }
          }}
        >
          <Text style={styles.confirmText}>{editing ? "Enregistrer les modifications" : "Confirmer la reservation"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  header: { height: 110, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingTop: 28, paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { padding: 6 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  section: { backgroundColor: "#fff", borderRadius: 20, padding: 16, marginTop: 16, elevation: 3 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: Colors.text, marginBottom: 12 },
  typeRow: { flexDirection: "row", gap: 12 },
  typeCard: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: "#eadfce", padding: 14, alignItems: "center", backgroundColor: "#fcf9f5" },
  typeCardActive: { borderColor: "#cbbba7", backgroundColor: "#fff" },
  typeTitle: { marginTop: 6, fontWeight: "700", color: "#b39c86" },
  typeTitleActive: { color: Colors.text },
  typeSub: { fontSize: 12, color: Colors.text, opacity: 0.6, marginTop: 4 },
  mealCard: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: "#eadfce", padding: 14, backgroundColor: "#fcf9f5" },
  mealCardActive: { borderColor: "#cbbba7", backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  mealCardDisabled: { opacity: 0.55, backgroundColor: "#f6f1eb", borderColor: "#e7ddd3" },
  mealTitle: { fontWeight: "700", color: Colors.text },
  mealTitleDisabled: { color: "#a79a8d" },
  mealSub: { fontSize: 12, color: Colors.text, opacity: 0.6, marginTop: 4 },
  menuIncluded: { backgroundColor: "#e8f2ff", borderRadius: 12, padding: 12, marginTop: 12 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  menuText: { color: Colors.text },
  menuLabel: { fontWeight: "700" },
  timesRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "space-between" },
  timeChip: { width: "48%", minWidth: 90, borderRadius: 12, borderWidth: 1, borderColor: "#eadfce", paddingVertical: 10, alignItems: "center", backgroundColor: "#fff" },
  timeChipActive: { borderColor: "#a78bfa" },
  timeText: { fontWeight: "700", color: Colors.text },
  timeTextActive: { color: "#6b4eff" },
  timeStatus: { fontSize: 11, marginTop: 4 },
  recapBox: { backgroundColor: "#fcf9f5", borderRadius: 16, padding: 12 },
  recapRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  recapLabel: { color: Colors.text, opacity: 0.7 },
  recapValue: { color: Colors.text, fontWeight: "700" },
  confirmBtn: { backgroundColor: "#A78BFA", borderRadius: 16, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  confirmText: { color: "#fff", fontWeight: "800" },
  specialBox: { backgroundColor: "#ffe4e9", borderRadius: 12, padding: 10, flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  specialText: { color: Colors.text, fontWeight: "700" }
});

