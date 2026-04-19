// Screen Admin “Profil”: UI pour afficher/éditer le profil admin via AuthService
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  StatusBar,
  SafeAreaView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AuthService from "../../services/AuthService";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Colors from "../../constants/Colors";
import BottomTabs from "../../navigation/BottomTabs";

export default function AdminProfile() {
  const navigation = useNavigation();
  const [admin, setAdmin] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);

  const loadAdmin = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Erreur", "Token manquant !");
        return;
      }
      const data = await AuthService.getProfile(token);
      if (data.admin) {
        setAdmin(data.admin);
        setForm(data.admin);
      } else {
        Alert.alert("Erreur", data.message || "Impossible de récupérer le profil");
      }
    } catch (err) {
      console.log(err);
      Alert.alert("Erreur", "Impossible de récupérer le profil admin");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAdmin();
    }, [])
  );

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      const data = await AuthService.updateProfile(token, {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        address: form.address,
        bio: form.bio
      });

      if (data.admin) {
        setAdmin(data.admin);
        setForm(data.admin);
        setEditMode(false);
        Alert.alert("Succès", "Profil mis à jour !");
      } else {
        Alert.alert("Erreur", data.message || "Impossible de mettre à jour le profil");
      }
    } catch (err) {
      console.log(err);
      Alert.alert("Erreur", "Impossible de mettre à jour le profil");
    } finally {
      setLoading(false);
    }
  };

  const InfoRow = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={20} color={Colors.accent} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || "Non renseigné"}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.primary} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil Admin</Text>
        <TouchableOpacity 
          style={styles.editButton} 
          onPress={() => setEditMode(!editMode)}
        >
          <Ionicons 
            name={editMode ? "close-outline" : "pencil-outline"} 
            size={24} 
            color={Colors.text} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHero}>
          <View style={styles.avatarContainer}>
            <Image
              source={require("../../assets/admin-placeholder.png")}
              style={styles.avatar}
            />
            {editMode && (
              <TouchableOpacity style={styles.cameraBadge}>
                <Ionicons name="camera-outline" size={20} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.adminName}>{admin?.fullName || "Administrateur"}</Text>
          <Text style={styles.adminRole}>{admin?.role || "Super Admin"}</Text>
        </View>

        {loading && !admin ? (
          <ActivityIndicator size="large" color={Colors.accent} style={{ marginTop: 50 }} />
        ) : (
          <View style={styles.formContainer}>
            {editMode ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nom Complet</Text>
                  <TextInput
                    style={styles.input}
                    value={form.fullName || ""}
                    onChangeText={t => setForm({ ...form, fullName: t })}
                    placeholder="Ex: Jean Dupont"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={form.email || ""}
                    onChangeText={t => setForm({ ...form, email: t })}
                    placeholder="admin@example.com"
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Téléphone</Text>
                  <TextInput
                    style={styles.input}
                    value={form.phone || ""}
                    onChangeText={t => setForm({ ...form, phone: t })}
                    placeholder="06 00 00 00 00"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Adresse</Text>
                  <TextInput
                    style={styles.input}
                    value={form.address || ""}
                    onChangeText={t => setForm({ ...form, address: t })}
                    placeholder="Adresse du bureau"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Bio</Text>
                  <TextInput
                    style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                    multiline
                    value={form.bio || ""}
                    onChangeText={t => setForm({ ...form, bio: t })}
                    placeholder="Quelques mots sur vous..."
                  />
                </View>

                <TouchableOpacity 
                  style={[styles.saveButton, loading && { opacity: 0.7 }]} 
                  onPress={handleSave}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.saveText}>Enregistrer les modifications</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.infoCard}>
                <InfoRow icon="person-outline" label="Nom" value={admin?.fullName} />
                <View style={styles.divider} />
                <InfoRow icon="mail-outline" label="Email" value={admin?.email} />
                <View style={styles.divider} />
                <InfoRow icon="call-outline" label="Téléphone" value={admin?.phone} />
                <View style={styles.divider} />
                <InfoRow icon="location-outline" label="Adresse" value={admin?.address} />
                <View style={styles.divider} />
                <InfoRow icon="book-outline" label="Bio" value={admin?.bio} />
              </View>
            )}
          </View>
        )}
      </ScrollView>
      <BottomTabs />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#FFF",
  },
  editButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#FFF",
  },
  scrollContent: {
    paddingBottom: 120,
  },
  profileHero: {
    alignItems: "center",
    paddingVertical: 30,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 15,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#FFF",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 5,
    backgroundColor: Colors.accent,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFF",
  },
  adminName: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.text,
  },
  adminRole: {
    fontSize: 14,
    color: Colors.text,
    opacity: 0.6,
    marginTop: 4,
  },
  formContainer: {
    paddingHorizontal: 20,
  },
  infoCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.text,
    opacity: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 15,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  saveButton: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    marginTop: 10,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
