/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        chat: {
          canvas: '#eef1f8',
          canvasDark: '#0c0f16',
          sidebar: '#ffffff',
          sidebarDark: '#12151c',
          header: '#f4f5fa',
          headerDark: '#181c26',
          border: '#e2e5ef',
          borderDark: '#2a3142',
          muted: '#647089',
          mutedDark: '#949eb3',
          accent: '#6366f1',
          accentHover: '#4f46e5',
          accentLight: '#818cf8',
          accentSecondary: '#a855f7',
          bubbleOut: '#e8eaff',
          bubbleOutDark: '#312e81',
          bubbleIn: '#ffffff',
          bubbleInDark: '#1e2433',
          link: '#6366f1',
          linkDark: '#a5b4fc',
          danger: '#e11d48',
          pane: '#141820',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        bubble: '0 1px 2px rgba(15, 23, 42, 0.08)',
        bubbleDark: '0 1px 2px rgba(0, 0, 0, 0.35)',
      },
      backgroundImage: {
        'ps-brand': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #c084fc 100%)',
        'ps-pane': 'radial-gradient(ellipse 80% 60% at 70% 20%, rgba(99, 102, 241, 0.12), transparent 55%), radial-gradient(ellipse 60% 50% at 20% 80%, rgba(168, 85, 247, 0.08), transparent 50%), linear-gradient(180deg, #0c0f16 0%, #12151c 100%)',
        'ps-pane-light': 'radial-gradient(ellipse 80% 60% at 70% 20%, rgba(99, 102, 241, 0.08), transparent 55%), linear-gradient(180deg, #eef1f8 0%, #f4f5fa 100%)',
        'ps-auth':
          'radial-gradient(ellipse 90% 70% at 0% 50%, rgba(99, 102, 241, 0.35), transparent 50%), radial-gradient(ellipse 80% 60% at 100% 40%, rgba(192, 132, 252, 0.28), transparent 52%), radial-gradient(ellipse 50% 40% at 50% 100%, rgba(14, 165, 233, 0.12), transparent 55%), linear-gradient(145deg, #0a0812 0%, #12102a 38%, #0d1524 100%)',
        'ps-messenger-edge':
          'radial-gradient(ellipse 55% 80% at 0% 50%, rgba(99, 102, 241, 0.14), transparent 70%), radial-gradient(ellipse 55% 80% at 100% 50%, rgba(168, 85, 247, 0.12), transparent 70%)',
      },
    },
  },
  plugins: [],
}
