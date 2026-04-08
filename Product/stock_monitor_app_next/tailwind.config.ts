import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#0B0E14",
        "canvas-deep": "#070910",
        "canvas-raised": "#141821",
        panel: {
          DEFAULT: "rgba(255,255,255,0.03)",
          hover: "rgba(255,255,255,0.05)",
          elevated: "rgba(255,255,255,0.07)",
          solid: "#161920"
        },
        primary: {
          DEFAULT: "#00D9FF",
          50: "#E8FCFF",
          100: "#C8F7FF",
          200: "#9EEFFF",
          300: "#6EE7FF",
          400: "#3CDEFF",
          500: "#00D9FF",
          600: "#00B8D9",
          700: "#0098B3",
          800: "#007A8F",
          900: "#005C6C"
        },
        // positive = gains/profit (alias: mint for backward compat)
        positive: {
          DEFAULT: "#22C55E",
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#22C55E",
          600: "#16A34A",
          700: "#15803D",
          800: "#166534",
          900: "#14532D"
        },
        // backward compat alias
        mint: {
          DEFAULT: "#22C55E",
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#22C55E",
          600: "#16A34A",
          700: "#15803D",
          800: "#166534",
          900: "#14532D"
        },
        secondary: {
          DEFAULT: "#06B6D4",
          50: "#ECFEFF",
          100: "#CFFAFE",
          200: "#A5F3FC",
          300: "#67E8F9",
          400: "#22D3EE",
          500: "#06B6D4",
          600: "#0891B2",
          700: "#0E7490",
          800: "#155E75",
          900: "#164E63"
        },
        // backward compat alias
        blue: {
          DEFAULT: "#06B6D4",
          50: "#ECFEFF",
          100: "#CFFAFE",
          200: "#A5F3FC",
          300: "#67E8F9",
          400: "#22D3EE",
          500: "#06B6D4",
          600: "#0891B2",
          700: "#0E7490",
          800: "#155E75",
          900: "#164E63"
        },
        chart: {
          1: "#56E5FF",
          2: "#7BC4FF",
          3: "#2DD4BF",
          4: "#F59E0B",
          5: "#F472B6"
        },
        amber: {
          DEFAULT: "#F59E0B",
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F"
        },
        // negative = losses (alias: danger for backward compat)
        negative: {
          DEFAULT: "#EF4444",
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          400: "#F87171",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
          800: "#991B1B",
          900: "#7F1D1D"
        },
        danger: {
          DEFAULT: "#EF4444",
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          400: "#F87171",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
          800: "#991B1B",
          900: "#7F1D1D"
        },
        glass: {
          border: "rgba(148,163,184,0.06)",
          "border-light": "rgba(148,163,184,0.10)"
        },
        "accent-warm": "#F59E0B",
        "text-primary": "#F7FCFF",
        "text-secondary": "#D6E7F8",
        "text-muted": "#97AEC3",
        "border-subtle": "rgba(148,163,184,0.10)",
        "border-active": "rgba(0,217,255,0.42)"
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)",
        elevated: "0 4px 12px rgba(0,0,0,0.4)",
        "card-hover": "0 8px 24px rgba(0,0,0,0.45)",
        inner: "inset 0 1px 2px rgba(0,0,0,.4)",
        "focus-ring": "0 0 0 3px rgba(0,217,255,0.24)"
      },
      backdropBlur: {
        panel: "8px"
      },
      fontFamily: {
        // backward compat: font-orb now maps to Inter
        orb: ["var(--font-inter)", "var(--font-noto)", "system-ui", "sans-serif"],
        // backward compat: font-mono-tech now maps to system mono
        "mono-tech": ["'SF Mono'", "'Fira Code'", "'Cascadia Code'", "monospace"]
      },
      fontSize: {
        kpi: ["2.5rem", { lineHeight: "1.1", fontWeight: "700", letterSpacing: "-0.02em" }],
        metric: ["1.25rem", { lineHeight: "1.3", fontWeight: "600" }]
      },
      keyframes: {
        slideInRight: {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" }
        },
        fadeUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" }
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" }
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" }
        },
        "score-pulse": {
          "0%, 100%": { filter: "drop-shadow(0 0 2px rgba(0,217,255,0.2))" },
          "50%": { filter: "drop-shadow(0 0 6px rgba(0,217,255,0.3))" }
        },
        "radar-draw": {
          from: { strokeDashoffset: "400" },
          to: { strokeDashoffset: "0" }
        },
        "star-pop": {
          "0%": { transform: "scale(0)", opacity: "0" },
          "60%": { transform: "scale(1.4)" },
          "100%": { transform: "scale(1)", opacity: "1" }
        },
        "bar-fill": {
          from: { width: "0%" }
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        "slide-in-right": "slideInRight 300ms cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-up": "fadeUp 400ms cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scaleIn 200ms cubic-bezier(0.16, 1, 0.3, 1)",
        shimmer: "shimmer 2s infinite linear",
        "pulse-soft": "pulse-soft 2s infinite ease-in-out",
        "spin-slow": "spin-slow 1s linear infinite",
        "score-pulse": "score-pulse 3s ease-in-out infinite",
        "fade-in": "fade-in 300ms ease-out",
        "radar-draw": "radar-draw 0.9s cubic-bezier(0.4,0,0.2,1) forwards",
        "star-pop": "star-pop 0.25s ease forwards",
        "bar-fill": "bar-fill 0.7s cubic-bezier(0.4,0,0.2,1) forwards"
      },
      letterSpacing: {
        kpi: "-0.02em",
        heading: "-0.01em"
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.16, 1, 0.3, 1)"
      }
    }
  },
  plugins: []
};

export default config;
