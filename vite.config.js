import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	plugins: [
		react(),
		tailwindcss()
	],
	server: {
		proxy: {
			"/api-full": {
				target: "https://dahlia-full.herokuapp.com",
				changeOrigin: true,
				secure: true,
				rewrite: (path) => path.replace(/^\/api-full/, "/api")
			},
			"/api-prod": {
				target: "https://housing.sfgov.org",
				changeOrigin: true,
				secure: true,
				rewrite: (path) => path.replace(/^\/api-prod/, "/api")
			}
		}
	}
});
