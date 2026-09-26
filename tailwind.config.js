/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#1e1f22', // ciemne tło bocznego paska serwerów
          800: '#2b2d31', // tło listy kanałów / czatów
          700: '#313338', // główne tło czatu
          600: '#383a40', // aktywne elementy / hover
          500: '#4e5058', // ramki i wyciszone teksty
          400: '#80848e', // ikony i drugorzędne napisy
          300: '#949ba4', // opisy
          100: '#f2f3f5', // jasne teksty
        },
        brand: {
          500: '#5865f2', // discord blurple
          600: '#4752c4',
          emerald: '#23a55a', // online / sukces / mowa
          danger: '#f23f43', // rozłączenie / mute / błąd
          warning: '#f0b232', // zaraz wracam
        }
      },
      animation: {
        'pulse-glow': 'pulse-glow 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ripple': 'ripple 1.2s ease-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 2px rgba(35, 165, 90, 0.7)' },
          '50%': { boxShadow: '0 0 0 6px rgba(35, 165, 90, 0.2)' },
        },
        'ripple': {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        }
      }
    },
  },
  plugins: [],
}
