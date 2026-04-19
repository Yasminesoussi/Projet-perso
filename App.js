// Point d'entree de l'application mobile.
// On branche ici les providers globaux puis la navigation principale.

import React from "react";
import AppNavigator from "./src/navigation/AppNavigator";
import { PaperProvider } from "react-native-paper";
import { NotificationProvider } from "./src/context/NotificationContext";
import { StripeProvider } from "./src/lib/stripe";
import {
  getStripeUrlScheme,
  STRIPE_MERCHANT_IDENTIFIER,
  STRIPE_PUBLISHABLE_KEY,
} from "./src/config/stripe";

export default function App() {
  const content = (
    <PaperProvider>
      <NotificationProvider>
        <AppNavigator />
      </NotificationProvider>
    </PaperProvider>
  );

  if (!STRIPE_PUBLISHABLE_KEY) {
    return content;
  }

  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier={STRIPE_MERCHANT_IDENTIFIER || undefined}
      urlScheme={getStripeUrlScheme()}
    >
      {content}
    </StripeProvider>
  );
}
