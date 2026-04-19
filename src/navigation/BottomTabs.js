// Barre de navigation du parcours admin.
// Elle reste en bas des ecrans principaux pour changer vite de section.

 
import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function BottomTabs() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const current = route?.name;
  // Ces variables servent a colorer l'onglet actuellement actif.
  const isMenus = current === "Plats" || current === "Planning" || current === "PlatDetail";
  const isCuisine = current === "Cuisine";

  return (
    <View style={styles.container}>
      <View style={[styles.bottomFill, { height: Math.max(insets.bottom, 18) + 18 }]} />
      <View style={[styles.tabBar, { bottom: Math.max(insets.bottom, 18) - 18 }]}>
      <TouchableOpacity
        style={styles.tabButton}
        onPress={() => navigation.navigate("Acceuil")}
      >
        <Ionicons name="grid-outline" size={22} color={current === "Acceuil" ? "#6B4EFF" : "#333"} />
        <Text style={[styles.label, current === "Acceuil" && styles.activeLabel]}>Accueil</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabButton}
        onPress={() => navigation.navigate("Plats", { initialTab: "Plats" })}
      >
        <Ionicons name="restaurant-outline" size={22} color={isMenus ? "#6B4EFF" : "#333"} />
        <Text style={[styles.label, isMenus && styles.activeLabel]}>Menus</Text>
      </TouchableOpacity>

      {/* Bouton central: ouvre directement le scan QR. */}
      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => navigation.navigate("Scanner")}
      >
        <Ionicons name="scan-outline" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Onglet cuisine. */}
      <TouchableOpacity
        style={styles.tabButton}
        onPress={() => navigation.navigate("Cuisine")}
      >
        <Ionicons name="layers-outline" size={22} color={isCuisine ? "#6B4EFF" : "#333"} />
        <Text style={[styles.label, isCuisine && styles.activeLabel]}>Cuisine</Text>
      </TouchableOpacity>

      {/* Onglet avec les actions secondaires admin. */}
      <TouchableOpacity
        style={styles.tabButton}
        onPress={() => navigation.navigate("PlusMenu")}
      >
        <Ionicons name="menu-outline" size={24} color={current === "PlusMenu" ? "#6B4EFF" : "#333"} />
        <Text style={[styles.label, current === "PlusMenu" && styles.activeLabel]}>Plus</Text>
      </TouchableOpacity>
      </View>
    </View>
  );
}

/* =======================
   STYLES
======================= */
const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50
  },
  bottomFill: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF"
  },
  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 70,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#FDF8F3",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    zIndex: 51
  },
  tabButton: {
    justifyContent: "center",
    alignItems: "center",
    minWidth: 56
  },
  scanButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#6B4EFF",
    justifyContent: "center",
    alignItems: "center",
    marginTop: -20,
    elevation: 10
  },
  label: {
    fontSize: 10,
    marginTop: 2,
    color: "#333"
  },
  activeLabel: {
    color: "#6B4EFF",
    fontWeight: "700"
  }
});
