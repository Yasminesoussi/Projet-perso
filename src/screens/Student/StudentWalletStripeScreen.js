// Version Stripe du portefeuille etudiant.
// Elle utilise PaymentSheet pour acheter un pack puis recharge l'historique depuis le backend.

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import Colors from "../../constants/Colors";
import StudentBottomTabs from "../../navigation/StudentBottomTabs";
import PackService from "../../services/PackService";
import StudentAuthService from "../../services/StudentAuthService";
import PackPaymentService from "../../services/PackPaymentService";
import { useStripe, isStripeSupported } from "../../lib/stripe";
import { STRIPE_PUBLISHABLE_KEY } from "../../config/stripe";

const STATUS_META = {
  SUCCEEDED: { label: "Confirme", tint: "#1F8F63", bg: "#E5F7EF", icon: "checkmark-circle-outline" },
  PROCESSING: { label: "En cours", tint: "#A26A1A", bg: "#FFF4DE", icon: "time-outline" },
  FAILED: { label: "Echoue", tint: "#C44848", bg: "#FDEBEC", icon: "close-circle-outline" },
  CANCELED: { label: "Annule", tint: "#6C6F7D", bg: "#EEF0F3", icon: "ban-outline" },
  PENDING: { label: "En attente", tint: "#6B5A4B", bg: "#F7F1EA", icon: "sync-outline" },
};

function formatPackPrice(amount) {
  const numeric = Number(amount || 0);
  return `${numeric.toFixed(Number.isInteger(numeric) ? 0 : 2)} DT`;
}

function formatStripeAmount(amount, currency) {
  const numeric = Number(amount || 0);
  const code = String(currency || "eur").toUpperCase();
  return `${numeric.toFixed(Number.isInteger(numeric) ? 0 : 2)} ${code}`;
}

function formatHistoryDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStripeUnavailableMessage() {
  if (!STRIPE_PUBLISHABLE_KEY) {
    return "Ajoute EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY dans la config Expo pour activer Stripe.";
  }
  if (!isStripeSupported) {
    return "Le paiement Stripe in-app fonctionne sur Android et iOS. Pour le web, il faudra un flux Stripe Web separe.";
  }
  return null;
}

export default function StudentWalletStripeScreen() {
  const navigation = useNavigation();
  const { initPaymentSheet, presentPaymentSheet, resetPaymentSheetCustomer } = useStripe();
  const [activePackId, setActivePackId] = useState(null);
  const [packs, setPacks] = useState([]);
  const [balance, setBalance] = useState(0);
  const [studentProfile, setStudentProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const selectedPack = useMemo(
    () => packs.find((pack) => (pack._id || pack.id) === activePackId) || null,
    [packs, activePackId]
  );

  const stripeUnavailableMessage = getStripeUnavailableMessage();

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const [packsData, meData, purchasesData] = await Promise.all([
        PackService.getAllPacks().catch(() => []),
        StudentAuthService.me().catch(() => null),
        PackPaymentService.getHistory().catch(() => []),
      ]);

      const safePacks = Array.isArray(packsData) ? packsData : [];
      setPacks(safePacks);
      if (!activePackId && safePacks.length > 0) {
        setActivePackId(safePacks[0]._id || safePacks[0].id);
      }

      const student = meData?.student || null;
      setStudentProfile(student);
      setBalance(student?.soldeTickets ?? 0);
      setHistory(Array.isArray(purchasesData) ? purchasesData : []);
    } finally {
      setLoading(false);
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadWalletData();
  }, []);

  const refreshBalanceAndHistory = async () => {
    const [meData, purchasesData] = await Promise.all([
      StudentAuthService.me().catch(() => null),
      PackPaymentService.getHistory().catch(() => []),
    ]);

    const student = meData?.student || null;
    setStudentProfile(student);
    setBalance(student?.soldeTickets ?? 0);
    setHistory(Array.isArray(purchasesData) ? purchasesData : []);
  };

  const handleStripePayment = async () => {
    if (!selectedPack) return;

    if (stripeUnavailableMessage) {
      Alert.alert("Paiement Stripe indisponible", stripeUnavailableMessage);
      return;
    }

    try {
      setPaymentLoading(true);
      const preparation = await PackPaymentService.preparePayment(selectedPack._id || selectedPack.id);
      const studentName = [studentProfile?.firstName, studentProfile?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

      await resetPaymentSheetCustomer();

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: preparation?.merchantDisplayName || "Resto Universitaire",
        paymentIntentClientSecret: preparation?.clientSecret,
        allowsDelayedPaymentMethods: false,
        style: "alwaysLight",
        paymentMethodOrder: ["card"],
        link: {
          display: "never",
        },
        defaultBillingDetails: {
          name: studentName || undefined,
        },
      });

      if (initError) {
        throw new Error(initError.message || "Impossible d'initialiser Stripe.");
      }

      const { error: paymentError } = await presentPaymentSheet();
      if (paymentError) {
        if (paymentError.code !== "Canceled") {
          Alert.alert("Paiement interrompu", paymentError.message || "Le paiement a ete arrete.");
        }
        return;
      }

      setPaymentVisible(false);
      let finalPurchase = await PackPaymentService.finalizePayment(preparation?.paymentIntentId);
      if (finalPurchase?.id && finalPurchase.status === "PROCESSING") {
        finalPurchase = await PackPaymentService.waitForFinalStatus(finalPurchase.id, {
          attempts: 7,
          delayMs: 1500,
        });
      }

      await refreshBalanceAndHistory();

      if (finalPurchase?.status === "SUCCEEDED") {
        Alert.alert("Paiement confirme", `${selectedPack.nbTickets} tickets ont ete ajoutes a ton portefeuille.`);
        return;
      }

      if (finalPurchase?.status === "PROCESSING") {
        Alert.alert("Paiement en cours", "Stripe traite encore le paiement. Le solde sera mis a jour des la confirmation.");
        return;
      }

      Alert.alert("Paiement recu", "Le paiement a ete soumis. Le statut final apparaitra dans l'historique.");
    } catch (error) {
      const backendMessage = error?.response?.data?.message;
      Alert.alert(
        "Paiement Stripe indisponible",
        backendMessage || error?.message || "Impossible de lancer le paiement pour ce pack."
      );
    } finally {
      setPaymentLoading(false);
    }
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
        <Text style={styles.headerSub}>Achat de packs et suivi des paiements etudiants</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.balanceCard}>
          <View style={styles.balanceLeft}>
            <Text style={styles.balanceTitle}>Solde tickets</Text>
            <Text style={styles.balanceValue}>{balance} 🎫</Text>
            <Text style={styles.balanceNote}>Chaque ticket donne acces a un menu complet.</Text>
          </View>
          <View style={styles.balanceBadge}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
            <Text style={styles.balanceBadgeText}>Stripe</Text>
          </View>
        </View>

        <View style={styles.infoBanner}>
          <Ionicons
            name={stripeUnavailableMessage ? "alert-circle-outline" : "lock-closed-outline"}
            size={18}
            color={stripeUnavailableMessage ? "#9A6A2F" : "#1F8F63"}
          />
          <Text style={styles.infoBannerText}>
            {stripeUnavailableMessage || "Paiement securise active sur Android et iOS avec Stripe PaymentSheet."}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Choisir un pack</Text>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={Colors.text} />
            <Text style={styles.centerText}>Chargement des packs…</Text>
          </View>
        ) : (
          <View style={styles.packsContainer}>
            {packs.length > 0 ? (
              packs.map((pack) => {
                const packId = pack._id || pack.id;
                const isActive = activePackId === packId;
                return (
                  <TouchableOpacity
                    key={packId}
                    style={[styles.packCard, isActive && styles.packActive]}
                    onPress={() => setActivePackId(packId)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.packIcon}>
                      <Ionicons name="ticket-outline" size={20} color="#fff" />
                    </View>
                    <View style={styles.packBody}>
                      <View style={styles.packTitleRow}>
                        <Text style={styles.packName}>{pack.nom}</Text>
                        {isActive ? (
                          <View style={styles.selectedBadge}>
                            <Text style={styles.selectedBadgeText}>Selectionne</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.packDetail}>{pack.nbTickets} tickets • {formatPackPrice(pack.prix)}</Text>
                      {!!pack.description && <Text style={styles.packDesc}>{pack.description}</Text>}
                    </View>
                    <View style={styles.packPricePill}>
                      <Text style={styles.packPriceText}>{formatPackPrice(pack.prix)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={styles.emptyText}>Aucun pack disponible pour le moment.</Text>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, (!selectedPack || paymentLoading) && styles.primaryBtnDisabled]}
          disabled={!selectedPack || paymentLoading}
          onPress={() => selectedPack && setPaymentVisible(true)}
        >
          {paymentLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="card-outline" size={18} color="#fff" />
              <Text style={styles.primaryText}>Payer le pack selectionne</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Historique des paiements</Text>
        {historyLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="small" color={Colors.text} />
            <Text style={styles.centerText}>Chargement de l'historique…</Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {history.length > 0 ? (
              history.map((purchase) => {
                const statusMeta = STATUS_META[purchase.status] || STATUS_META.PENDING;
                return (
                  <View key={purchase.id} style={styles.historyItem}>
                    <View style={styles.historyLeft}>
                      <View style={[styles.historyIcon, { backgroundColor: statusMeta.bg }]}>
                        <Ionicons name={statusMeta.icon} size={16} color={statusMeta.tint} />
                      </View>
                      <View style={styles.historyTextWrap}>
                        <Text style={styles.historyTitle}>{purchase.pack?.nom || "Pack tickets"}</Text>
                        <Text style={styles.historySub}>
                          {purchase.tickets} tickets • {formatStripeAmount(purchase.amount, purchase.currency)}
                        </Text>
                        <Text style={styles.historyDate}>{formatHistoryDate(purchase.createdAt)}</Text>
                      </View>
                    </View>
                    <View style={[styles.statusChip, { backgroundColor: statusMeta.bg }]}>
                      <Text style={[styles.statusChipText, { color: statusMeta.tint }]}>{statusMeta.label}</Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyText}>Aucun paiement Stripe enregistre pour le moment.</Text>
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={paymentVisible} transparent animationType="slide" onRequestClose={() => setPaymentVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Paiement securise</Text>
                <Text style={styles.modalSubtitle}>Validation du pack avant ouverture de Stripe</Text>
              </View>
              <TouchableOpacity onPress={() => !paymentLoading && setPaymentVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {selectedPack ? (
              <>
                <LinearGradient colors={["#f6eee5", "#ffffff"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.summaryCard}>
                  <View style={styles.summaryTopRow}>
                    <Text style={styles.summaryTitle}>{selectedPack.nom}</Text>
                    <View style={styles.summaryAmountPill}>
                      <Text style={styles.summaryAmountText}>{formatPackPrice(selectedPack.prix)}</Text>
                    </View>
                  </View>
                  <Text style={styles.summaryDescription}>
                    {selectedPack.description || "Pack tickets prete a etre paye avec Stripe."}
                  </Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Tickets ajoutes</Text>
                    <Text style={styles.summaryValue}>{selectedPack.nbTickets} 🎫</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Mode de paiement</Text>
                    <Text style={styles.summaryValue}>Stripe PaymentSheet</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Creditation</Text>
                    <Text style={styles.summaryValue}>Apres confirmation Stripe</Text>
                  </View>
                </LinearGradient>

                <View style={styles.securityNote}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#1F8F63" />
                  <Text style={styles.securityNoteText}>
                    Le solde tickets est mis a jour seulement quand Stripe confirme le paiement.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.payBtn, paymentLoading && styles.primaryBtnDisabled]}
                  disabled={paymentLoading}
                  onPress={handleStripePayment}
                >
                  {paymentLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="card-outline" size={18} color="#fff" />
                      <Text style={styles.payBtnText}>Continuer vers Stripe</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.emptyText}>Aucun pack selectionne.</Text>
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
  header: { paddingTop: 28, paddingHorizontal: 16, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { padding: 6 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.85)", marginTop: 10, fontSize: 12 },
  content: { paddingHorizontal: 16, paddingBottom: 124 },
  balanceCard: {
    marginTop: 16,
    borderRadius: 22,
    backgroundColor: "#fff",
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  balanceLeft: { flex: 1, paddingRight: 12 },
  balanceTitle: { color: Colors.text, opacity: 0.7 },
  balanceValue: { fontSize: 28, fontWeight: "900", color: Colors.text, marginVertical: 4 },
  balanceNote: { fontSize: 12, color: Colors.text, opacity: 0.6 },
  balanceBadge: { backgroundColor: "#8b7763", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  balanceBadgeText: { color: "#fff", fontWeight: "800" },
  infoBanner: { marginTop: 14, borderRadius: 16, backgroundColor: "#fffaf2", borderWidth: 1, borderColor: "#ecdcc7", padding: 12, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  infoBannerText: { flex: 1, color: Colors.text, fontSize: 12, lineHeight: 18 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: Colors.text, marginTop: 18, marginBottom: 12 },
  centerState: { alignItems: "center", justifyContent: "center", paddingVertical: 22 },
  centerText: { marginTop: 10, color: Colors.text, opacity: 0.7 },
  packsContainer: { gap: 12 },
  packCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f7f4",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  packActive: { borderColor: "#cbbba7", backgroundColor: "#fff" },
  packIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#b79273", justifyContent: "center", alignItems: "center", marginRight: 12 },
  packBody: { flex: 1 },
  packTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  packName: { fontSize: 16, fontWeight: "700", color: Colors.text },
  selectedBadge: { backgroundColor: "#f1e4d7", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  selectedBadgeText: { color: "#7a614a", fontSize: 11, fontWeight: "700" },
  packDetail: { fontSize: 12, color: Colors.text, opacity: 0.75, marginTop: 2 },
  packDesc: { fontSize: 12, color: Colors.text, opacity: 0.85, marginTop: 4 },
  packPricePill: { backgroundColor: "#e7f8ee", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 7, marginLeft: 8 },
  packPriceText: { color: "#2e7d32", fontWeight: "700", fontSize: 12 },
  primaryBtn: { marginTop: 16, backgroundColor: "#8b7763", borderRadius: 18, paddingVertical: 15, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  primaryBtnDisabled: { opacity: 0.65 },
  primaryText: { color: "#fff", fontWeight: "800" },
  historyList: { gap: 10 },
  historyItem: { backgroundColor: "#fff", borderRadius: 18, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  historyLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 10 },
  historyIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  historyTextWrap: { flex: 1 },
  historyTitle: { fontWeight: "700", color: Colors.text },
  historySub: { fontSize: 12, color: Colors.text, opacity: 0.7, marginTop: 2 },
  historyDate: { fontSize: 11, color: Colors.text, opacity: 0.55, marginTop: 3 },
  statusChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusChipText: { fontWeight: "700", fontSize: 11 },
  emptyText: { color: Colors.text, opacity: 0.65 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.28)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 18 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: Colors.text },
  modalSubtitle: { marginTop: 3, color: Colors.text, opacity: 0.65, fontSize: 12 },
  summaryCard: { marginTop: 16, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#efe2d3" },
  summaryTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  summaryTitle: { flex: 1, fontSize: 16, fontWeight: "800", color: Colors.text },
  summaryAmountPill: { backgroundColor: "#e9f5ec", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  summaryAmountText: { color: "#1F8F63", fontWeight: "800", fontSize: 12 },
  summaryDescription: { marginTop: 10, color: Colors.text, opacity: 0.75, lineHeight: 18 },
  summaryRow: { marginTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { color: Colors.text, opacity: 0.7 },
  summaryValue: { color: Colors.text, fontWeight: "700" },
  securityNote: { marginTop: 14, flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#f4fbf7", borderRadius: 16, padding: 12 },
  securityNoteText: { flex: 1, color: Colors.text, fontSize: 12, lineHeight: 18 },
  payBtn: { marginTop: 16, backgroundColor: "#8b7763", borderRadius: 16, paddingVertical: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  payBtnText: { color: "#fff", fontWeight: "800" },
});
