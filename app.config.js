const appJson = require("./app.json");

const { expo } = appJson;

module.exports = {
  ...expo,
  extra: {
    ...expo.extra,
    stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || expo.extra?.stripePublishableKey || "",
    stripeMerchantIdentifier: process.env.EXPO_PUBLIC_STRIPE_MERCHANT_IDENTIFIER || expo.extra?.stripeMerchantIdentifier || "",
  },
};
