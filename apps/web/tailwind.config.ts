import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/shared/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#171717",
        paper: "#f7f5ef",
        moss: "#315c4b",
        coral: "#de6b48",
        skyglass: "#d8edf2",
        saffron: "#efb44b"
      },
      boxShadow: {
        soft: "0 16px 40px rgba(23, 23, 23, 0.08)"
      }
    }
  },
  plugins: [typography]
};

export default config;
