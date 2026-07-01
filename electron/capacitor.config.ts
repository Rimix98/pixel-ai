import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pixelai.app",
  appName: "Pixel AI",
  webDir: "out",
  server: {
    url: "https://rimix-pixel-ai.vercel.app",
    cleartext: true,
    androidScheme: "https",
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
};

export default config;
