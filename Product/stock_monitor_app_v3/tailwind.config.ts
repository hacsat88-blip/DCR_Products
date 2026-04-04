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
        canvas: "#071327",
        panel: {
          DEFAULT: "rgba(13, 30, 56, 0.86)",
          hover: "rgba(13, 30, 56, 0.96)",
          elevated: "rgba(18, 38, 70, 0.92)",
          solid: "#0d1e38"
        },
        mint: {
          DEFAULT: "#5bf0ba",
          50: "#effefb",
          100: "#c9fef0",
          200: "#93fce2",
          300: "#5bf0ba",
          400: "#2adba0",
          500: "#0ec288",
          600: "#069d6f",
          700: "#087d5b",
          800: "#0c634a",
          900: "#0c513e"
        },
        blue: {
          DEFAULT: "#8bb0ff",
          50: "#f0f4ff",
          100: "#dce4ff",
          200: "#c0cfff",
          300: "#8bb0ff",
          400: "#6b94ff",
          500: "#4d78f5",
          600: "#3358e8",
          700: "#2845cc",
          800: "#2439a4",
          900: "#233482"
        },
        amber: {
          DEFAULT: "#ffc772",
          50: "#fffbeb",
          100: "#fff3c6",
          200: "#ffe488",
          300: "#ffc772",
          400: "#ffb340",
          500: "#f99316",
          600: "#dd6e0b",
          700: "#b74c0c",
          800: "#943b11",
          900: "#7a3111"
        },
        danger: {
          DEFAULT: "#ff8798",
          50: "#fff1f2",
          100: "#ffe1e4",
          200: "#ffc8cf",
          300: "#ff8798",
          400: "#ff5c72",
          500: "#f83b56",
          600: "#e5183a",
          700: "#c1102e",
          800: "#a0112b",
          900: "#86132b"
        },
        glass: {
          border: "rgba(255, 255, 255, 0.08)",
          "border-light": "rgba(255, 255, 255, 0.12)"
        },
        "canvas-deep": "#040d1a",
        "canvas-raised": "#0f1d32",
        "accent-warm": "#e8a87c",
        "text-primary": "#e8edf5",
        "text-secondary": "#8fa3c4",
        "text-muted": "#5a7194",
        "border-subtle": "#1e3050",
        "border-active": "#2a4a6b"
      },
      boxShadow: {
        card: "0 24px 80px rgba(0,0,0,.3)",
        elevated: "0 8px 32px rgba(0,0,0,.4), 0 2px 8px rgba(0,0,0,.2)",
        "glow-mint": "0 0 20px rgba(91, 240, 186, 0.15), 0 0 4px rgba(91, 240, 186, 0.1)",
        "glow-blue": "0 0 20px rgba(139, 176, 255, 0.15), 0 0 4px rgba(139, 176, 255, 0.1)",
        "glow-amber": "0 0 20px rgba(255, 199, 114, 0.15), 0 0 4px rgba(255, 199, 114, 0.1)",
        "glow-danger": "0 0 20px rgba(255, 135, 152, 0.15), 0 0 4px rgba(255, 135, 152, 0.1)",
        inner: "inset 0 1px 2px rgba(0,0,0,.2)",
        "card-hover": "0 28px 90px rgba(0,0,0,.35), 0 0 1px rgba(91, 240, 186, 0.08)",
        "ambient-mint": "0 0 40px rgba(91, 240, 186, 0.06)",
        "ambient-blue": "0 0 40px rgba(139, 176, 255, 0.06)"
      },
      backdropBlur: {
        panel: "8px"
      },
      fontSize: {
        kpi: ["3.5rem", { lineHeight: "1", fontWeight: "700", letterSpacing: "-0.02em" }],
        metric: ["1.5rem", { lineHeight: "1.2", fontWeight: "600" }]
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
          "0%, 100%": { filter: "drop-shadow(0 0 2px rgba(91,240,186,0.3))" },
          "50%": { filter: "drop-shadow(0 0 6px rgba(91,240,186,0.5))" }
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
        "fade-in": "fade-in 300ms ease-out"
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
