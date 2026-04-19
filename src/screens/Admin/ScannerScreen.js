// Screen Admin “Scanner”: scan QR → POST /admin/scan/consume, toasts de feedback
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform, ToastAndroid, Alert } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import AdminScanService from "../../services/AdminScanService";

function toast(msg) {
  if (Platform.OS === "android") ToastAndroid.show(msg, ToastAndroid.SHORT);
  else Alert.alert("Info", msg);
}

export default function ScannerScreen({ route }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [busy, setBusy] = useState(false);
  const flow = route?.params?.flow === "consume" ? "consume" : "kitchen-arrival";

  useEffect(() => {
    if (!permission) requestPermission();
  }, [permission]);

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned || busy) return;
    setScanned(true);
    setBusy(true);
    try {
      const payload = data; // data = base64url string encodée par l’app étudiant
      if (flow === "kitchen-arrival") {
        await AdminScanService.scanKitchenArrival(payload);
        toast("Commande ajoutee a la cuisine");
      } else {
        await AdminScanService.consume(payload);
        toast("Passage valide");
      }
    } catch (e) {
      const msg = e?.response?.data?.message || "QR refusé";
      toast(msg);
    } finally {
      setBusy(false);
      setTimeout(() => setScanned(false), 800); // petite pause avant réactiver scan
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.info}>Demande d’autorisation caméra…</Text>
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.info}>Caméra non autorisée</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Autoriser la caméra</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={handleBarCodeScanned}
        barcodeScannerSettings={{ barCodeTypes: ["qr"] }}
      />
      <View style={styles.overlayBottom}>
        <Text style={styles.caption}>
          {busy ? "Validation..." : flow === "kitchen-arrival" ? "Scannez l arrivee pour envoyer en attente cuisine" : "Visez le QR etudiant"}
        </Text>
        <TouchableOpacity style={styles.btn} onPress={() => setScanned(false)} disabled={busy}>
          <Text style={styles.btnText}>Réactiver le scan</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  info: { color: "#3F3A36", fontWeight: "700" },
  overlayBottom: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  caption: { color: "#fff", fontWeight: "800", marginBottom: 10 },
  btn: { backgroundColor: "#B79379", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  btnText: { color: "#fff", fontWeight: "800" },
});
