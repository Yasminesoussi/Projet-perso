// Screen Admin “Demandes Étudiants”: UI + state + navigation uniquement
// Logique métier d’administration via AdminStudentsService (pas de usecases)
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert } from "react-native";
import AdminStudentsService from "../../services/AdminStudentsService";

export default function StudentRequestsScreen() {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const items = await AdminStudentsService.listPendingView();
      setStudents(items);
    } catch (e) {
      Alert.alert("Erreur", "Impossible de charger les demandes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const approve = async (id) => {
    try {
      await AdminStudentsService.approve(id);
      Alert.alert("Succès", "Étudiant approuvé");
      load();
    } catch {
      Alert.alert("Erreur", "Action impossible");
    }
  };

  const reject = async (id) => {
    try {
      await AdminStudentsService.reject(id);
      Alert.alert("Info", "Étudiant refusé");
      load();
    } catch {
      Alert.alert("Erreur", "Action impossible");
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <Image source={{ uri: item.imageUri }} style={styles.cardImage} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.name}>{item.fullName}</Text>
          <Text style={styles.info}>{item.email} • {item.phone}</Text>
          <Text style={styles.info}>{item.university} • {item.level}</Text>
          <Text style={styles.info}>Numéro: {item.studentNumber}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, styles.approve]} onPress={() => approve(item._id)}>
          <Text style={styles.actionText}>Approuver</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.reject]} onPress={() => reject(item._id)}>
          <Text style={styles.actionText}>Refuser</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Demandes Étudiants</Text>
      <FlatList
        data={students}
        keyExtractor={(s) => s._id}
        renderItem={renderItem}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={<Text style={styles.empty}>Aucune demande en attente</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FAF7F3", padding: 16 },
  title: { fontSize: 20, fontWeight: "700", color: "#3F3A36", marginBottom: 12 },
  card: { backgroundColor: "#FFF", borderRadius: 16, padding: 12, marginBottom: 12, elevation: 3 },
  row: { flexDirection: "row", alignItems: "center" },
  cardImage: { width: 80, height: 80, borderRadius: 8, backgroundColor: "#EEE" },
  name: { fontSize: 16, fontWeight: "700", color: "#3F3A36" },
  info: { fontSize: 12, color: "#6B6B6B", marginTop: 2 },
  actions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 10 },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, marginLeft: 8 },
  approve: { backgroundColor: "#4CAF50" },
  reject: { backgroundColor: "#E53935" },
  actionText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  empty: { textAlign: "center", color: "#777", marginTop: 20 }
});
