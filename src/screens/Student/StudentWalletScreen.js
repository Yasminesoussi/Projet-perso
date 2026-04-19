// Screen “Mon portefeuille”: UI d’achat de packs + solde, appels via services
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Modal, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "../../constants/Colors";
import { useNavigation } from "@react-navigation/native";
import StudentBottomTabs from "../../navigation/StudentBottomTabs";
import PackService from "../../services/PackService";
import StudentAuthService from "../../services/StudentAuthService";

export default function StudentWalletScreen() {
  const navigation = useNavigation();
  const [activePackId, setActivePackId] = useState(null);
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [paymentVisible, setPaymentVisible] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const data = await PackService.getAllPacks();
        setPacks(Array.isArray(data) ? data : []);
      } catch (e) {
        setPacks([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);
  useEffect(() => {
    const loadMe = async () => {
      try {
        const me = await StudentAuthService.me();
        const b = me?.student?.soldeTickets ?? 0;
        setBalance(b);
      } catch {}
    };
    loadMe();
  }, []);

  const [history, setHistory] = useState([
    { id: "h2", type: "Utilisation", info: "Déjeuner", date: "21 Fév 2026", amount: "-1 🎫" },
    { id: "h3", type: "Utilisation", info: "Dîner", date: "20 Fév 2026", amount: "-1 🎫" }
  ]);

  const selectedPack = packs.find(p => (p._id || p.id) === activePackId);
  const formatNow = () => {
    const d = new Date();
    const day = d.toLocaleDateString("fr-FR", { day: "2-digit" });
    const month = d.toLocaleDateString("fr-FR", { month: "short" });
    const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    return `${day} ${month.charAt(0).toUpperCase() + month.slice(1)} - ${time}`;
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#d7c9bb", "#b9a892"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Portefeuille</Text>
          <View style={{ width: 22 }} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.balanceCard}>
          <View style={styles.balanceLeft}>
            <Text style={styles.balanceTitle}>Solde tickets</Text>
            <Text style={styles.balanceValue}>{balance} 🎫</Text>
            <Text style={styles.balanceNote}>1 ticket = 1 menu complet</Text>
          </View>
          <TouchableOpacity style={styles.balanceAction}>
            <Ionicons name="reload" size={18} color="#fff" />
            <Text style={styles.balanceActionText}>Recharger</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Acheter des tickets</Text>

        {loading ? (
          <View style={{ paddingVertical: 20, alignItems: "center" }}>
            <ActivityIndicator size="large" color={Colors.text} />
            <Text style={{ marginTop: 10, color: Colors.text, opacity: 0.7 }}>Chargement des packs…</Text>
          </View>
        ) : (
          <View style={styles.packsContainer}>
            {Array.isArray(packs) && packs.length > 0 ? (
              packs.map((p) => {
                const pid = p._id || p.id;
                const active = activePackId === pid;
                return (
                  <TouchableOpacity key={pid} style={[styles.packCard, active && styles.packActive]} onPress={() => setActivePackId(pid)} activeOpacity={0.8}>
                    <View style={styles.packIcon}>
                      <Ionicons name="ticket-outline" size={20} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.packName}>{p.nom}</Text>
                      <Text style={styles.packDetail}>{p.nbTickets} tickets • {p.prix} DT</Text>
                      {!!p.description && <Text style={styles.packDesc}>{p.description}</Text>}
                    </View>
                    <View style={styles.packPricePill}>
                      <Text style={styles.packPriceText}>{p.prix} DT</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={{ color: Colors.text, opacity: 0.6 }}>Aucun pack disponible.</Text>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, !selectedPack && { opacity: 0.6 }]}
          disabled={!selectedPack}
          onPress={() => setPaymentVisible(true)}
        >
          <Text style={styles.primaryText}>Procéder au paiement</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Historique</Text>
        <View style={styles.historyList}>
          {history.map((h) => (
            <View key={h.id} style={styles.historyItem}>
              <View style={styles.historyLeft}>
                <View style={[styles.historyIcon, h.type === "Achat" ? { backgroundColor: "#4caf50" } : { backgroundColor: "#9575cd" }]}>
                  <Ionicons name={h.type === "Achat" ? "cart-outline" : "restaurant-outline"} size={16} color="#fff" />
                </View>
                <View>
                  <Text style={styles.historyTitle}>{h.type}</Text>
                  <Text style={styles.historySub}>{h.info}</Text>
                </View>
              </View>
              <View style={styles.historyRight}>
                <Text style={styles.historyAmount}>{h.amount}</Text>
                <Text style={styles.historyDate}>{h.date}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal visible={paymentVisible} transparent animationType="slide" onRequestClose={() => setPaymentVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Paiement</Text>
              <TouchableOpacity onPress={() => setPaymentVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            {selectedPack ? (
              <>
                <Text style={styles.modalLine}>{selectedPack.nom}</Text>
                <Text style={[styles.modalLine, { opacity: 0.7 }]}>{selectedPack.nbTickets} tickets • {selectedPack.prix} DT</Text>
                {!!selectedPack.description && <Text style={[styles.modalLine, { marginTop: 6 }]}>{selectedPack.description}</Text>}
                <View style={{ height: 14 }} />
                <TouchableOpacity
                  style={styles.payBtn}
                  onPress={async () => {
                    try {
                      const nb = selectedPack.nbTickets || 0;
                      const res = await StudentAuthService.creditWallet(nb);
                      const newBal = res?.soldeTickets ?? (balance + nb);
                      setPaymentVisible(false);
                      setBalance(newBal);
                      setHistory(h => [
                        { id: `hx${Date.now()}`, type: "Achat", info: selectedPack.nom, date: formatNow(), amount: `+${nb} 🎫` },
                        ...h
                      ]);
                      Alert.alert("Paiement simulé", "Pack acheté avec succès");
                    } catch {
                      Alert.alert("Erreur", "Impossible de mettre à jour le solde");
                    }
                  }}
                >
                  <Ionicons name="card-outline" size={18} color="#fff" />
                  <Text style={styles.payBtnText}>Confirmer le paiement</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.modalLine}>Aucun pack sélectionné</Text>
            )}
          </View>
        </View>
      </Modal>
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

  balanceCard: { backgroundColor: "#fff", borderRadius: 20, padding: 16, marginTop: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", elevation: 3 },
  balanceLeft: {},
  balanceTitle: { color: Colors.text, opacity: 0.7 },
  balanceValue: { fontSize: 24, fontWeight: "900", color: Colors.text, marginVertical: 2 },
  balanceNote: { fontSize: 12, color: Colors.text, opacity: 0.6 },
  balanceAction: { flexDirection: "row", alignItems: "center", backgroundColor: "#8b7763", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, gap: 8 },
  balanceActionText: { color: "#fff", fontWeight: "800" },

  sectionTitle: { fontSize: 14, fontWeight: "800", color: Colors.text, marginVertical: 14 },

  packsContainer: { gap: 10 },
  packCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#f9f7f4", borderRadius: 16, padding: 12, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  packActive: { borderWidth: 2, borderColor: "#cbbba7", backgroundColor: "#fff" },
  packIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#b79273", justifyContent: "center", alignItems: "center", marginRight: 12 },
  packName: { fontSize: 16, fontWeight: "700", color: Colors.text },
  packDetail: { fontSize: 12, color: Colors.text, opacity: 0.7 },
  packDesc: { fontSize: 12, color: Colors.text, opacity: 0.8, marginTop: 2 },
  packPricePill: { backgroundColor: "#e7f8ee", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  packPriceText: { color: "#2e7d32", fontWeight: "700", fontSize: 12 },

  primaryBtn: { backgroundColor: "#8b7763", borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  primaryText: { color: "#fff", fontWeight: "800" },

  historyList: { gap: 10, marginTop: 6 },
  historyItem: { backgroundColor: "#fff", borderRadius: 16, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  historyLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  historyIcon: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  historyTitle: { fontWeight: "700", color: Colors.text },
  historySub: { fontSize: 12, color: Colors.text, opacity: 0.7 },
  historyRight: { alignItems: "flex-end" },
  historyAmount: { fontWeight: "800", color: Colors.text },
  historyDate: { fontSize: 12, color: Colors.text, opacity: 0.7 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 16, fontWeight: "800", color: Colors.text },
  modalLine: { color: Colors.text },
  payBtn: { marginTop: 14, backgroundColor: "#8b7763", borderRadius: 14, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  payBtnText: { color: "#fff", fontWeight: "800" }
});
