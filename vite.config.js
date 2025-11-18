import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	plugins: [
		react(),
		tailwindcss()
	],
	server: {
		port: 3000,
		strictPort: false, // If port 3000 is in use, automatically try next available port
		proxy: {
			"/api": {
				target: "https://dahlia-full.herokuapp.com",
				changeOrigin: true,
				secure: true,
				rewrite: (path) => path
			}
		}
	}
});
