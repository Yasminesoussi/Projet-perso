// Screen dâ€™accueil Ã©tudiant : uniquement UI + state simple + navigation
// La logique mÃ©tier est externalisÃ©e dans /usecases et /utils
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "../../constants/Colors";
import StudentBottomTabs from "../../navigation/StudentBottomTabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import MenuService from "../../services/MenuService";
import StudentAuthService from "../../services/StudentAuthService";
import StudentNotificationsService from "../../services/StudentNotificationsService";
import { getTodayISODateLocal } from "../../utils/dateLocal";

export default function StudentHomeScreen() {
  const navigation = useNavigation();
  const [todayMenus, setTodayMenus] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [balance, setBalance] = useState(0);
  const [studentFirstName, setStudentFirstName] = useState("");
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    // Charge le menu du jour (dÃ©jeuner) via le service (vue prÃªte UI)
    const fetchMenu = async () => {
      try {
        const today = getTodayISODateLocal();
        const data = await MenuService.getDailyMenus(today);
        const list = Array.isArray(data) ? data : [];
        const mapped = list.map((menu, index) => {
          const repasRaw = String(menu?.repas || "").toLowerCase();
          const typeMenuRaw = String(menu?.typeMenu || "").toLowerCase();
          const repasKey =
            typeMenuRaw === "evenement"
              ? "libre"
              : repasRaw === "libre"
                ? "libre"
                : (repasRaw.includes("dejeuner") ? "dejeuner" : "diner");
          const title = typeMenuRaw === "ramadan"
            ? "Menu Ramadan"
            : typeMenuRaw === "examens"
              ? "Menu Examens"
            : typeMenuRaw === "evenement"
              ? "Menu Evenement"
              : repasKey === "dejeuner"
                ? "Menu dejeuner"
                : repasKey === "libre"
                  ? "Menu libre"
                  : "Menu diner";
          return {
            id: menu?._id || `${repasKey}-${index}`,
            title,
            subtitle: menu?.creneau ? String(menu.creneau).replace("-", " -> ") : "Menu du jour",
            repasKey,
            items: (menu?.plats || []).slice(0, 4).map((plat) => plat?.nom || "").filter(Boolean),
          };
        });
        setTodayMenus(mapped);
      } catch {
        setTodayMenus([]);
      } finally {
        setLoadingMenu(false);
      }
    };
    fetchMenu();
  }, []);
  useFocusEffect(
    React.useCallback(() => {
      let mounted = true;
      // Charge le solde de lâ€™Ã©tudiant via le service
      const loadBalance = async () => {
        try {
          const me = await StudentAuthService.me();
          const b = await StudentAuthService.getBalance();
          const unread = await StudentNotificationsService.getUnreadCount();
          if (mounted) {
            setBalance(b);
            setStudentFirstName(me?.student?.firstName || "");
            setUnreadNotifications(unread);
          }
        } catch {
          if (mounted) {
            setBalance(0);
            setStudentFirstName("");
            setUnreadNotifications(0);
          }
        }
      };
      loadBalance();
      return () => { mounted = false; };
    }, [])
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerArea}>
        <LinearGradient colors={["#d7c9bb", "#b9a892"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroContent}>
            <View>
              
              <Text style={styles.heroName}>{studentFirstName ? `Bonjour ${studentFirstName}` : "Bonjour"}</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate("StudentNotifications")}>
                <Ionicons name="notifications-outline" size={22} color="#fff" />
                {unreadNotifications > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadNotifications > 9 ? "9+" : unreadNotifications}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
              <TouchableOpacity style={styles.avatarBtn} onPress={() => navigation.navigate("StudentProfile")}>
                <Ionicons name="person-circle-outline" size={38} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
        <View style={styles.balanceCard}>
          <View>
            <Text style={styles.balanceTitle}>Solde tickets</Text>
            <Text style={styles.balanceValue}>{balance}</Text>
            <Text style={styles.balanceNote}>1 ticket = 1 menu complet</Text>
          </View>
          <TouchableOpacity style={styles.reloadBtn} onPress={() => navigation.navigate("StudentWallet")}>
            <Text style={styles.reloadText}>+ Recharger</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.quickContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Reservation rapide</Text>
            <Text style={styles.sectionRight}>Aujourd'hui</Text>
          </View>
          <View style={styles.quickRow}>
            <TouchableOpacity style={[styles.quickCard, { backgroundColor: "#FFE9C9" }]} onPress={() => navigation.navigate("StudentReserve", { repas: "Dejeuner" })}>
              <View style={styles.quickIcon}>
                <Ionicons name="sunny-outline" size={20} color="#d9b99b" />
              </View>
              <Text style={styles.quickTitle}>Dejeuner</Text>
              <Text style={styles.quickTime}>12h00 - 14h30</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickCard, { backgroundColor: "#E7E3FF" }]} onPress={() => navigation.navigate("StudentReserve", { repas: "Diner" })}>
              <View style={styles.quickIcon}>
                <Ionicons name="moon-outline" size={20} color="#8b7de6" />
              </View>
              <Text style={styles.quickTitle}>Diner</Text>
              <Text style={styles.quickTime}>18h30 - 20h30</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Menu du jour</Text>
          <TouchableOpacity onPress={() => navigation.navigate("StudentMenu", { repas: "Dejeuner" })}>
            <Text style={styles.sectionRight}>Voir tout</Text>
          </TouchableOpacity>
        </View>

        {loadingMenu ? (
          <View style={styles.menuCard}>
            <Text style={{ color: Colors.text, opacity: 0.7 }}>Chargement du menu...</Text>
          </View>
        ) : todayMenus.length ? (
          <>
            {todayMenus.map((menu) => (
              <TouchableOpacity
                key={menu.id}
                style={styles.menuCard}
                activeOpacity={0.9}
                onPress={() => navigation.navigate("StudentMenu", { repas: menu.repasKey === "diner" ? "Diner" : menu.repasKey === "dejeuner" ? "Dejeuner" : "Libre" })}
              >
                <View style={styles.menuHeader}>
                  <View style={styles.menuTitleBlock}>
                    <View style={styles.menuTitleRow}>
                      <Ionicons name={menu.repasKey === "diner" ? "moon-outline" : "restaurant-outline"} size={18} color={Colors.text} />
                      <Text style={styles.menuTitle}>{menu.title}</Text>
                    </View>
                    <Text style={styles.menuSubtitle}>{menu.subtitle}</Text>
                  </View>
                  <View style={styles.ticketBadge}>
                    <Text style={styles.ticketText}>1 ticket</Text>
                  </View>
                </View>
                <View style={styles.menuList}>
                  {menu.items.length ? (
                    menu.items.map((item, i) => (
                      <View key={`${menu.id}-${i}`} style={styles.menuLine}>
                        <View style={styles.menuLineDot} />
                        <Text style={styles.menuLineText} numberOfLines={1}>{item}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.menuEmptyText}>Menu disponible sans details.</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="restaurant-outline" size={24} color="#b39c86" />
            <Text style={styles.emptyTitle}>Pas de menu aujourd'hui</Text>
            <Text style={styles.emptySub}>Reviens plus tard</Text>
          </View>
        )}

       
      
      </ScrollView>
      <StudentBottomTabs />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  headerArea: { height: 160, position: "relative", marginBottom: 28 },
  hero: { position: "absolute", top: 0, left: 0, right: 0, height: 120, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingTop: 28, paddingHorizontal: 20 },
  heroContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroHello: { fontSize: 12, color: "#fff", opacity: 0.9 },
  heroName: { fontSize: 20, fontWeight: "800", color: "#fff" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  notifBtn: { position: "relative", padding: 5, marginRight: 4 },
  badge: { position: "absolute", top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: "#E53935", justifyContent: "center", alignItems: "center", paddingHorizontal: 3 },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  avatarBtn: { padding: 5 },
  balanceCard: { position: "absolute", left: 20, right: 20, bottom: -24, backgroundColor: "#fff", borderRadius: 20, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", elevation: 8, zIndex: 10, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
  scroll: { paddingHorizontal: 20, paddingBottom: 124 },
  balanceTitle: { color: Colors.text, opacity: 0.7 },
  balanceValue: { fontSize: 24, fontWeight: "900", color: Colors.text, marginVertical: 2 },
  balanceNote: { fontSize: 12, color: Colors.text, opacity: 0.6 },
  reloadBtn: { backgroundColor: Colors.card, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  reloadText: { color: Colors.text, fontWeight: "700" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: Colors.text },
  sectionRight: { fontSize: 12, color: Colors.text, opacity: 0.6 },
  quickContainer: { backgroundColor: "#fff", borderRadius: 20, padding: 14, elevation: 3, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, marginBottom: 16 },
  quickRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  quickCard: { flex: 1, borderRadius: 18, padding: 14, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  quickIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", marginBottom: 8 },
  quickTitle: { fontSize: 14, fontWeight: "700", color: Colors.text },
  quickTime: { fontSize: 12, color: Colors.text, opacity: 0.6 },
  menuCard: { backgroundColor: "#fff", borderRadius: 20, padding: 14, marginBottom: 16, elevation: 3, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  menuTitleBlock: { flex: 1, paddingRight: 10 },
  menuHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  menuTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  menuTitle: { fontSize: 14, fontWeight: "800", color: Colors.text },
  menuSubtitle: { fontSize: 12, color: Colors.text, opacity: 0.65, marginTop: 4 },
  ticketBadge: { backgroundColor: "#e9f7ef", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  ticketText: { color: "#2e7d32", fontWeight: "700", fontSize: 12 },
  menuList: { gap: 8 },
  menuLine: { flexDirection: "row", alignItems: "center" },
  menuLineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#d9b99b", marginRight: 10 },
  menuLineText: { flex: 1, color: Colors.text, fontWeight: "600" },
  menuEmptyText: { color: Colors.text, opacity: 0.6 },
  emptyCard: { backgroundColor: "#fff", borderRadius: 20, padding: 18, alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: "#eadfd2", marginBottom: 16 },
  emptyTitle: { fontSize: 14, fontWeight: "800", color: Colors.text },
  emptySub: { fontSize: 12, color: Colors.text, opacity: 0.7 },
  favTile: { width: 180, height: 120, borderRadius: 18, overflow: "hidden", marginRight: 12, backgroundColor: "#fff", elevation: 3, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  favTileImage: { flex: 1 },
  favTileImageRadius: { borderRadius: 18 },
  favTileOverlay: { flex: 1, padding: 14, justifyContent: "flex-end" },
  favTileContent: { },
  favTileTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  favTileType: { color: "#fff", opacity: 0.85, marginTop: 4, fontSize: 12 },
  favTileHeart: { position: "absolute", top: 10, right: 10, backgroundColor: "rgba(255,255,255,0.25)", width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" }
});

