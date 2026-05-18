/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#FFF5F5',
          100: '#FFE5E5',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#FF6B6B',
          500: '#E53E3E',
          600: '#DC2626',
          700: '#B91C2C',
          800: '#991B1B',
          900: '#7F1318',
        },
        ink: {
          50:  '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgba(15,23,42,0.04), 0 1px 3px 0 rgba(15,23,42,0.06)',
        card: '0 4px 16px -4px rgba(15,23,42,0.08), 0 2px 6px -1px rgba(15,23,42,0.05)',
        pop:  '0 10px 32px -8px rgba(15,23,42,0.18)',
        brand: '0 10px 28px -8px rgba(229,62,62,0.45)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #FF6B6B 0%, #E53E3E 50%, #B91C2C 100%)',
        'brand-dark': 'linear-gradient(135deg, #1A1A1A 0%, #3B0A0A 60%, #7F1318 100%)',
      },
      animation: {
        'fade-in':  'fadeIn 280ms ease-out both',
        'slide-up': 'slideUp 320ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: { '0%': { opacity: 0, transform: 'translateY(10px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.55 } },
      },
    },
  },
  plugins: [],
};
