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
        canvas: "#000000",
        panel: {
          DEFAULT: "rgba(0,255,65,0.03)",
          hover: "rgba(0,255,65,0.06)",
          elevated: "rgba(0,255,65,0.08)",
          solid: "#050a05"
        },
        mint: {
          DEFAULT: "#00ff41",
          50: "#eaffef",
          100: "#c0ffd0",
          200: "#80ff9e",
          300: "#40ff6f",
          400: "#00ff41",
          500: "#00cc33",
          600: "#009926",
          700: "#007a1f",
          800: "#005c17",
          900: "#003d0f"
        },
        blue: {
          DEFAULT: "#00e5ff",
          50: "#e0fbff",
          100: "#b3f5ff",
          200: "#66ecff",
          300: "#33e8ff",
          400: "#00e5ff",
          500: "#00b8cc",
          600: "#008c99",
          700: "#006b75",
          800: "#004d54",
          900: "#003038"
        },
        amber: {
          DEFAULT: "#ffd700",
          50: "#fffce0",
          100: "#fff7b3",
          200: "#ffef66",
          300: "#ffe833",
          400: "#ffd700",
          500: "#ccac00",
          600: "#998100",
          700: "#756300",
          800: "#544700",
          900: "#382f00"
        },
        danger: {
          DEFAULT: "#ff3355",
          50: "#ffe5ea",
          100: "#ffbfca",
          200: "#ff8099",
          300: "#ff5577",
          400: "#ff3355",
          500: "#cc2944",
          600: "#991f33",
          700: "#751828",
          800: "#54111c",
          900: "#380b13"
        },
        glass: {
          border: "rgba(0,255,65,0.08)",
          "border-light": "rgba(0,255,65,0.12)"
        },
        "canvas-deep": "#000000",
        "canvas-raised": "#050a05",
        "accent-warm": "#ffd700",
        "text-primary": "#00ff41",
        "text-secondary": "#00cc33",
        "text-muted": "#007a1f",
        "border-subtle": "rgba(0,255,65,0.18)",
        "border-active": "rgba(0,255,65,0.4)",
        "cyber-green": "#00ff41",
        "cyber-dim": "#007a1f",
        "cyber-glow": "rgba(0,255,65,0.5)"
      },
      boxShadow: {
        card: "0 0 20px rgba(0,255,65,0.08)",
        elevated: "0 0 30px rgba(0,255,65,0.12)",
        "glow-mint": "0 0 20px rgba(0,255,65,0.3), 0 0 4px rgba(0,255,65,0.2)",
        "glow-blue": "0 0 20px rgba(0,229,255,0.15), 0 0 4px rgba(0,229,255,0.1)",
        "glow-amber": "0 0 20px rgba(255,215,0,0.15), 0 0 4px rgba(255,215,0,0.1)",
        "glow-danger": "0 0 20px rgba(255,51,85,0.15), 0 0 4px rgba(255,51,85,0.1)",
        inner: "inset 0 1px 2px rgba(0,0,0,.4)",
        "card-hover": "0 0 30px rgba(0,255,65,0.2), 0 0 1px rgba(0,255,65,0.3)",
        "ambient-mint": "0 0 40px rgba(0,255,65,0.08)",
        "ambient-blue": "0 0 40px rgba(0,229,255,0.06)"
      },
      backdropBlur: {
        panel: "8px"
      },
      fontFamily: {
        orb: ["var(--font-orbitron)", "monospace"],
        "mono-tech": ["var(--font-share-tech-mono)", "'Courier New'", "monospace"]
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
          "0%, 100%": { filter: "drop-shadow(0 0 2px rgba(0,255,65,0.3))" },
          "50%": { filter: "drop-shadow(0 0 6px rgba(0,255,65,0.5))" }
        },
        glitch: {
          "0%, 89%, 100%": { transform: "none", textShadow: "0 0 10px #00ff41, 0 0 20px #00ff41" },
          "90%": { transform: "translate(-3px, 1px)", textShadow: "-2px 0 #ff3355, 2px 0 #00e5ff" },
          "92%": { transform: "translate(3px, -1px)", textShadow: "2px 0 #ff3355, -2px 0 #00e5ff" },
          "94%": { transform: "translate(-1px, 0)" },
          "96%": { transform: "translate(1px, 0)" }
        },
        pborder: {
          "0%, 100%": { boxShadow: "0 0 5px rgba(0,255,65,0.3)" },
          "50%": { boxShadow: "0 0 14px rgba(0,255,65,0.6)" }
        },
        "cyber-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.1" }
        },
        sweep: {
          to: { left: "200%" }
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
        glitch: "glitch 9s infinite",
        pborder: "pborder 3s infinite",
        "cyber-blink": "cyber-blink 1s infinite",
        sweep: "sweep 1.4s linear infinite",
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
