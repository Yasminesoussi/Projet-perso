// Screen Admin “Planning”: UI pour planifier menus sur la semaine
// - Appelle MenuService/PlatService, logique métier à externaliser si complexe
import React, { useEffect, useState } from "react";
import MenuService from "../../services/MenuService";
import PlatService from "../../services/PlatService";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Platform,
  Alert
} from "react-native";
import Modal from "react-native-modal";
import SpecialMenusScreen from "./SpecialMenusScreen";
import { Ionicons } from "@expo/vector-icons";


/* DATE */
const formatISO = (date) => {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatFullDate = (date) =>
  date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

const getWeekDaysFrom = (baseDate) => {
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() - ((baseDate.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
};

/* HORAIRES FIXES ADMIN (hors spéciaux) */
const HORAIRES_FIXES = {
  dejeuner: { label: "12h00 – 14h30", debut: "12:00", fin: "14:30" },
  diner: { label: "18h30 – 21h30", debut: "18:30", fin: "21:30" }
};

/* SPECIAL MENU STYLES*/
const SPECIAL_MENU_STYLES = {
  ramadan: { backgroundColor: "#fce6c9", badge: "Ramadan", badgeColor: "#e67e22" },
  examens: { backgroundColor: "#e0f7fa", badge: "Examens", badgeColor: "#00796b" },
  evenement: { backgroundColor: "#f3e5f5", badge: "Événement", badgeColor: "#8e24aa" },
};

/* =======================
   SCREEN */
export default function PlanningScreen() {
  const [baseDate, setBaseDate] = useState(new Date());
  const [weekDays, setWeekDays] = useState(getWeekDaysFrom(new Date()));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [menus, setMenus] = useState([]);
  const [plats, setPlats] = useState([]);

  const [typeModalVisible, setTypeModalVisible] = useState(false); // <-- nouveau modal type
  const [menuModalVisible, setMenuModalVisible] = useState(false); // <-- modal classique

  const [platSearch, setPlatSearch] = useState("");
  const [specialMenuVisible, setSpecialMenuVisible] = useState(false);

  const [form, setForm] = useState({
    date: selectedDate,
    creneau: null,
    horaire: null,
    capacite: "",
    platsSelected: []
  });

  /* FETCH*/
  const loadPlats = async () => {
    try {
      const data = await PlatService.getAllPlats();
      setPlats(data);
    } catch {
      Alert.alert("Erreur", "Impossible de charger les plats");
    }
  };

  const loadMenus = async (date) => {
    try {
      const formattedDate = formatISO(date);
      const data = await MenuService.getDailyMenus(formattedDate);
      console.log("Menus récupérés :", data);
      setMenus(data);
    } catch {
      Alert.alert("Erreur", "Chargement menus impossible");
    }
  };

  const deleteMenu = async (menuId) => {
    try {
      await MenuService.deleteMenu(menuId);
      // Recharge les menus après suppression
      await loadMenus(selectedDate);
      Alert.alert("Succès", "Menu supprimé");
    } catch (err) {
      console.error(err);
      Alert.alert("Erreur", "Impossible de supprimer le menu");
    }
  };

  useEffect(() => setWeekDays(getWeekDaysFrom(baseDate)), [baseDate]);
  useEffect(() => {
    const fetchData = async () => {
      await loadMenus(selectedDate);
      await loadPlats();
    };
    fetchData();
  }, [selectedDate]);

  /* NAVIGATION */
  const prevWeek = () => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - 7);
    setBaseDate(d);
    setSelectedDate(d);
  };

  const nextWeek = () => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 7);
    setBaseDate(d);
    setSelectedDate(d);
  };

  /*MODAL ACTIONS */
  const togglePlat = (id) => {
    setForm((prev) => ({
      ...prev,
      platsSelected: prev.platsSelected.includes(id)
        ? prev.platsSelected.filter((p) => p !== id)
        : [...prev.platsSelected, id]
    }));
  };

  const resetMenuModal = () => {
    setMenuModalVisible(false);

    setPlatSearch("");
    setForm({ creneau: null, horaire: null, capacite: "", platsSelected: [] });
  };

  const submitMenu = async () => {
    if (!form.creneau || !form.horaire || !form.capacite) {
      Alert.alert("Erreur", "Tous les champs sont obligatoires");
      return;
    }

    const payload = {
      date: formatISO(form.date),
      repas: form.creneau,
      creneau: `${form.horaire.debut}-${form.horaire.fin}`,
      capacite: Number(form.capacite),
      plats: form.platsSelected
    };

    try {
      await MenuService.addMenu(payload);

      Alert.alert("Succès", "Menu ajouté");
      resetMenuModal();
      await loadMenus(selectedDate);
    } catch (err) {
      Alert.alert("Erreur", "Erreur serveur");
    }
  };


  /* UI */
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Planning des menus</Text>
      <Text style={styles.dateTitle}>{formatFullDate(selectedDate)}</Text>

      <View style={styles.weekNav}>
        <TouchableOpacity onPress={prevWeek}>
          <Text style={styles.navBtn}>⬅️ Semaine précédente</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={nextWeek}>
          <Text style={styles.navBtn}>Semaine suivante ➡️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 110 }}
        stickyHeaderIndices={[1]}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          {weekDays.map((d) => {
            const active = formatISO(d) === formatISO(selectedDate);
            return (
              <TouchableOpacity
                key={d.toISOString()}
                style={[styles.day, active && styles.dayActive]}
                onPress={() => setSelectedDate(d)}
              >
                <Text style={active ? styles.dayTextActive : styles.dayText}>
                  {d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.stickyActions}>
          <Text style={styles.section}>Menus du jour</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setTypeModalVisible(true)} activeOpacity={0.9}>
            <Text style={styles.addText}>+ Ajouter menu</Text>
          </TouchableOpacity>
        </View>
        {menus.length === 0 && <Text style={styles.empty}>Aucun menu pour ce jour</Text>}

        {menus.map((m, idx) => {
          const progress = m.reserve / m.capacite;

          // Vérifie si le menu est spécial
          const isSpecial = m.typeMenu && m.typeMenu !== "normal";
          const styleSpecial = isSpecial ? SPECIAL_MENU_STYLES[m.typeMenu] : {};
          const typeLabel = (m.typeMenu || "normal").toLowerCase();
          const typeText = typeLabel === "normal" ? "Normal" : typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1);

          return (
            <View
              key={m._id}
              style={[
                styles.menuCard,
                isSpecial && { backgroundColor: styleSpecial.backgroundColor }
              ]}
            >
              <View style={[styles.menuHeader, { justifyContent: "space-between", alignItems: "center" }]}>
                <Text style={styles.menuType}>{(m.repas || "").toUpperCase()}</Text>


                <Text style={styles.menuHoraire}>
                  {m.creneau ? `Créneau: ${m.creneau}` : "Créneau non défini"}
                </Text>


                <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 8 }}>
                  {/* Icône personnalisée pour spéciaux */}
                  {isSpecial && m.typeMenu === "ramadan" && <Ionicons name="moon-outline" size={18} color={styleSpecial.badgeColor} style={{ marginRight: 4 }} />}
                  {isSpecial && m.typeMenu === "examens" && <Ionicons name="school-outline" size={18} color={styleSpecial.badgeColor} style={{ marginRight: 4 }} />}
                  {isSpecial && m.typeMenu === "evenement" && <Ionicons name="gift-outline" size={18} color={styleSpecial.badgeColor} style={{ marginRight: 4 }} />}
                  {/* Badge type (Normal ou Spécial) */}
                  <View
                    style={{
                      backgroundColor: isSpecial ? styleSpecial.badgeColor : "#ddd",
                      paddingVertical: 2,
                      paddingHorizontal: 6,
                      borderRadius: 12,
                    }}
                  >
                    <Text style={{ color: isSpecial ? "#fff" : "#333", fontWeight: "700", fontSize: 14 }}>
                      {isSpecial ? styleSpecial.badge : "Normal"}
                    </Text>
                  </View>
                </View>


                {/* Boutons modifier / supprimer */}
                <View style={{ flexDirection: "row" }}>
                  {/* Modifier */}
                  <TouchableOpacity disabled style={{ marginRight: 12, padding: 4, opacity: 0.4 }}>
                    <Ionicons name="pencil-outline" size={24} color="#4a4a4a" />
                  </TouchableOpacity>

                  {/* Supprimer */}
                  {isSpecial && (
                    <TouchableOpacity
                      onPress={() => {
                        const isWeb = Platform.OS === "web";

                        if (isWeb) {
                          if (window.confirm("Voulez-vous supprimer ce menu spécial ?")) {
                            deleteMenu(m._id);
                          }
                        } else {
                          Alert.alert(
                            "Confirmer",
                            "Voulez-vous supprimer ce menu spécial ?",
                            [
                              { text: "Annuler", style: "cancel" },
                              { text: "Supprimer", style: "destructive", onPress: () => deleteMenu(m._id) }
                            ]
                          );
                        }
                      }}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="trash-outline" size={24} color="#f44336" />
                    </TouchableOpacity>
                  )}
                </View>

              </View>

              <Text style={styles.capacite}>Capacité: {m.capacite} repas</Text>
              <View style={styles.progressBarBackground}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${progress * 100}%`, backgroundColor: progress > 0.8 ? "#f44336" : "#4caf50" }
                  ]}
                />
              </View>
              <Text style={styles.reserve}>Réservé: {m.reserve} repas</Text>

              <View style={styles.platsContainer}>
                {m.plats?.map((p, i) => (
                  <View key={i} style={styles.platTag}>
                    <Text style={styles.platText}>{p.nom}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/*MODAL TYPE MENU*/}
      <Modal isVisible={typeModalVisible} onBackdropPress={() => setTypeModalVisible(false)} backdropOpacity={0.3}>
        <View style={styles.typeModal}>
          <TouchableOpacity
            style={[styles.typeButton, { backgroundColor: "#e6d3c3" }]}
            onPress={async () => {
              await loadPlats();

              setForm({
                date: selectedDate,
                creneau: null,
                horaire: null,
                capacite: "",
                platsSelected: []
              });

              setTypeModalVisible(false);
              setMenuModalVisible(true);
            }}
          >
            <Text style={styles.typeText}>Normal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, { backgroundColor: "#f1e9e0" }]}
            onPress={() => {
              setTypeModalVisible(false);
              setSpecialMenuVisible(true);
            }}
          >
            <Text style={styles.typeText}>Spécial</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* MODAL MENU (EXISTANT)*/}
      <Modal
        isVisible={menuModalVisible}
        style={styles.modal}

      >
        <View style={styles.sheet}>
          <Text style={styles.modalTitle}>Nouveau menu</Text>

          {/* Créneau */}
          <View >
            <Text style={styles.label}>Créneau</Text>
            <View style={styles.row}>
              {["dejeuner", "diner"].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.choiceBtn, form.creneau === t && styles.choiceActive]}
                  onPress={() => setForm({ ...form, creneau: t, horaire: HORAIRES_FIXES[t] })}
                >
                  <Text style={styles.choiceText}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Horaire fixe affiché */}
          {form.creneau && form.horaire && (
            <View style={{ marginBottom: 8 }}>
              <Text style={styles.label}>Horaire (fixe)</Text>
              <View style={[styles.choiceBtn, styles.choiceActive]}>
                <Text style={{ fontWeight: "600" }}>{form.horaire.label}</Text>
              </View>
            </View>
          )}

          {/* Capacité */}
          <View>
            <Text style={styles.label}>Capacité</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="Nombre de repas"
              value={form.capacite}
              onChangeText={(t) => setForm({ ...form, capacite: t })}
            />
          </View>

          {/* Plats + recherche */}
          <View style={styles.field}>
            <Text style={styles.label}>Plats</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un plat..."
              value={platSearch}
              onChangeText={setPlatSearch}
            />
            <ScrollView style={{ maxHeight: 140 }}>
              {Array.isArray(plats)
                ? plats
                  .filter((p) =>
                    p.nom.toLowerCase().includes(platSearch.toLowerCase())
                  )
                  .map((p) => (
                    <TouchableOpacity
                      key={p._id}
                      style={[
                        styles.platRow,
                        form.platsSelected.includes(p._id) && styles.choiceActive,
                      ]}
                      onPress={() => togglePlat(p._id)}
                    >
                      <Text>{p.nom}</Text>
                      {form.platsSelected.includes(p._id) && (
                        <Ionicons name="checkmark-circle" size={18} color="green" />
                      )}
                    </TouchableOpacity>
                  ))
                : null}
            </ScrollView>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={resetMenuModal}>
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={submitMenu}>
              <Text style={styles.saveText}>Créer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <SpecialMenusScreen
        isVisible={specialMenuVisible}
        date={selectedDate}
        onClose={() => setSpecialMenuVisible(false)}
        onSave={async () => await loadMenus(selectedDate)}
        initialData={null}
      />

    </View>
  );
}

/*STYLES */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f9f6f2" },
  menuHoraire: { fontSize: 12, color: "#555", marginBottom: 4 },
  header: { fontSize: 22, fontWeight: "700" },
  dateTitle: { marginBottom: 10, color: "#555" },
  weekNav: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  navBtn: { fontWeight: "600" },
  day: { width: 80, height: 80, justifyContent: "center", alignItems: "center", borderRadius: 14, backgroundColor: "#fff", marginRight: 8 },
  dayActive: { backgroundColor: "#cbbba7" },
  dayText: { color: "#333", textAlign: "center" },
  dayTextActive: { color: "#fff", fontWeight: "700", textAlign: "center" },
  stickyActions: {
    backgroundColor: "#f9f6f2",
    paddingTop: 4,
    paddingBottom: 12,
  },
  section: { marginTop: 8, marginBottom: 12, fontWeight: "700" },
  empty: { color: "#777" },
  menuCard: { backgroundColor: "#fff", padding: 12, borderRadius: 12, marginBottom: 12 },
  menuHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6, justifyContent: "space-between" },
  menuType: { fontSize: 16, fontWeight: "600" },
  capacite: { fontSize: 12, color: "#555" },
  progressBarBackground: { height: 6, backgroundColor: "#eee", borderRadius: 4, marginVertical: 4 },
  progressBar: { height: 6, borderRadius: 4 },
  reserve: { fontSize: 12, marginBottom: 6 },
  platsContainer: { flexDirection: "row", flexWrap: "wrap" },
  platTag: { backgroundColor: "#f0e6d6", paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, marginRight: 6, marginTop: 4 },
  platText: { fontSize: 12, fontWeight: "500" },
  addBtn: {
    backgroundColor: "#4a4a4a",
    padding: 14,
    borderRadius: 18,
    alignItems: "center",
  },
  addText: { color: "#fff", fontWeight: "600" },
  modal: { justifyContent: "flex-end", margin: 0 },
  sheet: { backgroundColor: "#fff", padding: 18, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalTitle: { fontWeight: "700", fontSize: 18 },
  row: { flexDirection: "row" },
  choiceBtn: { padding: 12, borderRadius: 12, backgroundColor: "#eee", marginBottom: 8, marginRight: 8 },
  choiceActive: { borderWidth: 2, borderColor: "#2ecc71", backgroundColor: "#efe9e2" },
  choiceText: { fontWeight: "600" },
  input: { backgroundColor: "#f3eee8", padding: 12, borderRadius: 12, marginVertical: 10 },
  platRow: { flexDirection: "row", justifyContent: "space-between", padding: 12, borderRadius: 12, backgroundColor: "#f2ece6", marginBottom: 6 },
  footer: { flexDirection: "row", marginTop: 16 },
  cancelBtn: { flex: 1, backgroundColor: "#ccc", padding: 14, borderRadius: 14, marginRight: 8 },
  cancelText: { textAlign: "center", fontWeight: "600" },
  saveBtn: { flex: 1, backgroundColor: "#4a4a4a", padding: 14, borderRadius: 14, marginLeft: 8 },
  saveText: { color: "#fff", textAlign: "center", fontWeight: "700" },
  fieldEdit: { marginBottom: 16 },
  searchInput: { backgroundColor: "#f3eee8", padding: 10, borderRadius: 12, marginVertical: 8 },

  // ===== Nouveau modal type
  typeModal: { backgroundColor: "#fff", padding: 24, borderRadius: 20, flexDirection: "row", justifyContent: "space-around" },
  typeButton: { padding: 24, borderRadius: 18, width: 120, alignItems: "center" },
  typeText: { fontWeight: "700", fontSize: 18 }
});
