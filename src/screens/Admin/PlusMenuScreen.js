import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AuthService from "../../services/AuthService";
import BottomTabs from "../../navigation/BottomTabs";

function MenuItem({ icon, label, hint, onPress }) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.92}>
      <View style={styles.itemIcon}>
        <Ionicons name={icon} size={22} color="#6F5A4B" />
      </View>
      <View style={styles.itemBody}>
        <Text style={styles.text}>{label}</Text>
        <Text style={styles.itemHint}>{hint}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9E8B7B" />
    </TouchableOpacity>
  );
}

export default function PlusMenuScreen() {
  const navigation = useNavigation();

  const goTo = (screen) => {
    navigation.navigate(screen);
  };

  const primaryItems = [
    {
      icon: "chatbubbles-outline",
      label: "Avis reservations",
      hint: "Consulter les retours etudiants laisses apres une reservation",
      onPress: () => goTo("ReservationFeedbacks"),
    },
    {
      icon: "layers-outline",
      label: "Cuisine",
      hint: "Piloter la preparation globale et les commandes live",
      onPress: () => goTo("Cuisine"),
    },
    {
      icon: "notifications-outline",
      label: "Notifications",
      hint: "Verifier les alertes et messages",
      onPress: () => goTo("Notifications"),
    },
  ];

  const secondaryItems = [
    {
      icon: "person-outline",
      label: "Profil",
      hint: "Consulter vos informations admin",
      onPress: () => navigation.navigate("AdminProfile"),
    },
  ];

  const handleLogout = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert("Erreur", "Token manquant");
        return;
      }

      await AuthService.logout();

      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: "AdminLogin" }],
        });
      }, 200);
    } catch (err) {
      console.error("Erreur logout", err?.response || err);
      Alert.alert("Erreur", "Impossible de se deconnecter");
    }
  };

  return (
    <>
      <View style={styles.screen}>
        <StatusBar barStyle="dark-content" backgroundColor="#F6EFE7" />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.heroTop}>
              <TouchableOpacity style={styles.topBtn} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={20} color="#2F241E" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.topBtn} onPress={() => navigation.navigate("Acceuil")}>
                <Ionicons name="home-outline" size={20} color="#2F241E" />
              </TouchableOpacity>
            </View>

            <View style={styles.logoShell}>
              <Image source={require("../../assets/logo.png")} style={styles.logo} resizeMode="contain" />
            </View>

            <Text style={styles.eyebrow}>Centre de gestion</Text>
            <Text style={styles.title}>Plus d'options admin</Text>
            <Text style={styles.subtitle}>
              Un espace admin plus pro, plus lisible, avec un acces direct aux modules utiles et aux avis reservation.
            </Text>
          </View>

          <View style={styles.highlightPanel}>
            <Text style={styles.highlightEyebrow}>Nouveau</Text>
            <Text style={styles.highlightTitle}>Consulter les avis sur reservations</Text>
            <Text style={styles.highlightText}>
              Ouvre une page dediee avec des cards propres: etudiant, reservation, notes et commentaire.
            </Text>
            <TouchableOpacity style={styles.highlightButton} onPress={() => goTo("ReservationFeedbacks")}>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
              <Text style={styles.highlightButtonText}>Ouvrir les avis reservation</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Acces rapides</Text>
            <View style={styles.menuList}>
              {primaryItems.map((item) => (
                <MenuItem
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                  hint={item.hint}
                  onPress={item.onPress}
                />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Administration</Text>
            <View style={styles.menuList}>
              {secondaryItems.map((item) => (
                <MenuItem
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                  hint={item.hint}
                  onPress={item.onPress}
                />
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color="#FFF" />
            <Text style={styles.logoutText}>Deconnecter</Text>
          </TouchableOpacity>
        </ScrollView>
        <BottomTabs />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F6EFE7",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 120,
  },
  hero: {
    backgroundColor: "#FFF9F4",
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E8DACC",
    marginBottom: 18,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  topBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#F3E7DB",
    justifyContent: "center",
    alignItems: "center",
  },
  logoShell: {
    width: 78,
    height: 78,
    borderRadius: 24,
    backgroundColor: "#F1E2D3",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  logo: {
    width: 54,
    height: 54,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8A6D57",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#2F241E",
  },
  subtitle: {
    fontSize: 14,
    color: "#6E5B4C",
    lineHeight: 21,
    marginTop: 8,
  },
  highlightPanel: {
    backgroundColor: "#FFF4EA",
    borderRadius: 28,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#E7CBB4",
  },
  highlightEyebrow: {
    color: "#A15C2F",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  highlightTitle: {
    color: "#2F241E",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 8,
  },
  highlightText: {
    color: "#6E5B4C",
    lineHeight: 20,
    marginTop: 8,
    fontSize: 14,
  },
  highlightButton: {
    marginTop: 16,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#C96F38",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#C96F38",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  highlightButtonText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 14,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 18,
    color: "#2F241E",
    fontWeight: "900",
    marginBottom: 10,
  },
  menuList: {
    gap: 12,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#FFF9F4",
    borderWidth: 1,
    borderColor: "#E8DACC",
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F3E7DB",
    justifyContent: "center",
    alignItems: "center",
  },
  itemBody: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },
  text: {
    fontSize: 16,
    color: "#2F241E",
    fontWeight: "700",
  },
  itemHint: {
    fontSize: 12,
    color: "#8D7766",
    marginTop: 4,
  },
  logoutButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E53935",
    paddingVertical: 15,
    borderRadius: 20,
    marginTop: 6,
  },
  logoutText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 10,
  },
});
