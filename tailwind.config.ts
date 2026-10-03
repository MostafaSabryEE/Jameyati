import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", // toggled by adding/removing the "dark" class on <html>
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Palette sampled from the Jameyati logo: deep teal (#0E5056) and gold (#C7A442).
      colors: {
        brand: {
          50: "#eef7f7", 100: "#d5ecec", 200: "#aad8d9", 300: "#74bcbe", 400: "#3f9a9e",
          500: "#1f7a80", 600: "#0e5056", 700: "#0b4147", 800: "#083338", 900: "#052227",
        },
        gold: {
          50: "#fbf7ea", 100: "#f5ecc9", 200: "#ecd993", 300: "#e0c15f", 400: "#d3ae45",
          500: "#c7a442", 600: "#a8852f", 700: "#86671f", 800: "#62491a", 900: "#3f2f12",
        },
        // Payout indicators use the existing "amber" classes, remapped to the logo gold.
        amber: {
          50: "#fbf7ea", 100: "#f5ecc9", 200: "#ecd993", 300: "#e0c15f", 400: "#d3ae45",
          500: "#c7a442", 600: "#a8852f", 700: "#86671f", 800: "#62491a", 900: "#3f2f12",
        },
      },
    },
  },
  plugins: [],
};

export default config;
