import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
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
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        evidence: {
          a: "hsl(var(--evidence-a))",
          "a-foreground": "hsl(var(--evidence-a-foreground))",
          b: "hsl(var(--evidence-b))",
          "b-foreground": "hsl(var(--evidence-b-foreground))",
          c: "hsl(var(--evidence-c))",
          "c-foreground": "hsl(var(--evidence-c-foreground))",
        },
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
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
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
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        /* CamScan: results rise from the bottom of the viewport. */
        "slide-up": {
          from: { opacity: "0", transform: "translateY(28px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        /* CamScan: the identified name resolves out of a soft blur. */
        reveal: {
          from: { opacity: "0", transform: "translateY(10px)", filter: "blur(6px)" },
          to: { opacity: "1", transform: "translateY(0)", filter: "blur(0)" },
        },
        /* CamScan: three dots breathing while identification runs. */
        "scan-dot": {
          "0%, 80%, 100%": { opacity: "0.25", transform: "scale(0.75)" },
          "40%": { opacity: "1", transform: "scale(1)" },
        },
        /* CamScan: viewfinder corner brackets glow in and out. */
        viewfinder: {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "1" },
        },
        /* CamScan: a light bar sweeping the frame during a scan. */
        "scan-sweep": {
          "0%": { transform: "translateY(-110%)" },
          "100%": { transform: "translateY(560%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.25s ease-out",
        "slide-up": "slide-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        reveal: "reveal 0.5s ease-out both",
        "scan-dot": "scan-dot 1.2s ease-in-out infinite",
        viewfinder: "viewfinder 2s ease-in-out infinite",
        "scan-sweep": "scan-sweep 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
