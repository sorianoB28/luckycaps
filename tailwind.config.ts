import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "lucky-green": "#009D00",
        "lucky-dark": "#0b0b0b",
        "lucky-darker": "#050505",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(0, 157, 0, 0.25)",
      },
      backgroundImage: {
        "hero-gradient": "radial-gradient(circle at top, rgba(0,157,0,0.2), transparent 55%), linear-gradient(120deg, rgba(255,255,255,0.05), transparent)",
      },
    },
  },
  plugins: [],
};

export default config;
