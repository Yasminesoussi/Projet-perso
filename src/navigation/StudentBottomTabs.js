// Barre de navigation du parcours etudiant.
// Elle permet d'acceder vite aux menus, commandes, reservations et profil.

import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function StudentBottomTabs() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const current = route?.name;
  // On detecte ici l'ecran actif pour surligner le bon onglet.
  const isHome = current === "StudentHome";
  const isMenu = current === "StudentMenu" || current === "StudentPlatDetail";
  const isReserve =
    current === "StudentOrders";
  const isReservations = current === "StudentReservations";
  const isProfile = current === "StudentProfile" || current === "StudentWallet";

  return (
    <View style={styles.container}>
      <View style={[styles.bottomFill, { height: Math.max(insets.bottom, 18) + 18 }]} />
      <View style={[styles.tabBar, { bottom: Math.max(insets.bottom, 18) + -5 }]}>
        <TouchableOpacity style={styles.tabButton} onPress={() => navigation.navigate("StudentHome")}>
          <Ionicons name="grid-outline" size={22} color={isHome ? "#6B4EFF" : "#333"} />
          <Text style={[styles.label, isHome && styles.activeLabel]}>Accueil</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabButton} onPress={() => navigation.navigate("StudentMenu")}>
          <Ionicons name="restaurant-outline" size={22} color={isMenu ? "#6B4EFF" : "#333"} />
          <Text style={[styles.label, isMenu && styles.activeLabel]}>Menus</Text>
        </TouchableOpacity>
        {/* Bouton central pour l'historique des commandes. */}
        <TouchableOpacity style={styles.centerButton} onPress={() => navigation.navigate("StudentOrders")}>
          <Ionicons name="receipt-outline" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabButton} onPress={() => navigation.navigate("StudentReservations")}>
          <Ionicons name="layers-outline" size={22} color={isReservations ? "#6B4EFF" : "#333"} />
          <Text style={[styles.label, isReservations && styles.activeLabel]}>Reservations</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabButton} onPress={() => navigation.navigate("StudentProfile")}>
          <Ionicons name="menu-outline" size={24} color={isProfile ? "#6B4EFF" : "#333"} />
          <Text style={[styles.label, isProfile && styles.activeLabel]}>Plus</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  bottomFill: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
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
  centerButton: {
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
