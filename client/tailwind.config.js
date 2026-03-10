/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        arabic: ["'IBM Plex Sans Arabic'", 'sans-serif'],
      },
      colors: {
        dark: {
          bg: '#0A0F1E',
          secondary: '#0F1629',
          card: '#131D35',
          elevated: '#1A2540',
          border: '#1E2D4A',
          'border-active': '#2E4170',
        },
        light: {
          bg: '#F8FAFF',
          secondary: '#FFFFFF',
          card: '#FFFFFF',
          elevated: '#F0F4FF',
          border: '#E2E8F0',
          'border-active': '#4F8EF7',
        },
        accent: {
          primary: '#4F8EF7',
          secondary: '#7C3AED',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
        },
        text: {
          primary: '#F0F4FF',
          secondary: '#8B9CC8',
          muted: '#4A5A82',
          'light-primary': '#0A0F1E',
          'light-secondary': '#4A5570',
          'light-muted': '#94A3B8',
        },
      },
      backgroundImage: {
        'gradient-hero': 'linear-gradient(135deg, #4F8EF7 0%, #7C3AED 100%)',
        'gradient-danger': 'linear-gradient(135deg, #EF4444 0%, #F59E0B 100%)',
      },
      boxShadow: {
        dark: '0 4px 24px rgba(0,0,0,0.35)',
        light: '0 4px 24px rgba(79,142,247,0.08)',
        glow: '0 0 20px rgba(79,142,247,0.3)',
      },
      borderRadius: {
        card: '16px',
        btn: '12px',
        input: '10px',
        badge: '8px',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
        fadeIn: 'fadeIn 0.3s ease-out',
        slideIn: 'slideIn 0.3s cubic-bezier(0.4,0,0.2,1)',
        scaleIn: 'scaleIn 0.2s cubic-bezier(0.4,0,0.2,1)',
        'spin-slow': 'spin 3s linear infinite',
        float: 'float 3s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: 0, transform: 'translateX(20px)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: 0, transform: 'scale(0.95)' },
          to: { opacity: 1, transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
};
