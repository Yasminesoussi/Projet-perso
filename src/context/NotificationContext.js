// Ce contexte permet d'afficher une notification simple depuis n'importe quel ecran.

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Portal, Snackbar } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";

const NotificationContext = createContext({
  showNotification: () => {},
});

export function NotificationProvider({ children }) {
  const [notification, setNotification] = useState({
    visible: false,
    message: "",
    type: "info",
  });

  const showNotification = useCallback((message, type = "info") => {
    setNotification({
      visible: true,
      message,
      type,
    });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification((prev) => ({ ...prev, visible: false }));
  }, []);

  const value = useMemo(() => ({ showNotification }), [showNotification]);

  // Chaque type de message a son style visuel.
  const palette = {
    success: { bg: "#EAF8F1", border: "#8FD3B2", icon: "checkmark-circle", iconColor: "#1E8E5A" },
    error: { bg: "#FDEEEE", border: "#F2A2A2", icon: "close-circle", iconColor: "#C94141" },
    info: { bg: "#EEF1FF", border: "#AAB7FF", icon: "information-circle", iconColor: "#5B5FEF" },
  };

  const currentStyle = palette[notification.type] || palette.info;

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <Portal>
        <Snackbar
          visible={notification.visible}
          onDismiss={hideNotification}
          duration={2600}
          style={[styles.snackbar, { backgroundColor: currentStyle.bg, borderColor: currentStyle.border }]}
          wrapperStyle={styles.wrapper}
        >
          <View style={styles.content}>
            <Ionicons name={currentStyle.icon} size={22} color={currentStyle.iconColor} />
            <Text style={styles.message}>{notification.message}</Text>
          </View>
        </Snackbar>
      </Portal>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  return useContext(NotificationContext);
}

const styles = StyleSheet.create({
  wrapper: {
    top: 12,
  },
  snackbar: {
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    elevation: 6,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  message: {
    flex: 1,
    color: "#2F2A26",
    fontSize: 14,
    fontWeight: "700",
  },
});
