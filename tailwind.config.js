/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['Space Mono', 'monospace'],
            },
            keyframes: {
                'ripple-left': {
                    '0%': { backgroundPosition: '0% 0' },
                    '100%': { backgroundPosition: '100% 0' },
                },
                'ripple-right': {
                    '0%': { backgroundPosition: '100% 0' },
                    '100%': { backgroundPosition: '0% 0' },
                },
                'ripple-up': {
                    '0%': { backgroundPosition: '0 0' },
                    '100%': { backgroundPosition: '0 -200%' },
                },
                'ripple-down': {
                    '0%': { backgroundPosition: '0 0' },
                    '100%': { backgroundPosition: '0 200%' },
                },
                wiggle: {
                    '0%': { transform: 'rotate(-3deg)' },
                    '50%': { transform: 'rotate(3deg)' },
                    '100%': { transform: 'rotate(-3deg)' },
                }
            },
            animation: {
                'ripple-left': 'ripple-left 0.6s linear infinite',
                'ripple-right': 'ripple-right 0.6s linear infinite',
                'ripple-up': 'ripple-up 0.8s linear infinite',
                'ripple-down': 'ripple-down 0.8s linear infinite',
                'wiggle': 'wiggle 1s ease-in-out infinite',
            },
            boxShadow: {
                'glow-cyan': '0 0 20px theme("colors.cyan.400"), 0 0 40px theme("colors.cyan.500")',
                'glow-purple': '0 0 20px theme("colors.fuchsia.400"), 0 0 40px theme("colors.fuchsia.500")',
                'glow-gold': '0 0 20px theme("colors.yellow.300"), 0 0 40px theme("colors.yellow.400")',
            },
            dropShadow: {
                'glow-cyan': '0 0 10px theme("colors.cyan.500")',
                'glow-purple': '0 0 10px theme("colors.fuchsia.500")',
                'glow-gold': '0 0 10px theme("colors.yellow.400")',
            }
        },
    },
    plugins: [],
}
