import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(240 5.9% 10% / 0.15)",
        ring: "hsl(240 5% 64.9%)",
        background: "hsl(240 10% 3.9%)",
        foreground: "hsl(0 0% 98%)",
        muted: "hsl(240 3.7% 15.9%)",
        mutedForeground: "hsl(240 5% 64.9%)",
        primary: "hsl(221.2 83.2% 53.3%)",
        primaryForeground: "hsl(210 40% 98%)",
        card: "hsl(240 10% 5.9%)",
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
    },
  },
  plugins: [],
};

export default config;
