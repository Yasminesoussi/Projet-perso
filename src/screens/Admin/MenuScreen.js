// Screen Admin “Menu”: UI simple pour créer un menu via MenuService
// - La logique métier/validation reste dans MenuService/Usecases si nécessaire
import React, { useState } from "react";
import { View, TextInput, Button } from "react-native";
import MenuService from "../../services/MenuService";

export default function MenuScreen() {
  const [date, setDate] = useState("");
  const [capacite, setCapacite] = useState("");

  const saveMenu = async () => {
    try {
      await MenuService.addMenu({
        date,
        repas: "dejeuner",
        creneau: "12h00 → 14h30",
        plats: [],
        capacite,
        typeMenu: "normal"
      });
      alert("Menu créé !");
    } catch (error) {
      alert("Erreur création menu");
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        placeholder="Date (YYYY-MM-DD)"
        onChangeText={setDate}
        style={{ borderWidth: 1, marginBottom: 10 }}
      />

      <TextInput
        placeholder="Capacité"
        keyboardType="numeric"
        onChangeText={setCapacite}
        style={{ borderWidth: 1, marginBottom: 10 }}
      />

      <Button title="Créer Menu" onPress={saveMenu} />
    </View>
  );
}
