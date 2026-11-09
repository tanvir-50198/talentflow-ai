/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"] },
      colors: {
        bg: "#030a07", surface: "#07130f", card: "#0a1812", line: "#15382b",
        ink: "#e9f5ef", muted: "#86a597",
        brand: { DEFAULT: "#34d399", 600: "#10b981", 700: "#059669" },
        warn: "#f5b942",
      },
      boxShadow: { glow: "0 0 24px -4px rgba(52,211,153,.45)" },
    },
  },
  plugins: [],
};
