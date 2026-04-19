import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Colors from "../../constants/Colors";
import apiClient from "../../repositories/apiClient";
import BottomTabs from "../../navigation/BottomTabs";
import MenuService from "../../services/MenuService";
import AdminTicketsService from "../../services/AdminTicketsService";
import { getTodayISODateLocal } from "../../utils/dateLocal";

function findPlatByType(menu, type) {
  if (!menu?.plats) return "Non defini";
  const plat = menu.plats.find((item) => item.typePlat === type);
  return plat ? plat.nom : "Non defini";
}

function formatMealLabel(repas) {
  const lower = String(repas || "").toLowerCase();
  if (lower.includes("dejeuner") || lower.includes("déjeuner")) return "Dejeuner";
  if (lower.includes("diner") || lower.includes("dîner")) return "Diner";
  return repas || "Repas";
}

function formatTypeLabel(typeMenu) {
  const raw = String(typeMenu || "normal").toLowerCase();
  if (raw === "normal") return "Menu normal";
  if (raw === "ramadan") return "Menu ramadan";
  return `Menu ${raw}`;
}

export default function AcceuilScreen() {
  const navigation = useNavigation();
  const currentDate = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const [dailyMenus, setDailyMenus] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [ticketStats, setTicketStats] = useState({ sold: 0, revenue: 0 });

  const fetchStats = async () => {
    try {
      const data = await AdminTicketsService.getDashboard();
      setTicketStats({
        sold: data?.stats?.sold || 0,
        revenue: data?.stats?.revenue || 0,
      });
    } catch (error) {
      console.error("Failed to fetch stats", error);
    }
  };

  const refreshMenus = async () => {
    try {
      const today = getTodayISODateLocal();
      const menus = await MenuService.getDailyMenus(today);
      setDailyMenus(Array.isArray(menus) ? menus : []);
    } catch (error) {
      console.error("Failed to fetch daily menu", error);
      setDailyMenus([]);
    }
  };

  useEffect(() => {
    refreshMenus();
    fetchStats();
  }, []);

  const fetchPendingCount = async () => {
    try {
      const res = await apiClient.get("/admin/students/pending");
      setPendingCount(Array.isArray(res.data.students) ? res.data.students.length : 0);
    } catch {
      setPendingCount(0);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchPendingCount();
      fetchStats();
      return () => {};
    }, [])
  );

  const menuItems = [
    { id: 1, title: "Gestion Tickets", icon: "wallet-outline", route: "GestionTickets" },
    { id: 2, title: "Scanner", icon: "scan-outline", route: "Scanner" },
    { id: 3, title: "Menus", icon: "restaurant-outline", route: "Plats", params: { initialTab: "Plats" } },
    { id: 4, title: "Plannings", icon: "calendar-outline", route: "Plats", params: { initialTab: "Planning" } },
    { id: 5, title: "Reservations", icon: "bookmarks-outline", route: "reservation" },
    { id: 6, title: "Cuisine", icon: "layers-outline", route: "Cuisine" },
    { id: 7, title: "Feedbacks", icon: "chatbubble-ellipses-outline", route: "Feedbacks" },
    { id: 8, title: "Profil", icon: "person-outline", route: "AdminProfile" },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.primary} />

      <View style={styles.header}>
        <View>
          <Text style={styles.dateText}>{currentDate}</Text>
          <Text style={styles.greetingText}>Bonjour, Admin</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate("Notifications")}>
            <Ionicons name="notifications-outline" size={24} color={Colors.text} />
            {pendingCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="ticket-outline" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.statNumber}>{ticketStats.sold}</Text>
            <Text style={styles.statLabel}>Tickets vendus</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: "#E8D7C7" }]}>
              <Ionicons name="cash-outline" size={24} color={Colors.text} />
            </View>
            <Text style={styles.statNumber}>
              {ticketStats.revenue.toFixed(Number.isInteger(ticketStats.revenue) ? 0 : 2)} DT
            </Text>
            <Text style={styles.statLabel}>Revenus</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Menu du jour</Text>
        {dailyMenus.length > 0 ? (
          dailyMenus.map((menu, index) => {
            const typeLabel = String(menu.typeMenu || "normal").toLowerCase();

            return (
              <View key={menu._id || index} style={styles.menuCard}>
                <View style={styles.menuHeader}>
                  <View style={styles.menuTitleWrap}>
                    <View style={styles.menuIconBadge}>
                      <Ionicons name="restaurant-outline" size={18} color="#8D6E54" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.menuTitle}>{formatMealLabel(menu.repas)}</Text>
                      <Text style={styles.menuSubtitle}>{menu.creneau || "Creneau non defini"}</Text>
                    </View>
                  </View>

                  <View style={styles.menuHeaderActions}>
                    <View style={styles.menuTypeBadge}>
                      <Text style={styles.menuTypeText}>{formatTypeLabel(menu.typeMenu)}</Text>
                    </View>
                    {typeLabel !== "normal" && (
                      <TouchableOpacity
                        onPress={async () => {
                          try {
                            await MenuService.deleteMenu(menu._id);
                            await refreshMenus();
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                        style={styles.menuDeleteBtn}
                      >
                        <Ionicons name="trash-outline" size={18} color="#B85C5C" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View style={styles.menuContent}>
                  <View style={styles.menuInfoRow}>
                    <View style={styles.menuInfoItem}>
                      <Text style={styles.menuInfoLabel}>Entree</Text>
                      <Text style={styles.menuInfoValue}>{findPlatByType(menu, "entree")}</Text>
                    </View>
                    <View style={styles.menuInfoItem}>
                      <Text style={styles.menuInfoLabel}>Plat</Text>
                      <Text style={styles.menuInfoValue}>{findPlatByType(menu, "plat")}</Text>
                    </View>
                  </View>

                  <View style={styles.menuDivider} />

                  <View style={styles.menuInfoItem}>
                    <Text style={styles.menuInfoLabel}>Dessert</Text>
                    <Text style={styles.menuInfoValue}>{findPlatByType(menu, "dessert")}</Text>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyMenuCard}>
            <Ionicons name="cafe-outline" size={38} color="#A89B8D" />
            <Text style={styles.emptyMenuText}>Pas de menu pour aujourd hui</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Acces rapide</Text>
        <View style={styles.gridContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.gridItem}
              onPress={() => navigation.navigate(item.route, item.params)}
            >
              <View style={styles.iconContainer}>
                <Ionicons name={item.icon} size={28} color={Colors.text} />
              </View>
              <Text style={styles.gridLabel}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <BottomTabs />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  iconBtn: {
    position: "relative",
    padding: 5,
  },
  badge: {
    position: "absolute",
    top: 5,
    right: 5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#D86C6C",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
  },
  dateText: {
    fontSize: 14,
    color: Colors.text,
    opacity: 0.7,
    textTransform: "capitalize",
  },
  greetingText: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
  },
  profileIcon: {
    padding: 5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#D9B99B",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text,
    opacity: 0.8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 15,
  },
  menuCard: {
    backgroundColor: "#FFFDF9",
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E9DED1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  menuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  menuTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#F4E9DE",
    justifyContent: "center",
    alignItems: "center",
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: Colors.text,
  },
  menuSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#8B7867",
    fontWeight: "600",
  },
  menuHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  menuTypeBadge: {
    backgroundColor: "#F5EEE6",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#E7DACC",
  },
  menuTypeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#7A6552",
  },
  menuDeleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F9E4E4",
    justifyContent: "center",
    alignItems: "center",
  },
  menuContent: {
    backgroundColor: "#FCF7F1",
    borderRadius: 18,
    padding: 14,
  },
  menuInfoRow: {
    flexDirection: "row",
    gap: 12,
  },
  menuInfoItem: {
    flex: 1,
  },
  menuInfoLabel: {
    fontSize: 12,
    color: "#9A8675",
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  menuInfoValue: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: "700",
    lineHeight: 21,
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#E8DED3",
    marginVertical: 12,
  },
  emptyMenuCard: {
    backgroundColor: "#FFFDF9",
    borderRadius: 24,
    padding: 28,
    marginBottom: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8DDD1",
  },
  emptyMenuText: {
    marginTop: 10,
    fontSize: 15,
    color: "#8F8070",
    fontWeight: "600",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 15,
  },
  gridItem: {
    width: "47%",
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
    marginBottom: 10,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  gridLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
});
