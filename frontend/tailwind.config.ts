import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        text: 'var(--text)',
        'text-h': 'var(--text-h)',
        border: 'var(--border)',
        accent: 'var(--accent)',
        'accent-bg': 'var(--accent-bg)',
        'accent-border': 'var(--accent-border)',
        danger: '#ef4444',
        warning: '#f59e0b',
        success: '#22c55e',
      },
    },
  },
  plugins: [],
} satisfies Config
