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
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "-apple-system",
          "system-ui",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        border: "hsl(220 13% 18%)",
        ring: "hsl(215 20% 40%)",
        background: "hsl(220 16% 7%)",
        foreground: "hsl(210 20% 95%)",
        muted: "hsl(220 14% 12%)",
        mutedForeground: "hsl(218 11% 55%)",
        primary: "hsl(210 100% 62%)",
        primaryForeground: "hsl(0 0% 100%)",
        card: "hsl(220 15% 9%)",
        cardBorder: "hsl(220 13% 15%)",
        accent: "hsl(162 72% 46%)",
        destructive: "hsl(0 72% 51%)",
        surface: "hsl(220 14% 11%)",
      },
      borderRadius: {
        "2xl": "1rem",
        xl: "0.75rem",
        lg: "0.625rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)",
        glow: "0 0 20px -5px hsl(210 100% 62% / 0.15)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
