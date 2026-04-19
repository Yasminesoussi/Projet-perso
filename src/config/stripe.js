// Configuration Stripe cote mobile.
// Les cles publiques passent par EXPO_PUBLIC_* pour rester accessibles dans Expo.

import Constants from "expo-constants";

export const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  Constants.expoConfig?.extra?.stripePublishableKey ||
  "";

export const STRIPE_MERCHANT_IDENTIFIER =
  process.env.EXPO_PUBLIC_STRIPE_MERCHANT_IDENTIFIER ||
  Constants.expoConfig?.extra?.stripeMerchantIdentifier ||
  "";

export function getStripeUrlScheme() {
  return Constants.expoConfig?.scheme || "mobile";
}
