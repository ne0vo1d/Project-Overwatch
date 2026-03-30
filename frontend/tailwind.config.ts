import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        severity: {
          low: "#36a64f",
          medium: "#f0c929",
          high: "#e07b39",
          critical: "#cc0000",
        },
      },
    },
  },
  plugins: [],
};

export default config;
