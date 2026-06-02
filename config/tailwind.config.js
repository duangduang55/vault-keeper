/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Apple 风格蓝色 — 主交互色（双主题相同）
        primary: {
          50: '#e8f1ff',
          100: '#d0e3ff',
          200: '#a3c7ff',
          300: '#70abff',
          400: '#3d8eff',
          500: '#007aff',
          600: '#0062cc',
          700: '#004999',
          800: '#003166',
          900: '#001833',
        },
        // 双主题表面色 — 通过 CSS 自定义属性自动切换
        // 使用 rgb() + <alpha-value> 确保透明度修饰符（如 /50）能正确渲染
        surface: {
          50: 'rgb(var(--color-surface-50-rgb) / <alpha-value>)',
          100: 'rgb(var(--color-surface-100-rgb) / <alpha-value>)',
          200: 'rgb(var(--color-surface-200-rgb) / <alpha-value>)',
          300: 'rgb(var(--color-surface-300-rgb) / <alpha-value>)',
          400: 'rgb(var(--color-surface-400-rgb) / <alpha-value>)',
          500: 'rgb(var(--color-surface-500-rgb) / <alpha-value>)',
          600: 'rgb(var(--color-surface-600-rgb) / <alpha-value>)',
          700: 'rgb(var(--color-surface-700-rgb) / <alpha-value>)',
          800: 'rgb(var(--color-surface-800-rgb) / <alpha-value>)',
          900: 'rgb(var(--color-surface-900-rgb) / <alpha-value>)',
          950: 'rgb(var(--color-surface-950-rgb) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', '"Helvetica Neue"', 'sans-serif'],
        mono: ['"SF Mono"', 'SFMono-Regular', 'ui-monospace', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        sm: '10px',
        DEFAULT: '16px',
        lg: '24px',
        xl: '32px',
      },
    },
  },
  plugins: [],
};
