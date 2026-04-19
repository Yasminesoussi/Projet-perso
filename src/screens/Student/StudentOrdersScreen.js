import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import StudentBottomTabs from "../../navigation/StudentBottomTabs";
import ReservationService from "../../services/ReservationService";
import StudentOrdersService from "../../services/StudentOrdersService";

const TRACKING_STEPS = [
  { key: "pending", label: "En attente", icon: "receipt-outline" },
  { key: "preparing", label: "Preparation", icon: "restaurant-outline" },
  { key: "ready", label: "Prete", icon: "person-outline" },
  { key: "served", label: "Servie", icon: "checkmark" },
];

function getStatusMeta(status) {
  switch (status) {
    case "pending":
      return { label: "En attente", color: "#A26A1A", bg: "#FFF3DB" };
    case "preparing":
      return { label: "Preparation", color: "#9A5B14", bg: "#FFE7CC" };
    case "ready":
      return { label: "Prete au comptoir", color: "#0E8A57", bg: "#DFF7EA" };
    case "served":
      return { label: "Servie", color: "#3867D6", bg: "#E4ECFF" };
    default:
      return { label: "Suivi", color: "#5D7F79", bg: "#EAF5F2" };
  }
}

function getStatusMessage(status, order) {
  switch (status) {
    case "pending":
      return {
        title: "Commande en attente",
        body: `Votre commande ${order?.code || ""} a bien ete enregistree et attend son passage en cuisine.`.trim(),
      };
    case "preparing":
      return {
        title: "Votre commande est en preparation",
        body: `Le chef prepare actuellement votre commande ${order?.code || ""}.`.trim(),
      };
    case "ready":
      return {
        title: "Votre commande est prete",
        body: `Votre commande ${order?.code || ""} est disponible au comptoir. Code retrait: ${order?.pickupCode || "-"}.`.trim(),
      };
    case "served":
      return {
        title: "Commande servie",
        body: `Votre commande ${order?.code || ""} a ete remise. Confirmez la reception pour la classer dans votre liste de commandes.`.trim(),
      };
    default:
      return {
        title: "Mise a jour commande",
        body: `Votre commande ${order?.code || ""} a ete mise a jour.`.trim(),
      };
  }
}

function getStepState(stepKey, currentStatus) {
  const order = ["pending", "preparing", "ready", "served"];
  const stepIndex = order.indexOf(stepKey);
  const currentIndex = order.indexOf(currentStatus);
  if (stepIndex < currentIndex) return "done";
  if (stepIndex === currentIndex) return "active";
  return "todo";
}

function TrackingStep({ step, state, isLast }) {
  const isDone = state === "done";
  const isActive = state === "active";

  return (
    <View style={styles.stepWrap}>
      <Text style={[styles.stepTime, (isDone || isActive) && styles.stepTimeActive]}>{step.time}</Text>
      <View style={styles.stepVisualRow}>
        <View
          style={[
            styles.stepCircle,
            isDone && styles.stepCircleDone,
            isActive && styles.stepCircleActive,
          ]}
        >
          <Ionicons
            name={isDone ? "checkmark" : step.icon}
            size={18}
            color={isDone || isActive ? "#FFFFFF" : "#786D66"}
          />
        </View>
        {!isLast ? (
          <View
            style={[
              styles.stepLine,
              (isDone || isActive) && styles.stepLineActive,
            ]}
          />
        ) : null}
      </View>
      <View style={[styles.stepLabelBox, (isDone || isActive) && styles.stepLabelBoxActive]}>
        <Text style={[styles.stepLabel, (isDone || isActive) && styles.stepLabelActive]}>{step.label}</Text>
      </View>
    </View>
  );
}

function renderStars(value, onChange) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => onChange(star)} style={styles.starButton} activeOpacity={0.85}>
          <Ionicons name={star <= value ? "star" : "star-outline"} size={24} color={star <= value ? "#F2B94B" : "#C9B8A8"} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function OrderCard({ order, emphasized }) {
  const meta = getStatusMeta(order.status);
  const showUnconfirmedBadge = order.status === "served" && !order.studentConfirmedAt;
  const menuSlotLabel = order?.creneau || "Creneau indisponible";
  const commandDayLabel = order?.createdAt
    ? new Date(order.createdAt).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "--";
  const commandTimeLabel = order?.createdAt
    ? new Date(order.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--";

  return (
    <View style={[styles.orderCard, emphasized && styles.orderCardEmphasized]}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>{order.code}</Text>
          <Text style={styles.orderMeal}>{order.meal}</Text>
        </View>
        <View style={styles.orderHeaderBadges}>
          {showUnconfirmedBadge ? (
            <View style={styles.unconfirmedBadge}>
              <Text style={styles.unconfirmedBadgeText}>Non confirmee</Text>
            </View>
          ) : null}
          <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
            <Text style={[styles.statusBadgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
      </View>

      <View style={styles.orderDatePanel}>
        <View style={styles.orderDateRow}>
          <Ionicons name="time-outline" size={15} color="#6E625B" />
          <Text style={styles.orderDateTitle}>Creneau du menu</Text>
          <Text style={styles.orderDateValue}>{menuSlotLabel}</Text>
        </View>
        <View style={styles.orderDateRow}>
          <Ionicons name="calendar-outline" size={15} color="#6E625B" />
          <Text style={styles.orderDateTitle}>Jour de commande</Text>
          <Text style={styles.orderDateValue}>{commandDayLabel} a {commandTimeLabel}</Text>
        </View>
      </View>

      <Text style={styles.orderSummary}>{order.summary}</Text>

      <View style={styles.orderMetaRow}>
        <Ionicons name="business-outline" size={16} color="#6E625B" />
        <Text style={styles.orderMetaText}>{order.location}</Text>
      </View>

      <View style={styles.orderMetaRow}>
        <Ionicons name="keypad-outline" size={16} color="#6E625B" />
        <Text style={styles.orderMetaText}>Code retrait: {order.pickupCode}</Text>
      </View>

      <View style={styles.orderMetaRow}>
        <Ionicons name="time-outline" size={16} color="#6E625B" />
        <Text style={styles.orderMetaText}>{order.eta}</Text>
      </View>
    </View>
  );
}

export default function StudentOrdersScreen() {
  const navigation = useNavigation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [receiptGuideVisible, setReceiptGuideVisible] = useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackReservationId, setFeedbackReservationId] = useState(null);
  const [feedbackOrderSummary, setFeedbackOrderSummary] = useState(null);
  const [serviceRating, setServiceRating] = useState(0);
  const [mealRating, setMealRating] = useState(0);
  const [ambianceRating, setAmbianceRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const loadOrders = useCallback(async (mode = "load") => {
    try {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);

      const rows = await StudentOrdersService.list();
      setOrders(rows);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders])
  );

  const latestOrder = orders[0] || null;
  const currentOrder = latestOrder && !(latestOrder.status === "served" && latestOrder.studentConfirmedAt)
    ? latestOrder
    : null;
  const historyOrders = currentOrder ? orders.filter((order) => order.id !== currentOrder.id) : orders;
  const currentMeta = getStatusMeta(currentOrder?.status);
  const currentMessage = getStatusMessage(currentOrder?.status, currentOrder);
  const needsReceiptConfirmation = currentOrder?.status === "served" && !currentOrder?.studentConfirmedAt;

  const resetFeedbackModal = useCallback(() => {
    setFeedbackModalVisible(false);
    setFeedbackReservationId(null);
    setFeedbackOrderSummary(null);
    setServiceRating(0);
    setMealRating(0);
    setAmbianceRating(0);
    setFeedbackComment("");
    setSubmittingFeedback(false);
  }, []);

  const handleConfirmReceipt = useCallback(async () => {
    if (!currentOrder?.id || confirming) return;

    try {
      setConfirming(true);
      const confirmedOrder = await StudentOrdersService.confirmReceipt(currentOrder.id);
      if (confirmedOrder?.typeRepas === "surPlace") {
        setReceiptGuideVisible(true);
      } else if (confirmedOrder?.typeRepas === "aEmporter" && confirmedOrder?.reservationId) {
        setFeedbackReservationId(confirmedOrder.reservationId);
        setFeedbackOrderSummary({
          meal: confirmedOrder.meal,
          code: confirmedOrder.code,
          creneau: confirmedOrder.creneau,
        });
        setFeedbackModalVisible(true);
      }
      await loadOrders("refresh");
    } finally {
      setConfirming(false);
    }
  }, [confirming, currentOrder?.id, loadOrders]);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadOrders("refresh")} tintColor="#83B8AA" />}
      >
        <LinearGradient colors={["#E8DED2", "#DCEEE6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroTop}>
            <TouchableOpacity style={styles.heroButton} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={20} color="#4F433D" />
            </TouchableOpacity>
            <Text style={styles.heroTitle}>Suivi commande</Text>
            <View style={styles.heroSpacer} />
          </View>

          <View style={styles.heroCard}>
            {currentOrder ? (
              <>
                <View style={styles.heroCardTop}>
                  <View>
                    <Text style={styles.heroOrderId}>{currentOrder.code}</Text>
                    <Text style={styles.heroOrderMeal}>{currentOrder.meal} - {currentOrder.location}</Text>
                  </View>
                  <View style={[styles.heroStatusBadge, { backgroundColor: currentMeta.bg }]}>
                    <Text style={[styles.heroStatusText, { color: currentMeta.color }]}>{currentMeta.label}</Text>
                  </View>
                </View>

                <View style={styles.stepsRow}>
                  {TRACKING_STEPS.map((step, index) => (
                    <TrackingStep
                      key={step.key}
                      step={{
                        ...step,
                        time: currentOrder?.stepDates?.[step.key] || "--",
                      }}
                      state={getStepState(step.key, currentOrder.status)}
                      isLast={index === TRACKING_STEPS.length - 1}
                    />
                  ))}
                </View>

                <View style={styles.highlightBox}>
                  <View style={styles.highlightIcon}>
                    <Ionicons name="restaurant" size={22} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.highlightTitle}>{currentMessage.title}</Text>
                    <Text style={styles.highlightText}>{currentMessage.body}</Text>
                  </View>
                </View>

                {needsReceiptConfirmation ? (
                  <TouchableOpacity
                    style={[styles.confirmButton, confirming && styles.confirmButtonDisabled]}
                    onPress={handleConfirmReceipt}
                    activeOpacity={0.9}
                    disabled={confirming}
                  >
                    {confirming ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.confirmButtonText}>J'ai bien recu ma commande</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : null}
              </>
            ) : (
              <View style={styles.emptyHero}>
                <View style={styles.emptyHeroArt}>
                  <View style={styles.emptyHeroArtCircle}>
                    <Ionicons name="restaurant-outline" size={34} color="#2A8C60" />
                  </View>
                  <View style={styles.emptyHeroArtBadge}>
                    <Ionicons name="person-outline" size={18} color="#FFFFFF" />
                  </View>
                </View>
                <Text style={styles.emptyHeroTitle}>Suivez vos commandes</Text>
                <Text style={styles.emptyHeroText}>
                  Vos commandes en cours seront repertoriees ici
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {currentOrder ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Commande en cours</Text>
              <Text style={styles.sectionLink}>Statut en direct</Text>
            </View>
            <OrderCard order={currentOrder} emphasized />
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Liste des commandes</Text>
            <Text style={styles.sectionLink}>{orders.length} suivis</Text>
          </View>

          {historyOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}

          {!loading && !historyOrders.length && !currentOrder ? (
            <View style={styles.emptyList}>
              <Ionicons name="receipt-outline" size={24} color="#8A7A70" />
              <Text style={styles.emptyListTitle}>Aucune commande trouvee</Text>
              <Text style={styles.emptyListText}>Scannez votre reservation ou passez par le parcours cuisine pour voir vos commandes ici.</Text>
            </View>
          ) : null}

          {!loading && !historyOrders.length && currentOrder ? (
            <View style={styles.emptyList}>
              <Ionicons name="time-outline" size={24} color="#8A7A70" />
              <Text style={styles.emptyListTitle}>Pas encore d'historique</Text>
              <Text style={styles.emptyListText}>Votre commande active est suivie ci-dessus. Les commandes terminees apparaitront ensuite ici.</Text>
            </View>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#22B455" />
            <Text style={styles.loadingText}>Chargement des commandes...</Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={receiptGuideVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReceiptGuideVisible(false)}
      >
        <View style={styles.guideOverlay}>
          <View style={styles.guideCard}>
            <View style={styles.guideBadge}>
              <Ionicons name="restaurant-outline" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.guideTitle}>Bon appetit</Text>
            <Text style={styles.guideText}>
              Quand vous aurez termine, vous pourrez quitter le resto depuis votre reservation.
            </Text>
            <View style={styles.guideActions}>
              <TouchableOpacity style={styles.guideSecondaryBtn} onPress={() => setReceiptGuideVisible(false)}>
                <Text style={styles.guideSecondaryText}>Plus tard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.guidePrimaryBtn}
                onPress={() => {
                  setReceiptGuideVisible(false);
                  navigation.navigate("StudentReservations");
                }}
              >
                <Text style={styles.guidePrimaryText}>Voir ma reservation</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={feedbackModalVisible}
        transparent
        animationType="fade"
        onRequestClose={resetFeedbackModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.feedbackModalCard}>
            <LinearGradient colors={["#F4E8DA", "#E2F1EB"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.feedbackHeader}>
              <View style={styles.feedbackBadge}>
                <Ionicons name="chatbubble-ellipses-outline" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.feedbackTitle}>Votre avis nous interesse</Text>
              <Text style={styles.feedbackSubtitle}>
                Dites-nous comment s'est passe le retrait de votre commande a emporter.
              </Text>
            </LinearGradient>

            <View style={styles.feedbackBody}>
              <View style={styles.feedbackSummary}>
                <Text style={styles.feedbackSummaryMeal}>{feedbackOrderSummary?.meal || "Commande a emporter"}</Text>
                <Text style={styles.feedbackSummaryMeta}>{feedbackOrderSummary?.code || ""} - {feedbackOrderSummary?.creneau || "Retrait"}</Text>
              </View>

              <View style={styles.ratingBlock}>
                <Text style={styles.ratingLabel}>Service</Text>
                {renderStars(serviceRating, setServiceRating)}
              </View>

              <View style={styles.ratingBlock}>
                <Text style={styles.ratingLabel}>Qualite du repas</Text>
                {renderStars(mealRating, setMealRating)}
              </View>

              <View style={styles.ratingBlock}>
                <Text style={styles.ratingLabel}>Organisation du retrait</Text>
                {renderStars(ambianceRating, setAmbianceRating)}
              </View>

              <View style={styles.commentBlock}>
                <Text style={styles.ratingLabel}>Commentaire</Text>
                <TextInput
                  value={feedbackComment}
                  onChangeText={setFeedbackComment}
                  placeholder="Partagez un retour sur le retrait ou votre commande..."
                  placeholderTextColor="#A08E81"
                  multiline
                  style={styles.commentInput}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.feedbackActions}>
                <TouchableOpacity style={styles.feedbackLaterBtn} onPress={resetFeedbackModal} disabled={submittingFeedback}>
                  <Text style={styles.feedbackLaterText}>Plus tard</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.feedbackSubmitBtn,
                    (submittingFeedback || !serviceRating || !mealRating || !ambianceRating) && styles.feedbackSubmitBtnDisabled,
                  ]}
                  disabled={submittingFeedback || !serviceRating || !mealRating || !ambianceRating}
                  onPress={async () => {
                    try {
                      setSubmittingFeedback(true);
                      await ReservationService.submitServiceFeedback(feedbackReservationId, {
                        serviceRating,
                        mealRating,
                        ambianceRating,
                        comment: feedbackComment,
                      });
                      resetFeedbackModal();
                      Alert.alert("Merci", "Votre avis a bien ete envoye.");
                    } catch (error) {
                      setSubmittingFeedback(false);
                      Alert.alert("Erreur", error?.response?.data?.message || "Impossible d'envoyer votre avis.");
                    }
                  }}
                >
                  <Text style={styles.feedbackSubmitText}>{submittingFeedback ? "Envoi..." : "Envoyer mon avis"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
      <StudentBottomTabs />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F0E9" },
  content: { paddingBottom: 146 },
  hero: {
    paddingTop: 28,
    paddingHorizontal: 16,
    paddingBottom: 28,
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
  },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroTitle: { flex: 1, textAlign: "center", fontSize: 24, fontWeight: "900", lineHeight: 30, color: "#3F322D" },
  heroButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroSpacer: {
    width: 42,
    height: 42,
  },
  heroCard: {
    marginTop: 18,
    backgroundColor: "#FFFDFC",
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E9DED4",
    shadowColor: "#BDA999",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  heroCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroOrderId: { fontSize: 21, fontWeight: "900", color: "#40322D" },
  heroOrderMeal: { marginTop: 4, color: "#7A6A61", fontWeight: "600" },
  heroStatusBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  heroStatusText: { fontSize: 12, fontWeight: "800" },
  stepsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 24, gap: 6 },
  stepWrap: { flex: 1, alignItems: "center" },
  stepTime: { fontSize: 12, fontWeight: "800", color: "#B0A39C", marginBottom: 10, textAlign: "center", lineHeight: 16 },
  stepTimeActive: { color: "#5C4E47" },
  stepVisualRow: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center" },
  stepCircle: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "#F6F1EC",
    borderWidth: 1,
    borderColor: "#E4D8CF",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleDone: { backgroundColor: "#7EB8A8", borderColor: "#7EB8A8" },
  stepCircleActive: { backgroundColor: "#46C2A3", borderColor: "#46C2A3" },
  stepLine: { flex: 1, height: 4, backgroundColor: "#E8DDD5", marginHorizontal: 3, borderRadius: 999 },
  stepLineActive: { backgroundColor: "#8DD7C4" },
  stepLabelBox: { marginTop: 10, minHeight: 32, justifyContent: "center", paddingHorizontal: 6 },
  stepLabelBoxActive: { },
  stepLabel: { fontSize: 11, fontWeight: "800", color: "#AA9B92", textAlign: "center" },
  stepLabelActive: { color: "#4E403A" },
  highlightBox: {
    marginTop: 22,
    backgroundColor: "#6FCFC5",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  highlightIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.24)",
    alignItems: "center",
    justifyContent: "center",
  },
  highlightTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "900" },
  highlightText: { marginTop: 6, color: "#F4FFFD", fontSize: 14, lineHeight: 20, fontWeight: "600" },
  confirmButton: {
    marginTop: 14,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#1F8F83",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  confirmButtonDisabled: {
    opacity: 0.72,
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  guideOverlay: {
    flex: 1,
    backgroundColor: "rgba(28, 22, 19, 0.42)",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  guideCard: {
    backgroundColor: "#FFFDFC",
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  guideBadge: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: "#6DB8A0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  guideTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#312622",
  },
  guideText: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: "#6D6058",
    textAlign: "center",
  },
  guideActions: {
    marginTop: 20,
    flexDirection: "row",
    gap: 10,
  },
  guideSecondaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#F4ECE4",
    alignItems: "center",
    justifyContent: "center",
  },
  guideSecondaryText: {
    color: "#6B5D55",
    fontWeight: "800",
  },
  guidePrimaryBtn: {
    flex: 1.25,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#1F8F83",
    alignItems: "center",
    justifyContent: "center",
  },
  guidePrimaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(30, 24, 20, 0.42)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  feedbackModalCard: {
    backgroundColor: "#FFFDFC",
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  feedbackHeader: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: "center",
  },
  feedbackBadge: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "#6DB8A0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  feedbackTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#2E2420",
    textAlign: "center",
  },
  feedbackSubtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: "#6F625B",
    textAlign: "center",
  },
  feedbackBody: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
  },
  feedbackSummary: {
    backgroundColor: "#FAF5EF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EFE1D3",
    marginBottom: 16,
  },
  feedbackSummaryMeal: {
    fontSize: 16,
    fontWeight: "900",
    color: "#3D302A",
  },
  feedbackSummaryMeta: {
    marginTop: 4,
    color: "#84756B",
    fontWeight: "600",
  },
  ratingBlock: {
    marginBottom: 14,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#483A34",
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: "row",
    gap: 8,
  },
  starButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#FAF5EF",
    borderWidth: 1,
    borderColor: "#EEDFD0",
    alignItems: "center",
    justifyContent: "center",
  },
  commentBlock: {
    marginTop: 2,
  },
  commentInput: {
    minHeight: 96,
    borderRadius: 18,
    backgroundColor: "#FAF5EF",
    borderWidth: 1,
    borderColor: "#EEDFD0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#3D302A",
    fontWeight: "600",
  },
  feedbackActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  feedbackLaterBtn: {
    flex: 1,
    height: 50,
    borderRadius: 18,
    backgroundColor: "#F5EEE7",
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackLaterText: {
    color: "#7A6B61",
    fontWeight: "800",
  },
  feedbackSubmitBtn: {
    flex: 1.25,
    height: 50,
    borderRadius: 18,
    backgroundColor: "#6DB8A0",
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackSubmitBtnDisabled: {
    opacity: 0.55,
  },
  feedbackSubmitText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  emptyHero: { minHeight: 220, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  emptyHeroArt: { marginBottom: 16, position: "relative" },
  emptyHeroArtCircle: {
    width: 78,
    height: 78,
    borderRadius: 26,
    backgroundColor: "#E5F5EC",
    borderWidth: 1,
    borderColor: "#C9E7D6",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyHeroArtBadge: {
    position: "absolute",
    right: -4,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "#6B4EFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFDFC",
  },
  emptyHeroTitle: { fontSize: 24, fontWeight: "900", color: "#211B18", textAlign: "center", lineHeight: 32 },
  emptyHeroText: { marginTop: 14, color: "#4B433E", fontSize: 18, lineHeight: 28, textAlign: "center", fontWeight: "500" },
  section: { paddingHorizontal: 16, marginTop: 18 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: "#3F322D" },
  sectionLink: { fontSize: 12, fontWeight: "800", color: "#6A8A83" },
  orderCard: {
    backgroundColor: "#FFFDFC",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E9DED4",
    marginBottom: 12,
  },
  orderCardEmphasized: {
    shadowColor: "#BCA798",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderHeaderBadges: { flexDirection: "row", alignItems: "center", gap: 8 },
  orderId: { fontSize: 18, fontWeight: "900", color: "#433631" },
  orderMeal: { marginTop: 3, fontSize: 13, color: "#8B7A70", fontWeight: "700" },
  orderDatePanel: {
    marginTop: 14,
    marginBottom: 4,
    backgroundColor: "#F8F4F0",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ECE1D8",
    gap: 8,
  },
  orderDateRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  orderDateTitle: { minWidth: 108, color: "#7A6D65", fontSize: 12, fontWeight: "800" },
  orderDateValue: { flex: 1, color: "#433631", fontSize: 12, fontWeight: "800" },
  emptyList: {
    backgroundColor: "#FFFDFC",
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: "#E9DED4",
    alignItems: "center",
  },
  emptyListTitle: { marginTop: 10, fontSize: 16, fontWeight: "900", color: "#463834" },
  emptyListText: { marginTop: 6, fontSize: 13, lineHeight: 19, color: "#8B7A70", textAlign: "center", fontWeight: "600" },
  loadingWrap: { alignItems: "center", paddingVertical: 26 },
  loadingText: { marginTop: 10, color: "#7A6A61", fontWeight: "700" },
  statusBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  statusBadgeText: { fontSize: 12, fontWeight: "800" },
  unconfirmedBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#FFEBEE",
  },
  unconfirmedBadgeText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#D62839",
  },
  orderSummary: { marginTop: 14, marginBottom: 14, fontSize: 15, color: "#4C3E38", fontWeight: "700" },
  orderMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  orderMetaText: { color: "#6E625B", fontSize: 13, fontWeight: "600", flex: 1 },
});
