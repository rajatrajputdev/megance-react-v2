import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN || "megance-8fc33.firebaseapp.com";
  return defineConfig({
    plugins: [react()],
    server: {
      host: "127.0.0.1",
      port: 5173,
      proxy: {
        // Proxy Firebase Auth handler/iframe to avoid 404s in dev
        "/__/auth": {
          target: `https://${authDomain}`,
          changeOrigin: true,
        },
      },
    },
  });
};
