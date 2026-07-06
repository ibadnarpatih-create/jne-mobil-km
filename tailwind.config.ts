import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        jne: { red: "#e31e24", blue: "#172d72", pale: "#f4f6fb" },
      },
      boxShadow: { soft: "0 12px 36px rgba(23,45,114,.10)" },
      borderRadius: { xl2: "1.25rem" },
    },
  },
  plugins: [],
} satisfies Config;
