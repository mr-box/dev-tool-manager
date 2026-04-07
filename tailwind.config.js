/** @type {import('tailwindcss').Config} */
export default {
  content: ["./client/index.html", "./client/src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        card: "0 14px 40px rgba(15, 23, 42, 0.12)"
      }
    }
  },
  plugins: []
};
