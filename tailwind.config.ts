
import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

export default {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: { colors: { primary: { DEFAULT: '#0f172a', foreground: '#ffffff' }, secondary: { DEFAULT: '#3b82f6', foreground: '#ffffff' } }, fontFamily: { sans: ['Inter','Prompt','ui-sans-serif','system-ui'] } } },
  plugins: [animate],
} satisfies Config
