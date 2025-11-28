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
                },
                'flip-in': {
                    '0%': { transform: 'rotateY(90deg)', opacity: '0' },
                    '100%': { transform: 'rotateY(0)', opacity: '1' },
                },
                'shake': {
                    '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
                    '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
                    '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
                    '40%, 60%': { transform: 'translate3d(4px, 0, 0)' }
                },
                'pop-in': {
                    '0%': { opacity: '0', transform: 'scale(0.5)' },
                    '100%': { opacity: '1', transform: 'scale(1)' }
                },
                'flash': {
                    '0%': { opacity: '1' },
                    '50%': { opacity: '0.5' },
                    '100%': { opacity: '1' }
                },
                'shatter': {
                    '0%': { opacity: '1', transform: 'scale(1)' },
                    '100%': { opacity: '0', transform: 'scale(0.5) rotate(10deg)' }
                }
            },
            animation: {
                'ripple-left': 'ripple-left 0.6s linear infinite',
                'ripple-right': 'ripple-right 0.6s linear infinite',
                'ripple-up': 'ripple-up 0.8s linear infinite',
                'ripple-down': 'ripple-down 0.8s linear infinite',
                'wiggle': 'wiggle 1s ease-in-out infinite',
                'flip-in': 'flip-in 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                'shake': 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
                'pop-in': 'pop-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                'flash': 'flash 0.5s ease-out',
                'shatter': 'shatter 1.5s ease-out forwards',
            },
            boxShadow: {
                'glow-cyan': '0 0 20px theme("colors.cyan.400"), 0 0 40px theme("colors.cyan.500")',
                'glow-cyan-soft': '0 0 10px theme("colors.cyan.400/50"), 0 0 20px theme("colors.cyan.500/30")',
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
