import animate from "tailwindcss-animate";

const sans = ['Inter', 'Segoe UI', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'];

const config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: sans,
        body: sans,
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        vaultic: {
          black: "#080B12",
          charcoal: "#0D1320",
          surface: "#121A2A",
          surfaceSoft: "#182235",
          elevated: "#1E2A3E",
          cyan: "#4CC9F0",
          blue: "#5B8DEF",
          mint: "#2DD4A4",
          violet: "#9B7CFF",
          orange: "#F59E0B",
          pink: "#F472B6",
          rose: "#FB7185",
          slate: "#AAB6CF",
          muted: "#D8DFEA",
          border: "rgba(216,223,234,0.12)",
          success: "#34D399",
          warning: "#FBBF24",
          error: "#F87171",
          sakura: "#F7C7D4",
          indigo: "#203164",
          ink: "#111927",
          golden: "#F5C26B",
          cream: "#FCF1E6",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backdropBlur: {
        '3xl': '80px',
      },
      animation: {
        'float-slow': 'float 8s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-15px)' },
        },
        'glow-pulse': {
          '0%, 100%': {
            filter: 'drop-shadow(0 0 4px rgba(217, 70, 239, 0.3)) drop-shadow(0 0 2px rgba(0, 229, 255, 0.2))',
            opacity: '1'
          },
          '50%': {
            filter: 'drop-shadow(0 0 8px rgba(217, 70, 239, 0.6)) drop-shadow(0 0 12px rgba(0, 229, 255, 0.4))',
            opacity: '1'
          },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      }
    },
  },
  safelist: [
    { pattern: /from-vaultic-/ },
    { pattern: /to-vaultic-/ },
    { pattern: /via-vaultic-/ },
    { pattern: /bg-vaultic-/ },
    { pattern: /text-vaultic-/ },
    { pattern: /border-vaultic-/ },
    { pattern: /shadow-vaultic-/ },
  ],
  plugins: [animate],
};

export default config;
