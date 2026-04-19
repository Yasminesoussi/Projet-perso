// Screen “Menu”: UI + state simple + navigation uniquement
// Toute la logique métier est dans /usecases et /utils
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";
import Colors from "../../constants/Colors";
import StudentBottomTabs from "../../navigation/StudentBottomTabs";
import MenuService from "../../services/MenuService";
import { getTodayISODate } from "../../utils/date";

export default function StudentMenuScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const repasParam = String(route.params?.repas || "").toLowerCase();
  const initialRepas =
    repasParam === "déjeuner" || repasParam === "dejeuner"
      ? "dejeuner"
      : repasParam === "dîner" || repasParam === "diner"
        ? "diner"
        : repasParam === "libre"
          ? "libre"
          : "diner";
  const [repas, setRepas] = useState(initialRepas);

  const [dailyMenu, setDailyMenu] = useState(null);
  const [loadingDaily, setLoadingDaily] = useState(true);
  const [weekMenus, setWeekMenus] = useState([]);
  const [loadingWeek, setLoadingWeek] = useState(true);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);

  useEffect(() => {
    // Charge menu du jour + menus semaine via services (vues prêtes UI)
    // - dailyMenu: pour l’affichage immédiat
    // - weekMenus: pour naviguer sur 7 jours
    const load = async () => {
      setLoadingDaily(true);
      setLoadingWeek(true);
      try {
        const d = await MenuService.getDailyMenuByRepasView(repas);
        setDailyMenu(d);
      } catch {
        setDailyMenu(null);
      } finally {
        setLoadingDaily(false);
      }
      try {
        const w = await MenuService.getWeekMenusByRepasView(repas);
        setWeekMenus(w);
      } catch {
        setWeekMenus([]);
      } finally {
        setLoadingWeek(false);
      }
    };
    load();
  }, [repas]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#d7c9bb", "#b9a892"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Menu</Text>
          <View style={{ width: 22 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.chipsRow}>
          <TouchableOpacity
            style={[styles.chip, repas === "dejeuner" && styles.chipActive]}
            onPress={() => setRepas("dejeuner")}
          >
            <Text style={[styles.chipText, repas === "dejeuner" && styles.chipTextActive]}>Déjeuner</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, repas === "diner" && styles.chipActive, { backgroundColor: repas === "diner" ? "#ffe9b8" : "#fff" }]}
            onPress={() => setRepas("diner")}
          >
            <Text style={[styles.chipText, repas === "diner" && styles.chipTextActive]}>Dîner</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, repas === "libre" && styles.chipActive, { backgroundColor: repas === "libre" ? "#ffe4e9" : "#fff" }]}
            onPress={() => setRepas("libre")}
          >
            <Text style={[styles.chipText, repas === "libre" && styles.chipTextActive]}>Libre</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Menu du jour</Text>

        {loadingDaily ? (
          <View style={styles.menuCard}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Chargement…</Text>
            </View>
          </View>
        ) : dailyMenu ? (
          <View style={styles.menuCard}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Menu Complet</Text>
              <View style={styles.ticketPill}>
                <Text style={styles.ticketPillText}>1 ticket = 4 éléments</Text>
              </View>
            </View>
            {(dailyMenu.items || []).map((item, i) => {
              const uri = item.imageUri;
              return (
                <TouchableOpacity
                  key={i}
                  style={styles.itemRow}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate("StudentPlatDetail", { item })}
                >
                  {uri ? (
                    <Image source={{ uri }} style={styles.itemImage} />
                  ) : (
                    <View style={[styles.itemImage, { justifyContent: "center", alignItems: "center" }]}>
                      <Ionicons name="image-outline" size={20} color="#b39c86" />
                    </View>
                  )}
                  <View style={styles.itemCenter}>
                    <Text style={styles.itemLabel}>{item.label}</Text>
                    <Text style={styles.itemName}>{item.name}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#bfbfbf" />
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.reserveBtn}
              onPress={() => {
                const todayISO = getTodayISODate();
                navigation.navigate("StudentReserve", {
                  repas: repas === "dejeuner" ? "Déjeuner" : repas === "libre" ? "Libre" : "Dîner",
                  date: todayISO,
                  specialTypeHint: dailyMenu?.typeMenu || null,
                });
              }}
            >
              <Text style={styles.reserveText}>Réserver ce menu</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.menuCard, styles.emptyCard]}>
            <Ionicons name="restaurant-outline" size={22} color="#b39c86" />
            <Text style={styles.emptyTitle}>
              Pas de menu {repas === "dejeuner" ? "déjeuner" : repas === "libre" ? "libre" : "dîner"} aujourd’hui
            </Text>
            <Text style={styles.emptySub}>Reviens plus tard</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Menu de la semaine</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          <View style={styles.weekChipsRow}>
            {weekMenus.map((w, idx) => {
              const active = idx === selectedWeekIndex;
              return (
                <TouchableOpacity key={idx} onPress={() => setSelectedWeekIndex(idx)} activeOpacity={0.8}>
                  <View style={[styles.weekChip, active && styles.weekChipActive]}>
                    <Text style={[styles.weekChipText, active && styles.weekChipTextActive]}>{w.dayLabel} {w.dateLabel}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {loadingWeek ? (
          <View style={styles.menuCard}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Chargement…</Text>
            </View>
          </View>
        ) : (
          (() => {
            const w = weekMenus[selectedWeekIndex];
            if (!w) {
              return (
                <View style={styles.menuCard}>
                  <View style={styles.menuHeader}>
                    <Text style={styles.menuTitle}>Aucun jour sélectionné</Text>
                  </View>
                </View>
              );
            }
            return (
              <View style={styles.menuCard}>
                <View style={styles.menuHeader}>
                  <Text style={styles.menuTitle}>{w.dayLabel} {w.dateLabel}</Text>
                  <View style={styles.ticketPill}>
                    <Text style={styles.ticketPillText}>1 ticket = 4 éléments</Text>
                  </View>
                </View>
                {w.items && w.items.length > 0 ? (
                  <>
                    {w.items.map((item, i) => {
                      const uri = item.imageUri;
                      return (
                        <TouchableOpacity
                          key={i}
                          style={styles.itemRow}
                          activeOpacity={0.8}
                          onPress={() => navigation.navigate("StudentPlatDetail", { item })}
                        >
                          {uri ? (
                            <Image source={{ uri }} style={styles.itemImage} />
                          ) : (
                            <View style={[styles.itemImage, { justifyContent: "center", alignItems: "center" }]}>
                              <Ionicons name="image-outline" size={20} color="#b39c86" />
                            </View>
                          )}
                          <View style={styles.itemCenter}>
                            <Text style={styles.itemLabel}>{item.label}</Text>
                            <Text style={styles.itemName}>{item.name}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color="#bfbfbf" />
                        </TouchableOpacity>
                      );
                    })}
                    <TouchableOpacity
                      style={styles.reserveBtn}
                      onPress={() => navigation.navigate("StudentReserve", {
                        repas: repas === "dejeuner" ? "Déjeuner" : repas === "libre" ? "Libre" : "Dîner",
                        date: w.dateISO,
                        specialTypeHint: w.typeMenu || null,
                      })}
                    >
                      <Text style={styles.reserveText}>Réserver ce menu</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={[styles.itemRow, { justifyContent: "center" }]}>
                    <Ionicons name="restaurant-outline" size={20} color="#b39c86" />
                    <Text style={[styles.itemName, { marginLeft: 8 }]}>
                      Pas de menu {repas === "dejeuner" ? "déjeuner" : repas === "libre" ? "libre" : "dîner"}
                    </Text>
                  </View>
                )}
              </View>
            );
          })()
        )}
      </ScrollView>
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
  content: { paddingHorizontal: 16, paddingBottom: 124 },
  chipsRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  chip: { borderRadius: 16, borderWidth: 1, borderColor: "#eadfce", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#fff" },
  chipActive: { borderColor: "#cbbba7" },
  chipText: { color: Colors.text, opacity: 0.7, fontWeight: "700" },
  chipTextActive: { opacity: 1 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: Colors.text, marginVertical: 12 },
  menuCard: { backgroundColor: "#fff", borderRadius: 20, padding: 14, elevation: 3, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  menuHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  menuTitle: { fontSize: 16, fontWeight: "800", color: Colors.text },
  ticketPill: { backgroundColor: "#e7f8ee", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  ticketPillText: { color: "#2e7d32", fontWeight: "700", fontSize: 12 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#f9f7f4", borderRadius: 14, padding: 10, marginBottom: 10 },
  itemImage: { width: 56, height: 56, borderRadius: 12, backgroundColor: "#EEE" },
  itemCenter: { flex: 1 },
  itemLabel: { fontSize: 12, color: Colors.text, opacity: 0.6 },
  itemName: { fontSize: 14, fontWeight: "700", color: Colors.text },
  reserveBtn: { backgroundColor: "#8b7763", borderRadius: 16, paddingVertical: 14, alignItems: "center", marginTop: 6 },
  reserveText: { color: "#fff", fontWeight: "800" },
  weekChipsRow: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  weekChip: { borderRadius: 16, borderWidth: 1, borderColor: "#eadfce", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#fff" },
  weekChipActive: { borderColor: "#cbbba7", backgroundColor: "#f6efe7" },
  weekChipText: { color: Colors.text, opacity: 0.7, fontWeight: "700" },
  weekChipTextActive: { opacity: 1 },
  emptyCard: { alignItems: "center", justifyContent: "center", gap: 6 }
});
