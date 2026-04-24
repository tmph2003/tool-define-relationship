/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        display: ["Space Grotesk", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      colors: {
        // Obsidian Cartographer — design system tokens
        obsidian: {
          950: "#0C0D0F",
          900: "#111214",
          800: "#18191C",
          700: "#242529",
          600: "#2E2F34",
          500: "#3A3B40",
          400: "#52535A",
          300: "#71717A",
        },
        amber: {
          DEFAULT: "#F5A623",
          muted:   "#C47E10",
          dim:     "#3D2A00",
          glow:    "rgba(245,166,35,0.15)",
        },
        ink: {
          primary:   "#ECEDEF",
          secondary: "#9899A0",
          tertiary:  "#5C5D63",
          inverse:   "#0C0D0F",
        },
      },
      spacing: {
        nav:     "48px",
        sidebar: "220px",
        panel:   "280px",
      },
      borderRadius: {
        sm:  "3px",
        md:  "6px",
        lg:  "10px",
      },
      boxShadow: {
        "panel":  "0 0 0 1px rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.6)",
        "inset-top": "inset 0 1px 0 rgba(255,255,255,0.06)",
        "amber":  "0 0 0 1px rgba(245,166,35,0.4)",
        "amber-lg": "0 0 24px rgba(245,166,35,0.12)",
      },
      animation: {
        "fade-in-up":   "fadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-right":  "slideRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pulse-amber":  "pulseAmber 2s ease-in-out infinite",
      },
      keyframes: {
        fadeInUp: {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideRight: {
          "0%":   { opacity: "0", transform: "translateX(-10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulseAmber: {
          "0%, 100%": { opacity: "0.6" },
          "50%":      { opacity: "1"   },
        },
      },
    },
  },
  plugins: [],
};
