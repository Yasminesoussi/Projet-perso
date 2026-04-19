import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, ToastAndroid, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import BottomTabs from "../../navigation/BottomTabs";
import KitchenService from "../../services/KitchenService";
import { getTodayISODateLocal } from "../../utils/dateLocal";

const LIMIT = 5;
const toast = (m) => (Platform.OS === "android" ? ToastAndroid.show(m, ToastAndroid.SHORT) : Alert.alert("Info", m));
const dmy = (v) => (v ? `${v.slice(8, 10)}/${v.slice(5, 7)}/${v.slice(0, 4)}` : "-");
const longDate = (v) => new Date(`${v}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
const repasLabel = (v) => ({ dejeuner: "Dejeuner", diner: "Diner", libre: "Special" }[v] || v || "-");
const modeLabel = (v) => (v === "aEmporter" ? "Importee" : "Sur place");
const statusLabel = (v) => ({ EN_ATTENTE: "EN ATTENTE", EN_PREPARATION: "EN PREPARATION", PRET: "PRET", SERVED: "SERVI" }[v] || v || "-");
const reservationLabel = (row) => {
  const reservationId =
    row?.reservation?._id ||
    (typeof row?.reservation === "string" ? row.reservation : "") ||
    row?._id ||
    "";
  return `#${String(reservationId).slice(-6).toUpperCase()}`;
};
const badge = (v) =>
  v === "EN_PREPARATION"
    ? { bg: "#F8EEE2", bd: "#E8D5BF", tx: "#9A6A2B" }
    : v === "PRET"
      ? { bg: "#E8F6F3", bd: "#CDE8E2", tx: "#3F7A70" }
      : v === "SERVED"
        ? { bg: "#EEF3F4", bd: "#D8E3E5", tx: "#5C6E73" }
        : { bg: "#F8F1EB", bd: "#EADFD4", tx: "#6F5B4C" };

function CellBadge({ value }) {
  const p = badge(value);
  return <View style={[styles.badge, { backgroundColor: p.bg, borderColor: p.bd }]}><Text style={[styles.badgeText, { color: p.tx }]}>{statusLabel(value)}</Text></View>;
}

function Table({ cols, widths, rows, empty }) {
  return (
    <View style={styles.tableWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={styles.head}>{cols.map((c, i) => <Text key={c} style={[styles.headCell, { width: widths[i] }, !i && styles.noBd]}>{c}</Text>)}</View>
          {rows.length ? rows.map((r, idx) => (
            <View key={r.key} style={[styles.row, idx % 2 && styles.alt]}>
              {r.cells.map((cell, i) => <View key={`${r.key}-${i}`} style={[styles.bodyCell, { width: widths[i] }, !i && styles.noBd]}>{typeof cell === "string" || typeof cell === "number" ? <Text style={styles.cell}>{cell}</Text> : cell}</View>)}
            </View>
          )) : <View style={styles.empty}><Text style={styles.emptyText}>{empty}</Text></View>}
        </View>
      </ScrollView>
    </View>
  );
}

export default function CuisineScreen() {
  const navigation = useNavigation();
  const [dateISO] = useState(getTodayISODateLocal());
  const [selectedKey, setSelectedKey] = useState("");
  const [data, setData] = useState({ prepSummary: [], orders: [], batches: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState("");
  const [error, setError] = useState("");

  const services = useMemo(() => (data.prepSummary || []).map((x) => ({ ...x, key: `${x.repas}::${x.creneau}` })), [data.prepSummary]);
  const current = useMemo(() => services.find((x) => x.key === selectedKey) || services[0] || null, [services, selectedKey]);
  const waitingOrders = useMemo(() => (data.orders || []).filter((x) => (x.pendingQuantity || 0) > 0), [data.orders]);
  const activeOrders = useMemo(() => (data.orders || []).filter((x) => (x.preparingQuantity || 0) > 0), [data.orders]);
  const activeBatch = useMemo(() => (data.batches || []).find((x) => x.status === "EN_PREPARATION") || null, [data.batches]);
  const readyBatches = useMemo(() => (data.batches || []).filter((x) => x.status === "PRET"), [data.batches]);
  const lastBatch = useMemo(() => (data.batches || [])[data.batches.length - 1] || null, [data.batches]);
  const waitingMeals = useMemo(() => waitingOrders.reduce((s, x) => s + (x.pendingQuantity || 0), 0), [waitingOrders]);
  const preparingMeals = useMemo(() => activeOrders.reduce((s, x) => s + (x.preparingQuantity || 0), 0), [activeOrders]);
  const readyMeals = useMemo(() => (data.orders || []).reduce((s, x) => s + (x.readyQuantity || 0), 0), [data.orders]);
  const servedMeals = useMemo(() => (data.orders || []).reduce((s, x) => s + (x.servedQuantity || 0), 0), [data.orders]);
  const totalMeals = useMemo(() => (data.orders || []).reduce((s, x) => s + (x.quantity || 0), 0), [data.orders]);
  const canLaunch = !!current && !!waitingOrders.length && !activeBatch && (!lastBatch || lastBatch.status === "PRET" || lastBatch.status === "SERVED");

  const load = useCallback(async (opts = {}) => {
    const { silent = false, pull = false } = opts;
    const [repas, creneau] = (selectedKey || "").split("::");
    if (!silent && !pull) setLoading(true);
    if (pull) setRefreshing(true);
    setError("");
    try {
      const res = await KitchenService.getDashboard({ dateISO, repas: repas || undefined, creneau: creneau || undefined });
      const next = {
        prepSummary: Array.isArray(res?.prepSummary) ? res.prepSummary : [],
        orders: Array.isArray(res?.orders) ? res.orders : [],
        batches: Array.isArray(res?.batches) ? res.batches : [],
      };
      setData(next);
      setSelectedKey((prev) => {
        const keys = next.prepSummary.map((x) => `${x.repas}::${x.creneau}`);
        return prev && keys.includes(prev) ? prev : keys[0] || "";
      });
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Impossible de charger la cuisine");
    } finally {
      if (!silent && !pull) setLoading(false);
      if (pull) setRefreshing(false);
    }
  }, [dateISO, selectedKey]);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load({ silent: true }); }, [load]));
  useEffect(() => { const t = setInterval(() => load({ silent: true }), 5000); return () => clearInterval(t); }, [load]);

  const run = useCallback(async (key, fn, ok) => {
    setActing(key);
    try { await fn(); toast(ok); await load({ silent: true }); }
    catch (e) { toast(e?.response?.data?.message || e?.message || "Action impossible"); }
    finally { setActing(""); }
  }, [load]);

  const prepRows = (data.prepSummary || []).map((x) => ({
    key: x.key || `${x.repas}-${x.creneau}`,
    cells: [
      dmy(dateISO),
      repasLabel(x.repas),
      x.creneau,
      x.totalMeals || 0,
      x.importedMeals || 0,
      x.dineInMeals || 0,
      <TouchableOpacity
        style={styles.menuLink}
        onPress={() => navigation.navigate("Planning")}
      >
        <Ionicons name="restaurant-outline" size={14} color="#7A5B44" />
        <Text style={styles.menuLinkText}>Voir dans planning</Text>
      </TouchableOpacity>,
    ],
  }));
  const batchRows = (data.batches || []).map((x) => ({ key: x._id, cells: [x.label, dmy(x.dateISO), x.creneau, x.totalMeals || 0, `${x.status === "SERVED" ? x.totalMeals || 0 : 0}/${x.totalMeals || 0}`, (x.orders || []).map((o) => reservationLabel(o)).join(", "), <CellBadge value={x.status} />] }));
  const orderRows = (data.orders || []).map((x) => ({ key: x._id, cells: [reservationLabel(x), dmy(x.dateISO), modeLabel(x.typeRepas), x.quantity || 0, x.creneau, Array.isArray(x.internalOrderIds) ? x.internalOrderIds.join(" / ") : "-", <CellBadge value={x.status} />] }));

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#EFE4D8" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load({ pull: true })} tintColor="#8C6D59" />}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate("Acceuil")}><Ionicons name="arrow-back" size={22} color="#5f4a43" /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Cuisine</Text>
            <Text style={styles.headerSubtitle}>{longDate(dateISO)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionKicker}>Contexte du service</Text>
          <Text style={styles.sectionTitle}>{current ? `${repasLabel(current.repas)} • ${current.creneau}` : "Aucun service charge"}</Text>
          <Text style={styles.hint}>Chaque commande et chaque lot restent separes par date et par creneau pour ne jamais melanger dejeuner, diner et special.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {services.map((s) => <TouchableOpacity key={s.key} style={[styles.chip, current?.key === s.key && styles.chipOn]} onPress={() => setSelectedKey(s.key)}><Text style={styles.chipTitle}>{repasLabel(s.repas)}</Text><Text style={styles.chipText}>{s.creneau} • {s.totalMeals || 0} repas</Text></TouchableOpacity>)}
          </ScrollView>
        </View>

        {error ? <View style={styles.error}><Ionicons name="alert-circle-outline" size={18} color="#9A5A19" /><Text style={styles.errorText}>{error}</Text></View> : null}

        <View style={styles.stats}>
          <View style={styles.stat}><Text style={styles.statValue}>{waitingMeals}</Text><Text style={styles.statLabel}>Repas en attente</Text><Text style={styles.statMeta}>{waitingOrders.length} commandes scannees</Text></View>
          <View style={styles.stat}><Text style={styles.statValue}>{preparingMeals}</Text><Text style={styles.statLabel}>Repas en preparation</Text><Text style={styles.statMeta}>{activeBatch?.label || "Aucun lot actif"}</Text></View>
          <View style={styles.stat}><Text style={styles.statValue}>{readyMeals}</Text><Text style={styles.statLabel}>Repas prets</Text><Text style={styles.statMeta}>{readyBatches.length} lots</Text></View>
          <View style={styles.stat}><Text style={styles.statValue}>{servedMeals}</Text><Text style={styles.statLabel}>Repas servis</Text><Text style={styles.statMeta}>{totalMeals} repas suivis</Text></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionKicker}>Notification 1</Text>
          <Text style={styles.sectionTitle}>Tableau global des bases</Text>
          <Table cols={["Date", "Repas", "Creneau", "Nb total", "Importees", "Sur place", "Menu concerne"]} widths={[110, 95, 130, 85, 95, 95, 180]} rows={prepRows} empty="Aucun service reserve pour cette date." />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionKicker}>Poste cuisinier</Text>
          <Text style={styles.sectionTitle}>Actions de production</Text>
          <Text style={styles.hint}>Chaque lot lance au maximum 5 repas et garde chaque commande complete dans un seul lot.</Text>
          <View style={styles.launch}>
            <View style={{ flex: 1 }}>
              <Text style={styles.launchTitle}>Prochain lot</Text>
              <Text style={styles.launchText}>{current ? `${repasLabel(current.repas)} • ${current.creneau} • ${Math.min(waitingMeals, LIMIT)} repas a lancer` : "Choisissez un service"}</Text>
            </View>
            <TouchableOpacity style={[styles.primary, (!canLaunch || acting) && styles.dim]} disabled={!canLaunch || !!acting} onPress={() => run("launch", () => KitchenService.launchBatch({ dateISO, repas: current?.repas, creneau: current?.creneau, maxMeals: LIMIT }), "Lot lance")}>{acting === "launch" ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryText}>Lancer le prochain lot</Text>}</TouchableOpacity>
          </View>
          {!canLaunch ? <Text style={styles.hint}>{!current ? "Selectionnez un service avec des commandes." : activeBatch ? "Un lot est deja en preparation pour ce creneau." : !waitingOrders.length ? "Aucune commande en attente pour ce service." : "Le lot precedent doit etre PRET ou SERVI pour ouvrir le suivant."}</Text> : null}
          {(data.batches || []).map((b) => <View key={b._id} style={styles.batch}><View style={styles.batchTop}><View style={{ flex: 1 }}><Text style={styles.batchTitle}>{b.label}</Text><Text style={styles.batchMeta}>{dmy(b.dateISO)} • {b.creneau} • {b.totalMeals} repas</Text></View><CellBadge value={b.status} /></View><Text style={styles.batchIds}>{(b.orders || []).map((o) => reservationLabel(o)).join(" • ") || "Aucune reservation"}</Text><View style={styles.batchBtns}><TouchableOpacity style={[styles.secondary, b.status !== "EN_PREPARATION" && styles.dim]} disabled={b.status !== "EN_PREPARATION" || !!acting} onPress={() => run(`ready-${b._id}`, () => KitchenService.markBatchReady(b._id), `${b.label} passe en PRET`)}>{acting === `ready-${b._id}` ? <ActivityIndicator color="#6B594D" /> : <Text style={styles.secondaryText}>Passer en PRET</Text>}</TouchableOpacity><TouchableOpacity style={[styles.success, b.status !== "PRET" && styles.dim]} disabled={b.status !== "PRET" || !!acting} onPress={() => run(`served-${b._id}`, () => KitchenService.markBatchServed(b._id), `${b.label} passe en SERVI`)}>{acting === `served-${b._id}` ? <ActivityIndicator color="#476B51" /> : <Text style={styles.successText}>Passer le lot en SERVI</Text>}</TouchableOpacity></View></View>)}
        </View>

        <View style={styles.card}>
          <View style={styles.rowTop}><View style={{ flex: 1 }}><Text style={styles.sectionKicker}>Lots</Text><Text style={styles.sectionTitle}>Suivi cuisine par lot</Text></View></View>
          <Table cols={["Lot", "Date", "Creneau", "Nb repas", "Servis", "Reservations", "Statut"]} widths={[90, 110, 120, 90, 90, 220, 140]} rows={batchRows} empty="Aucun lot cree pour ce service." />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionKicker}>Notification 2</Text>
          <Text style={styles.sectionTitle}>File des commandes scannees</Text>
          <Text style={styles.hint}>Chaque scan QR cree une commande EN ATTENTE. Le passage en preparation, pret puis servi se fait ensuite par lot.</Text>
          <Table cols={["Reservation", "Date", "Mode", "Nb repas", "Creneau", "IDs internes", "Statut"]} widths={[100, 110, 100, 85, 120, 220, 140]} rows={orderRows} empty="Aucune commande scannee pour ce service." />
        </View>

        {loading ? <View style={styles.loading}><ActivityIndicator size="large" color="#8C6D59" /></View> : null}
      </ScrollView>
      <BottomTabs />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7EFE8" }, content: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 122 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 20, paddingBottom: 16, gap: 10, backgroundColor: "#EDE3DA", borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.7)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.9)" },
  headerTitle: { fontSize: 26, fontWeight: "900", color: "#5f4a43" },
  headerSubtitle: { fontSize: 13, color: "#7d6860", marginTop: 4, lineHeight: 18, fontWeight: "700" },
  card: { marginTop: 14, backgroundColor: "#FFFDFC", borderRadius: 26, padding: 16, borderWidth: 1, borderColor: "#EEE2D9" }, sectionKicker: { fontSize: 12, color: "#8A7464", fontWeight: "800", textTransform: "uppercase", letterSpacing: 1 }, sectionTitle: { marginTop: 5, fontSize: 22, fontWeight: "900", color: "#392D25" }, hint: { marginTop: 8, color: "#7A685B", lineHeight: 20, fontWeight: "600" },
  chips: { gap: 10, paddingTop: 14 }, chip: { minWidth: 152, backgroundColor: "#FFFCFA", borderWidth: 1, borderColor: "#EEE2D9", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 }, chipOn: { backgroundColor: "#E6F4F1", borderColor: "#CCE5E0" }, chipTitle: { fontSize: 13, fontWeight: "900", color: "#4A3A30" }, chipText: { marginTop: 5, fontSize: 12, color: "#6D7F7B", fontWeight: "700" },
  error: { marginTop: 14, flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: "#FFF7EF", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#F0D8BE" }, errorText: { flex: 1, color: "#8E5A1E", fontWeight: "700", lineHeight: 19 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 }, stat: { width: "48%", backgroundColor: "#FFFDFC", borderRadius: 20, paddingVertical: 16, paddingHorizontal: 14, borderWidth: 1, borderColor: "#EEE2D9" }, statValue: { fontSize: 24, fontWeight: "900", color: "#3A2D25" }, statLabel: { marginTop: 5, fontSize: 12, fontWeight: "700", color: "#6C7C79" }, statMeta: { marginTop: 6, fontSize: 11, fontWeight: "700", color: "#96A7A3" },
  tableWrap: { marginTop: 14, borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: "#E8DED6" }, head: { flexDirection: "row", backgroundColor: "#D9ECE7" }, headCell: { paddingHorizontal: 12, paddingVertical: 14, fontSize: 12, fontWeight: "900", color: "#45615C", borderLeftWidth: 1, borderLeftColor: "#C8E0DA" }, row: { flexDirection: "row", backgroundColor: "#FFFDFC", borderTopWidth: 1, borderTopColor: "#F0E7DF" }, alt: { backgroundColor: "#FCFAF8" }, bodyCell: { paddingHorizontal: 12, paddingVertical: 14, justifyContent: "center", borderLeftWidth: 1, borderLeftColor: "#F0E7DF" }, cell: { color: "#4D3D32", fontWeight: "700", lineHeight: 19 }, noBd: { borderLeftWidth: 0 }, empty: { backgroundColor: "#FFFDFC", paddingHorizontal: 16, paddingVertical: 18, borderTopWidth: 1, borderTopColor: "#F0E7DF" }, emptyText: { color: "#8C7869", fontWeight: "700" },
  badge: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1 }, badgeText: { fontSize: 10, fontWeight: "900" },
  menuLink: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#EEF8F5", borderWidth: 1, borderColor: "#D6ECE6", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  menuLinkText: { color: "#4F7A72", fontWeight: "800", fontSize: 12 },
  launch: { marginTop: 16, backgroundColor: "#F8F4F0", borderRadius: 20, padding: 14, borderWidth: 1, borderColor: "#EDE1D8", flexDirection: "row", gap: 12, alignItems: "center" }, launchTitle: { fontSize: 16, fontWeight: "900", color: "#3A2D25" }, launchText: { marginTop: 6, color: "#6F5D50", lineHeight: 20, fontWeight: "600" },
  primary: { minWidth: 188, height: 46, borderRadius: 16, backgroundColor: "#9FCFC4", justifyContent: "center", alignItems: "center", paddingHorizontal: 16 }, primaryText: { color: "#FFF", fontWeight: "800" }, secondary: { flex: 1, height: 46, borderRadius: 16, backgroundColor: "#F2EBE4", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#E4D7CD" }, secondaryText: { color: "#6B594D", fontWeight: "800" }, success: { flex: 1, height: 46, borderRadius: 16, backgroundColor: "#E7F4F1", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#D1E9E2" }, successText: { color: "#4C7B72", fontWeight: "800" }, dim: { opacity: 0.45 },
  batch: { marginTop: 14, backgroundColor: "#FFFCFA", borderRadius: 20, padding: 14, borderWidth: 1, borderColor: "#EEE2D9" }, batchTop: { flexDirection: "row", justifyContent: "space-between", gap: 10 }, batchTitle: { fontSize: 16, fontWeight: "900", color: "#3A2D25" }, batchMeta: { marginTop: 6, color: "#6F5D50", lineHeight: 20, fontWeight: "600" }, batchIds: { marginTop: 10, color: "#7D695D", lineHeight: 20, fontWeight: "700" }, batchBtns: { flexDirection: "row", gap: 10, marginTop: 12 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 12 }, loading: { paddingVertical: 28, alignItems: "center" },
});
