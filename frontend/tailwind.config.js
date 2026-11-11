/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        baash: {
          black: "#0A0A0F",
          darkBg: "#12121A",
          cardBg: "#1A1A2E",
          cardBorder: "#2A2A3E",
          purple: "#7B35E8",
          purpleDark: "#5B21B6",
          purpleLight: "#9333EA",
          pink: "#F72585",
          pinkDark: "#DB1E74",
          lavender: "#EDE9FE",
          lavenderDark: "#C4B5FD",
          cyan: "#00D4FF",
          teal: "#0D9488",
          tealLight: "#14B8A6",
          orange: "#F97316",
          orangeDark: "#EA580C",
          textMuted: "#A0A0B8",
          white: "#FFFFFF",
        },
        background: "#0A0A0F",
        surface: "#12121A",
        card: "#1A1A2E",
        border: "#2A2A3E",
        primary: {
          DEFAULT: "#7B35E8",
          hover: "#5B21B6",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#F72585",
          hover: "#DB1E74",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#12121A",
          foreground: "#A0A0B8",
        },
        accent: {
          DEFAULT: "#7B35E8",
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#E11D48",
          foreground: "#FFFFFF",
        },
        success: {
          DEFAULT: "#0D9488",
          foreground: "#FFFFFF",
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      backgroundImage: {
        'baash-gradient': 'linear-gradient(135deg, #F72585 0%, #7B35E8 100%)',
        'baash-subtle-glow': 'radial-gradient(circle at 50% 0%, rgba(123, 53, 232, 0.18) 0%, transparent 70%)',
        'baash-card-glow': 'linear-gradient(180deg, rgba(123, 53, 232, 0.08) 0%, rgba(26, 26, 46, 0.6) 100%)',
      },
      boxShadow: {
        'baash-glow': '0 0 25px -5px rgba(123, 53, 232, 0.4)',
        'baash-card': '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
        'baash-pink-glow': '0 0 25px -5px rgba(247, 37, 133, 0.4)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
}
