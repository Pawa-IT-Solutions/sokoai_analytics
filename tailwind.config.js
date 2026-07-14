/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // 👈 This tells Tailwind to scan your React files for styles
  ],
  theme: {
    extend: {
      fontSize: {
        xs: ["0.8125rem", { lineHeight: "1.15rem" }],
        sm: ["0.9375rem", { lineHeight: "1.375rem" }],
      },
    },
  },
  plugins: [],
}