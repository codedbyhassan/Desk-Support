/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
  	extend: {
  		colors: {
        /* SEMANTIC COLOR PALETTE - Maps to CSS variables */
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',

        /* PRIMARY - Red for professional apps */
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          light: 'hsl(var(--primary-light))',
          dark: 'hsl(var(--primary-dark))',
          hover: 'hsl(var(--primary-hover))',
          50: 'hsl(var(--red-50))',
          100: 'hsl(var(--red-100))',
          200: 'hsl(var(--red-200))',
          300: 'hsl(var(--red-300))',
          400: 'hsl(var(--red-400))',
          500: 'hsl(var(--red-500))',
          600: 'hsl(var(--red-600))',
          700: 'hsl(var(--red-700))',
          800: 'hsl(var(--red-800))',
          900: 'hsl(var(--red-900))',
        },

        /* SECONDARY - Gray for inactive states */
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
          hover: 'hsl(var(--secondary-hover))',
        },

        /* DESTRUCTIVE - For delete/danger actions */
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
          hover: 'hsl(var(--destructive-hover))',
        },

        /* MUTED - For subtle elements */
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },

        /* ACCENT - Blue for special attention */
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
          hover: 'hsl(var(--accent-hover))',
          50: 'hsl(var(--blue-50))',
          100: 'hsl(var(--blue-100))',
          200: 'hsl(var(--blue-200))',
          300: 'hsl(var(--blue-300))',
          400: 'hsl(var(--blue-400))',
          500: 'hsl(var(--blue-500))',
          600: 'hsl(var(--blue-600))',
          700: 'hsl(var(--blue-700))',
          800: 'hsl(var(--blue-800))',
          900: 'hsl(var(--blue-900))',
        },

        /* POPOVER */
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },

        /* CARD */
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        /* SIDEBAR */
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },

        /* CHART COLORS */
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },

        /* SEMANTIC COLORS */
        success: {
          50: 'hsl(var(--success-50))',
          500: 'hsl(var(--success-500))',
          900: 'hsl(var(--success-900))',
        },

        warning: {
          50: 'hsl(var(--warning-50))',
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
          hover: 'hsl(var(--warning-hover))',
          900: 'hsl(var(--warning-900))',
        },

        error: {
          50: 'hsl(var(--error-50))',
          500: 'hsl(var(--error-500))',
          900: 'hsl(var(--error-900))',
        },

        info: {
          50: 'hsl(var(--info-50))',
          500: 'hsl(var(--info-500))',
          900: 'hsl(var(--info-900))',
        },

        /* GRAYSCALE - Professional foundation */
        gray: {
          50: 'hsl(var(--gray-50))',
          100: 'hsl(var(--gray-100))',
          200: 'hsl(var(--gray-200))',
          300: 'hsl(var(--gray-300))',
          400: 'hsl(var(--gray-400))',
          500: 'hsl(var(--gray-500))',
          600: 'hsl(var(--gray-600))',
          700: 'hsl(var(--gray-700))',
          800: 'hsl(var(--gray-800))',
          900: 'hsl(var(--gray-900))',
        },

        /* LEGACY - For backwards compatibility */
        'brand-blue': 'hsl(var(--primary))',
        'brand-orange': 'hsl(var(--accent))',
  		},

  		/* TYPOGRAPHY */
  		fontSize: {
  			xs: ['var(--font-xs)', { lineHeight: 'var(--leading-tight)' }],
  			sm: ['var(--font-sm)', { lineHeight: 'var(--leading-snug)' }],
  			base: ['var(--font-base)', { lineHeight: 'var(--leading-normal)' }],
  			lg: ['var(--font-lg)', { lineHeight: 'var(--leading-normal)' }],
  			xl: ['var(--font-xl)', { lineHeight: 'var(--leading-relaxed)' }],
  			'2xl': ['var(--font-2xl)', { lineHeight: 'var(--leading-relaxed)' }],
  			'3xl': ['var(--font-3xl)', { lineHeight: 'var(--leading-relaxed)' }],
  			'4xl': ['var(--font-4xl)', { lineHeight: 'var(--leading-tight)' }],
  			'5xl': ['var(--font-5xl)', { lineHeight: 'var(--leading-tight)' }],
  		},

  		fontWeight: {
  			normal: 'var(--font-normal)',
  			medium: 'var(--font-medium)',
  			semibold: 'var(--font-semibold)',
  			bold: 'var(--font-bold)',
  		},

  		lineHeight: {
  			tight: 'var(--leading-tight)',
  			snug: 'var(--leading-snug)',
  			normal: 'var(--leading-normal)',
  			relaxed: 'var(--leading-relaxed)',
  			loose: 'var(--leading-loose)',
  		},

  		/* BORDERS */
  		borderRadius: {
  			none: 'var(--radius-none)',
  			sm: 'var(--radius-sm)',
  			md: 'var(--radius-md)',
  			lg: 'var(--radius-lg)',
  			xl: 'var(--radius-xl)',
  			'2xl': 'var(--radius-2xl)',
  			full: 'var(--radius-full)',
  		},

  		/* SPACING */
  		spacing: {
  			0: 'var(--space-0)',
  			1: 'var(--space-1)',
  			2: 'var(--space-2)',
  			3: 'var(--space-3)',
  			4: 'var(--space-4)',
  			6: 'var(--space-6)',
  			8: 'var(--space-8)',
  			12: 'var(--space-12)',
  			16: 'var(--space-16)',
  		},

  		gap: {
  			1: 'var(--space-1)',
  			2: 'var(--space-2)',
  			3: 'var(--space-3)',
  			4: 'var(--space-4)',
  			6: 'var(--space-6)',
  			8: 'var(--space-8)',
  		},

  		padding: {
  			1: 'var(--space-1)',
  			2: 'var(--space-2)',
  			3: 'var(--space-3)',
  			4: 'var(--space-4)',
  			6: 'var(--space-6)',
  			8: 'var(--space-8)',
  		},

  		margin: {
  			1: 'var(--space-1)',
  			2: 'var(--space-2)',
  			3: 'var(--space-3)',
  			4: 'var(--space-4)',
  			6: 'var(--space-6)',
  			8: 'var(--space-8)',
  		},

  		/* FONTS */
  		fontFamily: {
  			sans: ['var(--font-sans)'],
  			mono: ['var(--font-mono)'],
  		},

  		/* SHADOWS */
  		boxShadow: {
  			xs: 'var(--shadow-xs)',
  			sm: 'var(--shadow-sm)',
  			DEFAULT: 'var(--shadow)',
  			md: 'var(--shadow-md)',
  			lg: 'var(--shadow-lg)',
  			xl: 'var(--shadow-xl)',
  			'2xl': 'var(--shadow-2xl)',
  		},

  		/* ANIMATIONS */
  		animation: {
  			'fade-in': 'fade-in 150ms ease-out',
  			'slide-up': 'slide-up 200ms ease-out',
  			'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  			'bounce': 'bounce 1s infinite',
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  		},

  		keyframes: {
  			'fade-in': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(10px)',
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)',
  				},
  			},
  			'slide-up': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(20px)',
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)',
  				},
  			},
  			'pulse': {
  				'0%, 100%': {
  					opacity: '1',
  				},
  				'50%': {
  					opacity: '0.5',
  				},
  			},
  			'bounce': {
  				'0%, 100%': {
  					transform: 'translateY(0)',
  				},
  				'50%': {
  					transform: 'translateY(-25%)',
  				},
  			},
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},

  		/* TRANSITIONS */
  		transitionDuration: {
  			'fast': 'var(--transition-fast)',
  			'normal': 'var(--transition-normal)',
  			'slow': 'var(--transition-slow)',
  		},

  		transitionTimingFunction: {
  			'ease-in-out': 'var(--ease-in-out)',
  			'ease-out': 'var(--ease-out)',
  			'ease-in': 'var(--ease-in)',
  		},
  	}
  },
  plugins: [require("tailwindcss-animate")],
} 