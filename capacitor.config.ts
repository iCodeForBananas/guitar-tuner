import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.icodeforbananas.guitartuner",
  appName: "Guitar Tuner",
  webDir: "dist",
  backgroundColor: "#101214",
  ios: {
    contentInset: "never",
    scrollEnabled: false,
  },
};

export default config;
