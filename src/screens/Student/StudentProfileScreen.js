import React, { useCallback, useState } from "react";
import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Colors from "../../constants/Colors";
import StudentBottomTabs from "../../navigation/StudentBottomTabs";
import StudentAuthService from "../../services/StudentAuthService";
import { getImageUri } from "../../utils/image";

function initialsFromStudent(student) {
  const first = String(student?.firstName || "").trim().charAt(0);
  const last = String(student?.lastName || "").trim().charAt(0);
  return `${first}${last}`.toUpperCase() || "ET";
}

function formatFullName(student) {
  const full = `${student?.firstName || ""} ${student?.lastName || ""}`.trim();
  return full || "Etudiant";
}

function getStudentCardUri(student) {
  if (!student?.cardImage) return null;
  if (String(student.cardImage).startsWith("/uploads/")) {
    return getImageUri(student.cardImage);
  }
  return getImageUri(`/uploads/${student.cardImage}`);
}

function InfoCard({ icon, label, value }) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color="#5D7F79" />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "—"}</Text>
    </View>
  );
}

function ActionRow({ icon, title, subtitle, onPress, danger }) {
  return (
    <TouchableOpacity style={styles.actionRow} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.actionIcon, danger && styles.actionIconDanger]}>
        <Ionicons name={icon} size={18} color={danger ? "#A64545" : "#5D7F79"} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.actionTitle, danger && styles.actionTitleDanger]}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#B1A298" />
    </TouchableOpacity>
  );
}

export default function StudentProfileScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [student, setStudent] = useState(null);

  const loadProfile = useCallback(async (mode = "load") => {
    try {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      const res = await StudentAuthService.me();
      setStudent(res?.student || null);
    } catch {
      setStudent(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const totalTickets = student?.soldeTickets ?? 0;
  const blockedTickets = student?.blockedTickets ?? 0;
  const availableTickets = Math.max(0, totalTickets - blockedTickets);
  const studentCardUri = getStudentCardUri(student);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadProfile("refresh")} tintColor="#87BDB2" />}
      >
        <LinearGradient colors={["#E9DDD2", "#D7EAE5"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroTop}>
            <Text style={styles.heroEyebrow}>Profil etudiant</Text>
            <TouchableOpacity style={styles.heroBtn} onPress={() => navigation.navigate("StudentHome")}>
              <Ionicons name="home-outline" size={20} color="#5E4A43" />
            </TouchableOpacity>
          </View>

          <View style={styles.identityRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initialsFromStudent(student)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroName}>{formatFullName(student)}</Text>
              <Text style={styles.heroMeta}>{student?.email || "Compte etudiant"}</Text>
              <View style={styles.metaPills}>
                <View style={styles.metaPill}>
                  <Ionicons name="school-outline" size={14} color="#5D7F79" />
                  <Text style={styles.metaPillText}>{student?.studentNumber || "Matricule indisponible"}</Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.ticketPanel}>
          <View style={styles.ticketHeader}>
            <Text style={styles.sectionTitle}>Portefeuille tickets</Text>
            <TouchableOpacity style={styles.smallAction} onPress={() => navigation.navigate("StudentWallet")}>
              <Text style={styles.smallActionText}>Recharger</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.ticketStats}>
            <View style={styles.ticketCard}>
              <Text style={styles.ticketNumber}>{availableTickets}</Text>
              <Text style={styles.ticketLabel}>Disponibles</Text>
            </View>
            <View style={styles.ticketCard}>
              <Text style={styles.ticketNumber}>{blockedTickets}</Text>
              <Text style={styles.ticketLabel}>Bloques</Text>
            </View>
            <View style={styles.ticketCard}>
              <Text style={styles.ticketNumber}>{totalTickets}</Text>
              <Text style={styles.ticketLabel}>Total</Text>
            </View>
          </View>
        </View>

        <View style={styles.grid}>
          <InfoCard icon="mail-outline" label="Email" value={student?.email} />
          <InfoCard icon="call-outline" label="Telephone" value={student?.phone || student?.telephone} />
          <InfoCard icon="id-card-outline" label="Matricule" value={student?.studentNumber} />
          <InfoCard icon="person-outline" label="Prenom" value={student?.firstName} />
          <InfoCard icon="school-outline" label="Universite" value={student?.university} />
          <InfoCard icon="ribbon-outline" label="Niveau" value={student?.level} />
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Carte etudiante</Text>
          {studentCardUri ? (
            <Image source={{ uri: studentCardUri }} style={styles.studentCardImage} resizeMode="cover" />
          ) : (
            <View style={styles.cardPlaceholder}>
              <Ionicons name="image-outline" size={22} color="#8E7C71" />
              <Text style={styles.cardPlaceholderText}>Carte etudiante indisponible</Text>
            </View>
          )}
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Raccourcis</Text>
          <ActionRow
            icon="bag-handle-outline"
            title="Commandes"
            subtitle="Suivre vos commandes et leur statut en cuisine"
            onPress={() => navigation.navigate("StudentOrders")}
          />
          <ActionRow
            icon="calendar-clear-outline"
            title="Mes reservations"
            subtitle="Voir vos reservations, QR et historique"
            onPress={() => navigation.navigate("StudentReservations")}
          />
          <ActionRow
            icon="card-outline"
            title="Mon portefeuille"
            subtitle="Consulter et recharger les tickets"
            onPress={() => navigation.navigate("StudentWallet")}
          />
          <ActionRow
            icon="restaurant-outline"
            title="Menus"
            subtitle="Parcourir les menus disponibles"
            onPress={() => navigation.navigate("StudentMenu")}
          />
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Compte</Text>
          <ActionRow
            icon="log-out-outline"
            title="Deconnexion"
            subtitle="Quitter la session et revenir a l accueil"
            danger
            onPress={async () => {
              await StudentAuthService.logout();
              navigation.reset({
                index: 0,
                routes: [{ name: "Welcome" }],
              });
            }}
          />
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#87BDB2" />
            <Text style={styles.loadingText}>Chargement du profil...</Text>
          </View>
        ) : null}
      </ScrollView>
      <StudentBottomTabs />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F0E9" },
  content: { paddingBottom: 126 },
  hero: { paddingTop: 28, paddingHorizontal: 18, paddingBottom: 28, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroEyebrow: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", color: "#7B685E", letterSpacing: 1 },
  heroBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.65)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.9)" },
  identityRow: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 22 },
  avatar: { width: 82, height: 82, borderRadius: 28, backgroundColor: "#FFF8F3", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#EFE2D7" },
  avatarText: { fontSize: 28, fontWeight: "900", color: "#5E4A43" },
  heroName: { fontSize: 24, fontWeight: "900", color: "#44352F" },
  heroMeta: { marginTop: 4, color: "#6E5E55", fontWeight: "600" },
  metaPills: { flexDirection: "row", gap: 8, marginTop: 10 },
  metaPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.72)", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: "#E6DBD2" },
  metaPillText: { color: "#5A716D", fontWeight: "700", fontSize: 12 },
  ticketPanel: { marginHorizontal: 16, marginTop: -18, backgroundColor: "#FFFDFC", borderRadius: 24, padding: 16, borderWidth: 1, borderColor: "#EDE1D8", shadowColor: "#BDA999", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  ticketHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: "#42342E" },
  smallAction: { backgroundColor: "#E8F4F1", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  smallActionText: { color: "#547A72", fontWeight: "800", fontSize: 12 },
  ticketStats: { flexDirection: "row", gap: 10 },
  ticketCard: { flex: 1, backgroundColor: "#F8F2ED", borderRadius: 18, paddingVertical: 16, alignItems: "center", borderWidth: 1, borderColor: "#EEE2D9" },
  ticketNumber: { fontSize: 24, fontWeight: "900", color: "#5A716D" },
  ticketLabel: { marginTop: 5, color: "#8B7A70", fontWeight: "700", fontSize: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16, marginTop: 14 },
  infoCard: { width: "48%", backgroundColor: "#FFFDFC", borderRadius: 20, padding: 14, borderWidth: 1, borderColor: "#EDE1D8" },
  infoIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#EAF5F2", alignItems: "center", justifyContent: "center" },
  infoLabel: { marginTop: 10, fontSize: 12, fontWeight: "800", color: "#8E7C71", textTransform: "uppercase" },
  infoValue: { marginTop: 6, fontSize: 14, fontWeight: "800", color: "#453732" },
  sectionBlock: { marginHorizontal: 16, marginTop: 14, backgroundColor: "#FFFDFC", borderRadius: 24, padding: 16, borderWidth: 1, borderColor: "#EDE1D8" },
  studentCardImage: { width: "100%", height: 190, marginTop: 14, borderRadius: 18, borderWidth: 1, borderColor: "#EEE2D9", backgroundColor: "#F8F2ED" },
  cardPlaceholder: { marginTop: 14, minHeight: 120, borderRadius: 18, borderWidth: 1, borderColor: "#EEE2D9", backgroundColor: "#FAF5F1", alignItems: "center", justifyContent: "center", gap: 8, padding: 16 },
  cardPlaceholderText: { color: "#8A7A70", fontSize: 13, fontWeight: "700" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FAF5F1", borderRadius: 18, padding: 14, marginTop: 12, borderWidth: 1, borderColor: "#EEE2D9" },
  actionIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: "#EAF5F2", alignItems: "center", justifyContent: "center" },
  actionIconDanger: { backgroundColor: "#F8ECEC" },
  actionTitle: { fontSize: 15, fontWeight: "800", color: "#42342E" },
  actionTitleDanger: { color: "#8E3C3C" },
  actionSubtitle: { marginTop: 4, color: "#8A7A70", fontSize: 12, fontWeight: "600" },
  loadingWrap: { alignItems: "center", paddingVertical: 28 },
  loadingText: { marginTop: 8, color: "#7D6C62", fontWeight: "700" },
});
