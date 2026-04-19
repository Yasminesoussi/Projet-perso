import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Platform
} from "react-native";
import Modal from "react-native-modal";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";

import PlatService from "../../services/PlatService";
import MenuService from "../../services/MenuService";

const HORAIRES_FIXES = {
  dejeuner: { debut: "12:00", fin: "14:30" },
  diner: { debut: "18:30", fin: "21:30" }
};

const formatISO = (value) => {
  const d = new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function SpecialMenusScreen({ isVisible, onClose, date, onSave, initialData }) {
  const [typeMenu, setTypeMenu] = useState("");
  const [showPicker, setShowPicker] = useState(null); // 🔥 NEW

  const [form, setForm] = useState({
    creneau: initialData?.creneau || null,
    horaire: initialData?.horaire || { debut: "", fin: "" },
    capacite: initialData?.capacite?.toString() || "",
    platsSelected: initialData?.platsSelected || []
  });

  const [plats, setPlats] = useState([]);

  useEffect(() => {
    if (!isVisible) return;
    const loadPlats = async () => {
      try {
        const data = await PlatService.getAllPlats();
        setPlats(data);
      } catch {
        Alert.alert("Erreur", "Impossible de charger les plats");
      }
    };
    loadPlats();
  }, [isVisible]);

  useEffect(() => {
    if (initialData) return;

    if (typeMenu === "ramadan") {
      setForm(prev => ({ ...prev, creneau: "diner", horaire: { debut: "", fin: "" } }));
    } else if (typeMenu === "evenement") {
      setForm(prev => ({ ...prev, creneau: "libre", horaire: { debut: "", fin: "" } }));
    } else if (typeMenu === "examens") {
      setForm(prev => ({ ...prev, creneau: null, horaire: { debut: "", fin: "" } }));
    } else {
      setForm(prev => ({ ...prev, creneau: null, horaire: { debut: "", fin: "" } }));
    }
  }, [typeMenu]);

  const togglePlat = id =>
    setForm(prev => ({
      ...prev,
      platsSelected: prev.platsSelected.includes(id)
        ? prev.platsSelected.filter(p => p !== id)
        : [...prev.platsSelected, id]
    }));

  const formatTime = (dateObj) => {
    const h = dateObj.getHours().toString().padStart(2, "0");
    const m = dateObj.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  const submitMenu = async () => {
    const repasVal = form.creneau;
    const debutVal = form.horaire?.debut;
    const finVal = form.horaire?.fin;
    const capVal = form.capacite;
    if (!typeMenu || !repasVal || !capVal || !debutVal || !finVal) {
      Alert.alert("Erreur", "Tous les champs sont obligatoires");
      return;
    }

    const payload = {
      date: formatISO(date),
      repas: repasVal,
      creneau: `${debutVal}-${finVal}`,
      capacite: Number(capVal),
      plats: form.platsSelected,
      typeMenu
    };

    try {
      await MenuService.addMenu(payload);
      await onSave?.();

      setTypeMenu("");
      setForm({ creneau: null, horaire: { debut: "", fin: "" }, capacite: "", platsSelected: [] });
      onClose();
    } catch {
      Alert.alert("Erreur", "Erreur serveur");
    }
  };

  return (
    <Modal isVisible={isVisible} onBackdropPress={onClose} style={styles.modal}>
      <View style={styles.sheet}>
        <Text style={styles.title}>Nouveau menu spécial</Text>

        <Text style={styles.label}>Type</Text>
        <View style={styles.pickerWrapper}>
          <Picker selectedValue={typeMenu} onValueChange={setTypeMenu}>
            <Picker.Item label="Choisir" value="" />
            <Picker.Item label="Ramadan" value="ramadan" />
            <Picker.Item label="Examens" value="examens" />
            <Picker.Item label="Événement" value="evenement" />
          </Picker>
        </View>

        {(typeMenu === "ramadan" || typeMenu === "evenement" || typeMenu === "examens") && (
          <View style={styles.field}>
            <Text style={styles.label}>Repas</Text>
            {typeMenu === "ramadan" ? (
              <Text style={styles.fixedCreneau}>Diner (fixe)</Text>
            ) : typeMenu === "examens" ? (
              <View style={styles.row}>
                {["dejeuner", "diner"].map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.timeBtn, form.creneau === c && { backgroundColor: "#ddd" }]}
                    onPress={() => {
                      const fix = HORAIRES_FIXES[c];
                      setForm(prev => ({
                        ...prev,
                        creneau: c,
                        horaire: { debut: fix.debut, fin: fix.fin }
                      }));
                    }}
                  >
                    <Text style={{ fontWeight: "700" }}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.fixedCreneau}>Libre (fixe)</Text>
            )}

            <Text style={[styles.label, { marginTop: 10 }]}>Créneau</Text>

            {/* Sélection horaire */}
            {typeMenu === "examens" ? (
              <View style={styles.previewBox}>
                <Text style={styles.previewText}>
                  {form.horaire.debut && form.horaire.fin
                    ? `${form.horaire.debut} - ${form.horaire.fin}`
                    : "Choisir repas pour horaire fixe"}
                </Text>
              </View>
            ) : (
              <>
                <TouchableOpacity style={styles.timeBtn} onPress={() => setShowPicker("debut")}>
                  <Text>Début : {form.horaire.debut || "Choisir"}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.timeBtn} onPress={() => setShowPicker("fin")}>
                  <Text>Fin : {form.horaire.fin || "Choisir"}</Text>
                </TouchableOpacity>
              </>
            )}

            {/* PICKER MOBILE */}
            {showPicker && Platform.OS !== "web" && typeMenu !== "examens" && (
              <DateTimePicker
                value={new Date()}
                mode="time"
                is24Hour={true}
                display="default"
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    const time = formatTime(selectedDate);

                    setForm(prev => ({
                      ...prev,
                      horaire: {
                        ...prev.horaire,
                        [showPicker]: time
                      }
                    }));
                  }
                  setShowPicker(null); // 🔥 fermeture auto
                }}
              />
            )}

            {/* WEB */}
            {Platform.OS === "web" && typeMenu !== "examens" && (
              <>
                <input
                  type="time"
                  value={form.horaire.debut}
                  onChange={e =>
                    setForm(prev => ({
                      ...prev,
                      horaire: { ...prev.horaire, debut: e.target.value }
                    }))
                  }
                  style={styles.webTimeInput}
                />

                <input
                  type="time"
                  value={form.horaire.fin}
                  onChange={e =>
                    setForm(prev => ({
                      ...prev,
                      horaire: { ...prev.horaire, fin: e.target.value }
                    }))
                  }
                  style={styles.webTimeInput}
                />
              </>
            )}

            {/* AFFICHAGE */}
            <View style={styles.previewBox}>
              <Text style={styles.previewText}>
                {form.horaire.debut && form.horaire.fin
                  ? `${form.horaire.debut} - ${form.horaire.fin}`
                  : "Aucun créneau choisi"}
              </Text>
            </View>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="Capacité"
          keyboardType="numeric"
          value={form.capacite}
          onChangeText={t => setForm({ ...form, capacite: t })}
        />

        <ScrollView style={{ maxHeight: 150 }}>
          {plats.map(p => (
            <TouchableOpacity key={p._id} style={styles.platRow} onPress={() => togglePlat(p._id)}>
              <Text>{p.nom}</Text>
              {form.platsSelected.includes(p._id) && (
                <Ionicons name="checkmark-circle" size={18} color="green" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.saveBtn} onPress={submitMenu}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Créer</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { justifyContent: "flex-end", margin: 0 },
  sheet: { backgroundColor: "#fff", padding: 20, borderTopRadius: 24 },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  label: { fontWeight: "700", marginBottom: 6 },
  field: { marginBottom: 14 },

  input: {
    backgroundColor: "#f3eee8",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10
  },

  platRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12
  },

  pickerWrapper: {
    backgroundColor: "#f3eee8",
    borderRadius: 12,
    marginBottom: 12
  },

  saveBtn: {
    backgroundColor: "#333",
    padding: 14,
    borderRadius: 14,
    marginTop: 10
  },

  fixedCreneau: {
    backgroundColor: "#eee",
    padding: 12,
    borderRadius: 12
  },

  webTimeInput: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10
  },

  timeBtn: {
    backgroundColor: "#f3eee8",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8
  },

  previewBox: {
    backgroundColor: "#eee",
    padding: 12,
    borderRadius: 12,
    marginTop: 10
  },

  previewText: {
    textAlign: "center",
    fontWeight: "700"
  }
});
