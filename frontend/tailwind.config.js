/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta pensada para o contexto: quadra de areia sob sol forte,
        // não o "cream + terracota" genérico. Teal profundo para
        // estrutura (header, nav), coral vivo para ação, verde-mar
        // para valores/dinheiro.
        page: '#EAF3F1',
        surface: '#FFFFFF',
        ink: '#0B2027',
        'ink-soft': '#4A6068',
        teal: {
          DEFAULT: '#0B3D4C',
          light: '#134D5E',
        },
        coral: {
          DEFAULT: '#F2542D',
          dark: '#D6431F',
        },
        sea: {
          DEFAULT: '#1F9E76',
          light: '#E4F5EF',
        },
        sand: '#F2E4C4',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
};
