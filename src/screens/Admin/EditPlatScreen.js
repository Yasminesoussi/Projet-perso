// Screen Admin “Modifier Plat”: UI pour éditer un plat via PlatService
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Platform
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import PlatService from "../../services/PlatService";
import { getImageUri } from "../../utils/image";

export default function EditPlatScreen({ route, navigation }) {
  const { plat } = route.params;

  const [nom, setNom] = useState(plat.nom);
  const [typePlat, setTypePlat] = useState(plat.typePlat || "plat");
  const [typeAlimentaire, setTypeAlimentaire] = useState(
    typeof plat.typeAlimentaire === "string" ? plat.typeAlimentaire : "equilibre"
  );
  const [calories, setCalories] = useState(String(plat.calories || ""));
  const [ingredients, setIngredients] = useState((plat.ingredients || []).join(", "));
  const [allergenes, setAllergenes] = useState((plat.allergenes || []).join(", "));
  const [image, setImage] = useState(getImageUri(plat.photo));
  const [imageFile, setImageFile] = useState(null);

  // 🔹 Choisir une image
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Permission refusée pour accéder aux photos !");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setImageFile(result.assets[0]);
    }
  };

  // 🔹 Modifier le plat
  const updatePlat = async () => {
    try {
      const formData = new FormData();
      formData.append("nom", nom);
      formData.append("typePlat", typePlat);
      formData.append("typeAlimentaire", typeAlimentaire); // juste string
      formData.append("calories", calories);
      formData.append("ingredients", ingredients);
      formData.append("allergenes", allergenes);

      if (imageFile) {
        if (Platform.OS === 'web') {
          // Expo Web : imageFile contient un blob ou on peut le fetcher
          const response = await fetch(imageFile.uri);
          const blob = await response.blob();
          formData.append("photo", blob, imageFile.name || "photo.jpg");
        } else {
          // Mobile (Android/iOS)
          const filename = imageFile.uri.split("/").pop();
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : `image`;
          formData.append("photo", { uri: imageFile.uri, name: filename, type });
        }
      }

      const response = await PlatService.updatePlat(plat._id, formData);
      
      // Axios renvoie la data directement, on vérifie si l'id existe
      if (response && response._id) {
        Alert.alert("Succès", "Plat modifié avec succès !");
        navigation.goBack();
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Erreur", "Impossible de modifier le plat");
    }
  };

  // 🔹 Supprimer le plat
  const deletePlat = async () => {
    Alert.alert(
      "Confirmation",
      "Voulez-vous vraiment supprimer ce plat ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await PlatService.deletePlat(plat._id);
              Alert.alert("Succès", "Plat supprimé !");
              navigation.goBack();
            } catch (error) {
              console.error(error);
              Alert.alert("Erreur", "Impossible de supprimer le plat");
            }
          }
        }
      ]
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.dragBar} />
          <Text style={styles.title}>Modifier un Plat</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <TextInput
              style={styles.input}
              placeholder="Nom du plat"
              value={nom}
              onChangeText={setNom}
            />

            <View style={styles.dropdown}>
              <Picker selectedValue={typePlat} onValueChange={setTypePlat}>
                <Picker.Item label="Entrée" value="entree" />
                <Picker.Item label="Plat" value="plat" />
                <Picker.Item label="Dessert" value="dessert" />
              </Picker>
            </View>

            <Text style={styles.sectionTitle}>Type alimentaire</Text>
            <View style={styles.dropdown}>
              <Picker selectedValue={typeAlimentaire} onValueChange={setTypeAlimentaire}>
                <Picker.Item label="Léger" value="leger" />
                <Picker.Item label="Équilibré" value="equilibre" />
                <Picker.Item label="Énergétique" value="energetique" />
              </Picker>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Calories"
              keyboardType="numeric"
              value={calories}
              onChangeText={setCalories}
            />

            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Ingrédients (séparés par des virgules)"
              multiline
              value={ingredients}
              onChangeText={setIngredients}
            />

            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Allergènes (séparés par des virgules)"
              multiline
              value={allergenes}
              onChangeText={setAllergenes}
            />

            <Text style={styles.sectionTitle}>Photo du plat</Text>
            <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
              <Text style={styles.photoButtonText}>Choisir une photo</Text>
            </TouchableOpacity>
            {image && <Image source={{ uri: image }} style={styles.imagePreview} />}

            <TouchableOpacity style={styles.button} onPress={updatePlat}>
              <Text style={styles.buttonText}>Modifier</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#FF4D4D" }]}
              onPress={deletePlat}
            >
              <Text style={styles.buttonText}>Supprimer</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.cancel}>Annuler</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  modal: { backgroundColor: "#fff", borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, maxHeight: "90%" },
  dragBar: { width: 40, height: 5, backgroundColor: "#ccc", borderRadius: 3, alignSelf: "center", marginBottom: 12 },
  title: { fontSize: 18, fontWeight: "bold", textAlign: "center", marginBottom: 16 },
  input: { backgroundColor: "#F7F2ED", borderRadius: 14, padding: 12, marginBottom: 10 },
  textarea: { height: 80, textAlignVertical: "top" },
  dropdown: { backgroundColor: "#F7F2ED", borderRadius: 14, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: "600", marginBottom: 8, color: "#444" },
  button: { backgroundColor: "#6B4EFF", padding: 14, borderRadius: 18, alignItems: "center", marginTop: 6 },
  buttonText: { color: "#fff", fontWeight: "bold" },
  cancel: { textAlign: "center", marginTop: 12, color: "#999" },
  photoButton: { backgroundColor: "#F7F2ED", padding: 12, borderRadius: 14, alignItems: "center", marginBottom: 10 },
  photoButtonText: { color: "#333", fontWeight: "600" },
  imagePreview: { width: "100%", height: 200, borderRadius: 14, marginBottom: 10 }
});
