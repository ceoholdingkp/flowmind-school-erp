/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:       '#0f1923',
        card:     '#1a2332',
        sidebar:  '#0d1520',
        'sidebar-active': '#1e3a5f',
        border:   '#2a3a4a',
        muted:    '#8899aa',
        green:    '#10b981',
        amber:    '#f59e0b',
        red:      '#ef4444',
        blue:     '#3b82f6',
        purple:   '#8b5cf6',
        cyan:     '#06b6d4',
      },
    },
  },
  plugins: [],
};
