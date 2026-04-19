// Bridge Stripe pour Android / iOS.
// Sur mobile natif on expose le vrai SDK Stripe.

export { StripeProvider, useStripe } from "@stripe/stripe-react-native";

export const isStripeSupported = true;
