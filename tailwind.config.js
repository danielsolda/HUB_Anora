/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta oficial ANORA (extraída do manual de marca)
        ink: '#1f2117', // verde quase preto — base escura / texto principal
        olive: '#3f4429', // verde oliva — secundária
        cream: '#f7f4e8', // creme — fundo claro
        sand: '#bcaf96', // areia / bege — neutro médio
        linen: '#dbd2c6', // bege claro — superfícies
        terracotta: '#894b36', // terracota — destaque principal
        mauve: '#937265', // marrom rosado — destaque secundário
      },
      fontFamily: {
        sans: ['Figtree', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        brand: '0.32em',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(31,33,23,0.04), 0 12px 32px -16px rgba(31,33,23,0.22)',
        'card-hover': '0 2px 4px rgba(31,33,23,0.06), 0 24px 48px -20px rgba(31,33,23,0.34)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
      },
    },
  },
  plugins: [],
}
