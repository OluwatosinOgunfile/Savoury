import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Poppins", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        savoury: {
          primary: "#C62828",
          secondary: "#FFB300",
          accent: "#FFF8E1",
          background: "#FAFAFA",
          ink: "#1E1E1E",
        },
      },
      boxShadow: {
        premium: "0 20px 60px rgba(30, 30, 30, 0.12)",
        soft: "0 10px 30px rgba(30, 30, 30, 0.08)",
      },
      borderRadius: {
        xl: "0.75rem",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
