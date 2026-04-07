import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const clientPort = Number(env.CLIENT_PORT ?? 5173);
  const serverPort = Number(env.SERVER_PORT ?? env.PORT ?? 3456);

  return {
    plugins: [react()],
    root: "./client",
    server: {
      port: clientPort,
      proxy: {
        "/api": {
          target: `http://localhost:${serverPort}`,
          changeOrigin: true
        }
      }
    },
    build: {
      outDir: "../dist/client",
      emptyOutDir: true
    }
  };
});
