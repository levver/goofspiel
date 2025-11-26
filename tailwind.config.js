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
                wiggle: {
                    '0%': { clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' },
                    '20%': { clipPath: 'polygon(0 0, 100% 0, 85% 95%, 0 100%)' },
                    '40%': { clipPath: 'polygon(0 0, 100% 0, 100% 100%, 15% 95%)' },
                    '60%': { clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0 95%)' },
                    '80%': { clipPath: 'polygon(0 0, 100% 0, 100% 95%, 15% 100%)' },
                    '100%': { clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' },
                }
            },
            animation: {
                'wiggle': 'wiggle 1s ease-in-out infinite',
            }
        },
    },
    plugins: [],
}
