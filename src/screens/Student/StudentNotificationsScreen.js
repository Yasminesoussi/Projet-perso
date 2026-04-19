import React, { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import StudentBottomTabs from "../../navigation/StudentBottomTabs";
import StudentNotificationsService from "../../services/StudentNotificationsService";

function timeAgo(dateValue) {
  const when = new Date(dateValue).getTime();
  const diff = Math.max(0, Date.now() - when);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "A l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days} j`;
}

function NotificationCard({ item, showDelete, onLongPress, onDelete, onPress, onActionPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onLongPress={onLongPress}
      onPress={onPress}
      delayLongPress={260}
    >
      <View style={[styles.notificationCard, !item.read && styles.notificationCardUnread, showDelete && styles.notificationCardSelected]}>
        <View style={[styles.notificationIcon, { backgroundColor: item.bg }]}>
          <Ionicons name={item.icon} size={20} color={item.tint} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.notificationTopRow}>
            <Text style={styles.notificationTitle}>{item.title}</Text>
            {!item.read ? <View style={styles.unreadDot} /> : null}
          </View>
          <Text style={styles.notificationBody}>{item.body}</Text>
          <Text style={styles.notificationTime}>{timeAgo(item.createdAt)}</Text>
          {item.actionLabel ? (
            <TouchableOpacity style={styles.actionBtn} onPress={onActionPress} activeOpacity={0.88}>
              <Text style={styles.actionBtnText}>{item.actionLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {showDelete ? (
          <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.85}>
            <Ionicons name="trash-outline" size={20} color="#D62839" />
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function StudentNotificationsScreen() {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const loadNotifications = useCallback(async (mode = "load") => {
    try {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);

      const items = await StudentNotificationsService.list();
      setNotifications(items);
      setDeleteTargetId(null);
      await StudentNotificationsService.markAllAsRead(items);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const handleDeleteNotification = useCallback(async (id) => {
    try {
      await StudentNotificationsService.dismiss(id);
      setNotifications((current) => current.filter((item) => item.id !== id));
      setDeleteTargetId(null);
    } catch {
      setDeleteTargetId(null);
    }
  }, []);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadNotifications("refresh")} tintColor="#7FB9AA" />}
      >
        <LinearGradient colors={["#E8DED2", "#DCEEE6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroEyebrow}>Notifications</Text>
              <Text style={styles.heroTitle}>Toutes vos mises a jour etudiant</Text>
            </View>
            <TouchableOpacity style={styles.heroBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={20} color="#4C3F38" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recentes</Text>
            <Text style={styles.sectionRight}>{notifications.length} notification{notifications.length > 1 ? "s" : ""}</Text>
          </View>

          {notifications.map((item) => (
            <NotificationCard
              key={item.id}
              item={item}
              showDelete={deleteTargetId === item.id}
              onLongPress={() => setDeleteTargetId(item.id)}
              onPress={() => {
                if (deleteTargetId === item.id) {
                  setDeleteTargetId(null);
                  return;
                }
                if (item.actionRoute) {
                  navigation.navigate(item.actionRoute);
                }
              }}
              onActionPress={() => item.actionRoute ? navigation.navigate(item.actionRoute) : null}
              onDelete={() => handleDeleteNotification(item.id)}
            />
          ))}

          {!loading && notifications.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="notifications-off-outline" size={26} color="#8B7A70" />
              <Text style={styles.emptyTitle}>Aucune notification</Text>
              <Text style={styles.emptyText}>Les nouvelles informations sur vos commandes et menus apparaitront ici.</Text>
            </View>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#6B4EFF" />
            <Text style={styles.loadingText}>Chargement des notifications...</Text>
          </View>
        ) : null}
      </ScrollView>
      <StudentBottomTabs />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F0E9" },
  content: { paddingBottom: 146 },
  hero: { paddingTop: 28, paddingHorizontal: 16, paddingBottom: 28, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  heroEyebrow: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", color: "#7B685E", letterSpacing: 1 },
  heroTitle: { marginTop: 8, fontSize: 28, lineHeight: 34, fontWeight: "900", color: "#3F322D", maxWidth: 260 },
  heroBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.72)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.95)" },
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: "#40332D" },
  sectionRight: { fontSize: 12, color: "#7A6A61", fontWeight: "700" },
  notificationCard: { flexDirection: "row", gap: 12, backgroundColor: "#FFFDFC", borderRadius: 22, borderWidth: 1, borderColor: "#E8DDD5", padding: 16, marginBottom: 12 },
  notificationCardUnread: {
    backgroundColor: "#F3EEFF",
    borderColor: "#D8CCE4",
    shadowColor: "#BCA7C8",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  notificationCardSelected: {
    borderColor: "#E7B6BC",
    backgroundColor: "#FFF7F8",
  },
  notificationIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  notificationTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  notificationTitle: { flex: 1, fontSize: 15, fontWeight: "900", color: "#433631" },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#E53935" },
  notificationBody: { marginTop: 5, color: "#6D615A", fontSize: 13, lineHeight: 19, fontWeight: "600" },
  notificationTime: { marginTop: 8, color: "#96877F", fontSize: 11, fontWeight: "700" },
  actionBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F1E7DA",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: {
    color: "#5B4639",
    fontWeight: "800",
    fontSize: 12,
  },
  deleteBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    marginLeft: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFECEE",
    borderWidth: 1,
    borderColor: "#FFD2D8",
  },
  emptyCard: { backgroundColor: "#FFFDFC", borderRadius: 22, padding: 22, borderWidth: 1, borderColor: "#E8DDD5", alignItems: "center" },
  emptyTitle: { marginTop: 10, fontSize: 16, fontWeight: "900", color: "#433631" },
  emptyText: { marginTop: 6, color: "#84756D", fontSize: 13, lineHeight: 20, textAlign: "center", fontWeight: "600" },
  loadingWrap: { alignItems: "center", paddingVertical: 24 },
  loadingText: { marginTop: 8, color: "#7B6B63", fontWeight: "700" },
});
