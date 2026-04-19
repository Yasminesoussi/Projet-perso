// Screen “Inscription Étudiant”: UI formulaire + navigation, appels via StudentAuthService
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  Switch,
  ScrollView
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import StudentAuthService from "../../services/StudentAuthService";
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";

export default function StudentSignupScreen() {
  const navigation = useNavigation();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState(null); // ❌ plus de date par défaut
  const [dateString, setDateString] = useState(""); // ❌ vide
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [university, setUniversity] = useState("ISG");
  const [level, setLevel] = useState("L1");
  const [studentNumber, setStudentNumber] = useState("");
  const [cardImage, setCardImage] = useState(null);
  const [agreeInfoCorrect, setAgreeInfoCorrect] = useState(false);
  const [agreeAdminVerify, setAgreeAdminVerify] = useState(false);

  const pickImage = async (setImage) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      setImage(result.assets[0]);
    }
  };

  const handleDateTextChange = (text) => {
    setDateString(text);

    const m = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) {
      const dd = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10);
      const yyyy = parseInt(m[3], 10);

      const d = new Date(yyyy, mm - 1, dd);

      if (
        d.getFullYear() === yyyy &&
        d.getMonth() === mm - 1 &&
        d.getDate() === dd
      ) {
        setDateOfBirth(d);
      }
    }
  };

  const handleSignup = async () => {
    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !confirmPassword ||
      !phone ||
      !studentNumber ||
      !dateOfBirth // ✅ obligatoire maintenant
    ) {
      alert("Erreur : veuillez remplir tous les champs");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Email invalide");
      return;
    }

    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!dateRegex.test(dateString)) {
      alert("Date invalide. Format JJ/MM/AAAA");
      return;
    }

    if (password !== confirmPassword) {
      alert("Les mots de passe ne correspondent pas");
      return;
    }

    if (!cardImage || !cardImage.uri) {
      alert("Carte étudiant obligatoire");
      return;
    }

    const studentNumberRegex = /^UNI-\d{4}-\d{4}$/;
    if (!studentNumberRegex.test(studentNumber)) {
      alert("Format: UNI-YYYY-NNNN");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append("firstName", firstName);
      formData.append("lastName", lastName);
      formData.append("dateOfBirth", dateOfBirth.toISOString());
      formData.append("email", email);
      formData.append("phone", phone);
      formData.append("university", university);
      formData.append("level", level);
      formData.append("studentNumber", studentNumber);
      formData.append("agreeInfoCorrect", agreeInfoCorrect);
      formData.append("agreeAdminVerify", agreeAdminVerify);
      formData.append("password", password);

      if (Platform.OS === "web") {
        const res = await fetch(cardImage.uri);
        const blob = await res.blob();
        const file = new File([blob], "carte.jpg", {
          type: blob.type || "image/jpeg",
        });
        formData.append("card", file);
      } else {
        formData.append("card", {
          uri: cardImage.uri,
          name: "carte.jpg",
          type: "image/jpeg",
        });
      }

      await StudentAuthService.signupForm(formData);

      alert(
        "Inscription envoyée.\nVotre compte est en attente de validation."
      );

      navigation.navigate("StudentLogin");
    } catch (error) {
      if (error.response) {
        alert(error.response.data?.message || "Erreur serveur");
      } else {
        alert("Erreur connexion serveur");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.title}>Inscription Étudiant</Text>
          <Text style={styles.subtitle}>Restauration universitaire</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Créer votre compte</Text>

          <Text style={styles.sectionTitle}>Identité</Text>
          <TextInput
            placeholder="Nom"
            placeholderTextColor="#A8A29E"
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
          />
          <TextInput
            placeholder="Prénom"
            placeholderTextColor="#A8A29E"
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
          />

          {/* ✅ INPUT DATE SEULEMENT */}
          <TextInput
            placeholder="JJ/MM/AAAA"
            placeholderTextColor="#A8A29E"
            style={styles.input}
            keyboardType="numeric"
            value={dateString}
            onChangeText={handleDateTextChange}
          />

          <Text style={styles.sectionTitle}>Coordonnées</Text>
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
            placeholder="Numéro de téléphone"
            placeholderTextColor="#A8A29E"
            style={styles.input}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <Text style={styles.sectionTitle}>Informations universitaires</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={university}
              onValueChange={(v) => setUniversity(v)}
            >
              <Picker.Item label="ISG" value="ISG" />
              <Picker.Item label="ENIT" value="ENIT" />
              <Picker.Item label="FST" value="FST" />
              <Picker.Item label="INSAT" value="INSAT" />
            </Picker>
          </View>

          <View style={styles.pickerContainer}>
            <Picker selectedValue={level} onValueChange={(v) => setLevel(v)}>
              <Picker.Item label="Licence L1" value="L1" />
              <Picker.Item label="Licence L2" value="L2" />
              <Picker.Item label="Licence L3" value="L3" />
              <Picker.Item label="Master M1" value="M1" />
              <Picker.Item label="Master M2" value="M2" />
              <Picker.Item label="Ingénieur" value="Ingenieur" />
            </Picker>
          </View>

          <TextInput
            placeholder="Numéro étudiant (ex: UNI-2024-1234)"
            placeholderTextColor="#A8A29E"
            style={styles.input}
            value={studentNumber}
            onChangeText={setStudentNumber}
          />

          <Text style={styles.sectionTitle}>Vérification d’identité</Text>
          <View style={styles.uploadRow}>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => pickImage(setCardImage)}
            >
              <Text style={styles.uploadText}>
                {cardImage && cardImage.uri
                  ? "Carte sélectionnée ✅"
                  : "Uploader carte étudiant"}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Sécurité</Text>
          <TextInput
            placeholder="Mot de passe"
            placeholderTextColor="#A8A29E"
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />
          <TextInput
            placeholder="Confirmation mot de passe"
            placeholderTextColor="#A8A29E"
            secureTextEntry
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <Text style={styles.sectionTitle}>Validation & engagement</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>
              Je certifie que les informations sont correctes
            </Text>
            <Switch
              value={agreeInfoCorrect}
              onValueChange={setAgreeInfoCorrect}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>
              J’accepte la vérification par l’administration
            </Text>
            <Switch
              value={agreeAdminVerify}
              onValueChange={setAgreeAdminVerify}
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Inscription..." : "Créer le compte"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// styles inchangés
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F1EC", paddingHorizontal: 24 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
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
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#3F3A36",
    marginBottom: 20,
  },
  input: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#F3ECE6",
    paddingHorizontal: 16,
    fontSize: 15,
    color: "#3F3A36",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3F3A36",
    marginTop: 12,
    marginBottom: 8,
  },
  pickerContainer: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#F3ECE6",
    marginBottom: 14,
    justifyContent: "center",
  },
  uploadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  uploadButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#DCCFC3",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  uploadText: {
    color: "#3F3A36",
    fontSize: 14,
    fontWeight: "600",
  },
  button: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#A78BFA",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});