// Screen Admin “Liste des plats”: UI liste + recherche, données via PlatService
import React, { useState, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  FlatList,
  TextInput,
  StyleSheet,
  Image,
  Text,
  TouchableOpacity
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import PlatService from "../../services/PlatService";
import BottomTabs from "../../navigation/BottomTabs";
import PlanningScreen from "./PlanningScreen"; // Same folder now

import { getImageUri } from "../../utils/image";

export default function PlatListScreen({ navigation, route }) {
  const [plats, setPlats] = useState([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(route?.params?.initialTab || "Plats"); // Tab active

  const loadPlats = async () => {
    try {
      const data = await PlatService.getAllPlats();
      setPlats(data);
    } catch (error) {
      console.log("Erreur chargement plats", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPlats();
      const requestedTab = route?.params?.initialTab;
      if (requestedTab === "Plats" || requestedTab === "Planning") {
        setActiveTab(requestedTab);
      }
    }, [route?.params?.initialTab])
  );

  const filtered = plats.filter(p =>
    p.nom.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }) => {
    const imageUri = getImageUri(item.photo);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("PlatDetail", { plat: item })}
        activeOpacity={0.9}
      >
        {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.typeAlimentaire}</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.nom}>{item.nom}</Text>
          <Text style={styles.subtitle}>{item.typePlat} • {item.calories} kcal</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.edit}
              onPress={() => navigation.navigate("ModifierPlat", { plat: item })}
            >
              <Text>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.delete}
              onPress={() => PlatService.deletePlat(item._id).then(loadPlats)}
            >
              <Text>🗑</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.topHeader}>
        <Text style={styles.adminText}>Admin Panel</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Notifications")}>
          <Ionicons name="notifications-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "Plats" && styles.tabActive]}
          onPress={() => setActiveTab("Plats")}
        >
          <Text style={[styles.tabText, activeTab === "Plats" && styles.tabTextActive]}>
            Plats
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "Planning" && styles.tabActive]}
          onPress={() => setActiveTab("Planning")}
        >
          <Text style={[styles.tabText, activeTab === "Planning" && styles.tabTextActive]}>
            Planning
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenu des tabs */}
      <View style={{ flex: 1 }}>
        {/* Plats */}
        <View style={{ display: activeTab === "Plats" ? "flex" : "none", flex: 1 }}>
          <TextInput
            placeholder="🔍 Rechercher un plat..."
            value={search}
            onChangeText={setSearch}
            style={styles.search}
          />

          <TouchableOpacity
            style={styles.addPlatButton}
            onPress={() => navigation.navigate("AjouterPlat")}
          >
            <Text style={styles.addPlatText}>➕ Ajouter un plat</Text>
          </TouchableOpacity>

          <FlatList
            data={filtered}
            keyExtractor={item => item._id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 120 }}
          />
        </View>

        {/* Planning */}
        <View style={{ display: activeTab === "Planning" ? "flex" : "none", flex: 1 }}>
          <PlanningScreen />
        </View>
      </View>

      <BottomTabs navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF7F3" },
  topHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 16, marginTop: 16, marginBottom: 12 },
  adminText: { fontSize: 18, fontWeight: "bold", color: "#333" },
  tabsContainer: { flexDirection: "row", backgroundColor: "#EFE3D8", borderRadius: 25, marginHorizontal: 16, padding: 4, marginBottom: 10 },
  tabButton: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 20 },
  tabActive: { backgroundColor: "#fff" },
  tabText: { fontWeight: "bold", fontSize: 14, color: "#333" },
  tabTextActive: { color: "#333" },
  search: { backgroundColor: "#fff", marginHorizontal: 16, borderRadius: 16, padding: 12, fontSize: 15, marginVertical: 10 },
  addPlatButton: { backgroundColor: "#EFE3D8", marginHorizontal: 16, borderRadius: 20, paddingVertical: 12, alignItems: "center", marginBottom: 10 },
  addPlatText: { fontWeight: "600", fontSize: 15, color: "#333" },
  card: { backgroundColor: "#fff", marginHorizontal: 16, marginBottom: 16, borderRadius: 20, overflow: "hidden", elevation: 3 },
  image: { height: 160, width: "100%" },
  badge: { position: "absolute", top: 10, right: 10, backgroundColor: "#6B4EFF", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  content: { padding: 14 },
  nom: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  subtitle: { color: "#777", marginBottom: 6 },
  actions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8 },
  edit: { marginRight: 10, backgroundColor: "#EFE3D8", padding: 8, borderRadius: 10 },
  delete: { backgroundColor: "#F8D7DA", padding: 8, borderRadius: 10 },
});
