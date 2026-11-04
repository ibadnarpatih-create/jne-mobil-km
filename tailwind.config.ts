import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        admin: { navy: "#10245A", primary: "#1554C0", alert: "#E51F35", canvas: "#F5F7FB" },
        movetra: { navy: "#101f36", teal: "#008f83", pale: "#f5f7fa" },
        jne: { red: "#e31e24", blue: "#008f83", pale: "#f5f7fa" },
        blue: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
        },
      },
      boxShadow: { soft: "0 8px 32px rgba(15,23,42,.06)" },
      borderRadius: { xl2: "1.25rem" },
    },
  },
  plugins: [],
} satisfies Config;
