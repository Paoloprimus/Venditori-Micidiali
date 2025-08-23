/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eef6ff",
          100: "#d9ebff",
          600: "#2563eb",
          700: "#1d4ed8"
        }
      },
      boxShadow: {
        soft: "0 2px 8px rgba(0,0,0,.08)"
      }
    }
  },
  plugins: []
};
