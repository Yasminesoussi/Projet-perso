// Screen “Connexion Étudiant”: UI + navigation + gestion formulaire (auth)
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, SafeAreaView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import StudentAuthService from "../../services/StudentAuthService";
import { useNotification } from "../../context/NotificationContext";
import { Ionicons } from "@expo/vector-icons";

export default function StudentLoginScreen() {
  const navigation = useNavigation();
  const { showNotification } = useNotification();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const alert = (message) => {
    const text = String(message || "");
    const normalized = text.toLowerCase();

    if (normalized.includes("impossible de contacter le serveur")) {
      showNotification(
        "Connexion au serveur impossible. Verifie que le backend est lance et que l'URL API est correcte.",
        "error"
      );
      return;
    }

    if (normalized.includes("erreur serveur : 403")) {
      showNotification("Compte en attente de validation par l'administration", "error");
      return;
    }

    const isSuccess = /reussie|r.ussie|succ.s/i.test(text);
    showNotification(text, isSuccess ? "success" : "error");
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showNotification("Veuillez remplir tous les champs", "error");
      return;
    }

    setLoading(true);
    try {
      await StudentAuthService.login(email, password);
      alert("Connexion étudiante réussie !");

      navigation.reset({
        index: 0,
        routes: [{ name: "StudentHome" }],
      });
    } catch (error) {
      if (error.response) {
        alert(
          error.response?.data?.message ||
          (error.response.status === 401
            ? "Email ou mot de passe incorrect"
            : `Erreur serveur : ${error.response.status}`)
        );
      } else {
        alert("Impossible de contacter le serveur" + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.navigate("Welcome")}
      >
        <Ionicons name="arrow-back" size={24} color="#3F3A36" />
      </TouchableOpacity>
      
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.title}>Étudiant</Text>
        <Text style={styles.subtitle}>Restauration universitaire</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Connexion étudiant</Text>

        <TextInput
          placeholder="Email"
          placeholderTextColor="#A8A29E"
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          placeholder="Mot de passe"
          placeholderTextColor="#A8A29E"
          secureTextEntry
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Connexion..." : "Se connecter"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("StudentSignup")} style={styles.link}>
          <Text style={styles.linkText}>Créer un compte étudiant</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAF7F3" },
  backButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 10 : 40,
    left: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  screen: { flex: 1, backgroundColor: "#FAF7F3", paddingHorizontal: 24 },
  logoContainer: { alignItems: "center", marginTop: 80, marginBottom: 40 },
  logoImage: { width: 130, height: 130, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "700", color: "#3F3A36" },
  subtitle: { fontSize: 14, color: "#8B8378", marginTop: 4 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5
  },
  cardTitle: { fontSize: 18, fontWeight: "600", color: "#3F3A36", marginBottom: 20 },
  input: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#FAF7F3",
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#3F3A36",
    marginBottom: 14
  },
  button: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#6B4EFF",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10
  },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  link: { marginTop: 12, alignItems: "center" },
  linkText: { color: "#6B4EFF", fontSize: 14, fontWeight: "500" }
});
