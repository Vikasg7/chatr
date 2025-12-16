/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    // Use Major Third (1.25) typographic scale as default
    fontSize: {
      xs: ['0.8rem', { lineHeight: '1.2' }],
      sm: ['0.9rem', { lineHeight: '1.3' }],
      base: ['1rem', { lineHeight: '1.5' }], // step-0
      lg: ['1.25rem', { lineHeight: '1.4' }], // step-1
      xl: ['1.563rem', { lineHeight: '1.35' }], // step-2
      '2xl': ['1.953rem', { lineHeight: '1.25' }], // step-3
      '3xl': ['2.441rem', { lineHeight: '1.2' }], // step-4
      '4xl': ['3.052rem', { lineHeight: '1.15' }],
      '5xl': ['3.814rem', { lineHeight: '1.05' }]
    },

    spacing: {
      // 8-point system (values in rem)
      '1': '0.5rem',  // 8px
      '2': '1rem',    // 16px
      '3': '1.5rem',  // 24px
      '4': '2rem',    // 32px
      '6': '3rem',    // 48px
      '8': '4rem'     // 64px
    },

    borderRadius: {
      none: '0px',
      sm: '0.375rem',   // 6px small UI
      md: '0.75rem',    // 12px cards
      lg: '1rem',       // 16px
      xl: '1.25rem',    // 20px modals
      full: '9999px'
    },

    extend: {
      colors: {
        app: {
          950: '#020617',
          900: '#0b1220'
        },
        accent: {
          500: '#6366f1',
          600: '#4f46e5'
        }
      },
    }
  },
  plugins: [],
}
