// Bridge Stripe web / fallback.
// On retourne des no-op pour ne pas casser le bundle web.

import React from "react";

export function StripeProvider({ children }) {
  return <>{children}</>;
}

export function useStripe() {
  return {
    initPaymentSheet: async () => ({
      error: {
        code: "WEB_NOT_SUPPORTED",
        message: "Le paiement Stripe in-app est disponible sur Android et iOS.",
      },
    }),
    presentPaymentSheet: async () => ({
      error: {
        code: "WEB_NOT_SUPPORTED",
        message: "Le paiement Stripe in-app est disponible sur Android et iOS.",
      },
    }),
  };
}

export const isStripeSupported = false;
