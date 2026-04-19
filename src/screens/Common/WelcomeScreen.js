import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function WelcomeScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.screen}>
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.title}>Bienvenue au Resto universitaire</Text>
       
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Choisissez votre interface</Text>

        <TouchableOpacity
          style={[styles.button, styles.studentButton]}
          onPress={() => navigation.navigate("StudentLogin")}
        >
          <Text style={styles.buttonText}>Étudiant</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.adminButton]}
          onPress={() => navigation.navigate("AdminLogin")}
        >
          <Text style={styles.buttonText}>Admin</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F1EC", paddingHorizontal: 24, justifyContent: "center" },
  logoContainer: { alignItems: "center", marginBottom: 30 },
  logoImage: { width: 140, height: 140, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "700", color: "#3F3A36", textAlign: "center", alignSelf: "center", width: "100%" },
  subtitle: { fontSize: 14, color: "#8B8378", marginTop: 6 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 6
  },
  cardTitle: { fontSize: 18, fontWeight: "600", color: "#3F3A36", marginBottom: 20, textAlign: "center" },
  button: {
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10
  },
  studentButton: { backgroundColor: "#A78BFA" },
  adminButton: { backgroundColor: "#DCCFC3" },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" }
});
